class Scheme {
  constructor(title) {
    this.title = title;
    this.people = [];
    this.groups = [];
    this.connections = [];
    this.currentDragged = null;
    this.currentHover = null;
    this.currentConnectionIds = [];
    this.highlightedGroup = null;
    this.currentGroups = [];
    this.useGroupPreferences = true;
    this.rankThreshold = 2;
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = 50;
    // Optimization flag: run local optimizer after maximize
    this.optimizeAfterAssign = false;
    // If true, do not autoassign people INTO groups that already contain pinned people
    this.avoidGroupsWithPinned = false;
  }

  setRankThreshold(threshold) {
    this.rankThreshold = threshold;
  }

  setPeople(people) {
    this.people = people;
    this.ensureDataQuality();
  }

  setGroups(groups) {
    this.groups = groups;
    this.ensureDataQuality();
  }

  setConnections(connections) {
    this.connections = connections;
    this.ensureDataQuality();
  }

  setGroupPreferences(preferences) {
    preferences.forEach((pref) => {
      const [personId, ...groupPrefs] = pref
        .split(',')
        .map((item) => item.trim());
      if (this.people.length > 0) {
        const person = this.people.find((p) => p.id === personId);
        if (person) {
          person.setGroupPreferences(groupPrefs);
        } else {
          console.warn(
            `Person not found for group preference: ${personId}`
          );
        }
      } else {
        console.warn(
          `Can't set group preferences because there are no people yet!`
        );
      }
    });
  }

  // New pinned assignment methods
  pinPersonToGroup(personId, groupTitle) {
    const person = this.people.find((p) => p.id === personId);
    const group = this.groups.find((g) => g.title === groupTitle);

    if (!person) {
      console.error(`Person not found: ${personId}`);
      return false;
    }

    if (!group) {
      console.error(`Group not found: ${groupTitle}`);
      return false;
    }

    person.pinToGroup(groupTitle);
    return true;
  }

  // New method to immediately move a pinned person to their group
  movePinnedPersonToGroup(personId) {
    const person = this.people.find((p) => p.id === personId);
    if (!person || !person.pinned) return false;

    // Remove person from any current group
    for (let group of this.groups) {
      group.removeMember(person);
    }

    // Find the pinned group
    const targetGroup = this.groups.find(
      (g) => g.title === person.pinnedGroupTitle
    );

    if (targetGroup) {
      if (targetGroup.hasAvailableSlot()) {
        // Calculate position for the person in the group
        const slotIndex = targetGroup.getNearestEmptySlot(
          targetGroup.x + 10,
          targetGroup.y + 40
        );
        if (slotIndex !== -1) {
          targetGroup.members[slotIndex] = person;
          person.x = targetGroup.x + 10;
          person.y = targetGroup.y + slotIndex * 40 + 40;
          person.updateHappiness(targetGroup);
          console.log(
            `Successfully moved ${person.displayName} to ${targetGroup.title} at slot ${slotIndex}`
          );
          return true;
        }
      } else {
        console.warn(
          `Pinned group ${targetGroup.title} is full! Cannot place ${person.displayName}`
        );
      }
    }
    return false;
  }

  unpinPerson(personId) {
    const person = this.people.find((p) => p.id === personId);
    if (person) {
      person.unpin();
      return true;
    }
    console.error(`Person not found: ${personId}`);
    return false;
  }

  getPinnedPeople() {
    return this.people.filter((p) => p.pinned);
  }

  getUnpinnedPeople() {
    return this.people.filter((p) => !p.pinned);
  }

  // Enhanced autoassignment with pinned support
  autoassign(algorithm) {
    // First, handle pinned assignments
    this.assignPinnedPeople();

    // Then handle regular unassigned people (excluding pinned ones)
    const unassignedPeople = this.people.filter(
      (person) =>
        !person.pinned && // Exclude pinned people
        !this.groups.some((group) => group.members.includes(person))
    );

    switch (algorithm) {
      case 'random':
        this.randomAssignment(unassignedPeople);
        break;
      case 'sequential':
        this.sequentialAssignment(unassignedPeople);
        break;
      case 'balanced':
        this.balancedAssignment(unassignedPeople);
        break;
      case 'maximize':
        this.maximizeHappinessAssignment(unassignedPeople);
        if (this.optimizeAfterAssign) {
          // quick local polish
          this.localOptimize(1000, 5000);
        }
        break;
      case 'minimize-unhappy':
        this.minimizeUnhappyAssignment(unassignedPeople);
        if (this.optimizeAfterAssign) {
          this.localOptimize(1000, 5000);
        }
        break;
      default:
        console.error('Unknown algorithm:', algorithm);
    }

    this.updateAllHappiness();
    this.ensureDataQuality();
  }

  assignPinnedPeople() {
    const pinnedPeople = this.getPinnedPeople();

    console.log(
      `Assigning ${pinnedPeople.length} pinned people first`
    );

    for (let person of pinnedPeople) {
      // Remove person from any current group first
      for (let group of this.groups) {
        group.removeMember(person);
      }

      // Find the pinned group
      const targetGroup = this.groups.find(
        (g) => g.title === person.pinnedGroupTitle
      );

      if (targetGroup) {
        if (targetGroup.hasAvailableSlot()) {
          // Calculate position for the person in the group
          const slotIndex = targetGroup.getNearestEmptySlot(
            targetGroup.x + 10,
            targetGroup.y + 40
          );
          if (slotIndex !== -1) {
            targetGroup.members[slotIndex] = person;
            person.x = targetGroup.x + 10;
            person.y = targetGroup.y + slotIndex * 40 + 40;
            person.updateHappiness(targetGroup);
            console.log(
              `Successfully pinned ${person.displayName} to ${targetGroup.title} at slot ${slotIndex}`
            );
          } else {
            console.error(
              `Could not find valid slot in ${targetGroup.title} for ${person.displayName}`
            );
          }
        } else {
          console.warn(
            `Pinned group ${targetGroup.title} is full! Cannot place ${person.displayName}`
          );
          // Optionally, you could force the assignment by expanding the group or removing someone
        }
      } else {
        console.error(
          `Pinned group ${person.pinnedGroupTitle} not found for ${person.displayName}`
        );
      }
    }

    // Recalculate happiness for all groups after pinned assignments
    this.groups.forEach((group) => group.recalculateHappiness());
  }

  randomAssignment(unassignedPeople) {
    for (let person of unassignedPeople) {
      let availableGroups = this.groups.filter((group) =>
        group.hasAvailableSlot()
      );
      if (availableGroups.length > 0) {
        let randomGroup = random(availableGroups);
        randomGroup.addMember(
          person,
          randomGroup.x + 10,
          randomGroup.y + 40
        );
      }
    }
  }

  sequentialAssignment(unassignedPeople) {
    // Sort people alphabetically
    unassignedPeople.sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`;
      const nameB = `${b.lastName} ${b.firstName}`;
      return nameA.localeCompare(nameB);
    });

    // Fill groups one by one
    let groupIndex = 0;
    for (let person of unassignedPeople) {
      while (groupIndex < this.groups.length) {
        const group = this.groups[groupIndex];
        if (group.hasAvailableSlot()) {
          group.addMember(person, group.x + 10, group.y + 40);
          break;
        } else {
          groupIndex++;
        }
      }
    }
  }

  balancedAssignment(unassignedPeople) {
    // Sort people by number of connections, descending
    unassignedPeople.sort(
      (a, b) => b.connections.length - a.connections.length
    );
    // Randomize order of people with the same number of connections
    this.randomizeEqualConnections(unassignedPeople);

    for (let person of unassignedPeople) {
      let bestGroup = null;
      let bestScore = -1;

      // Create a randomized copy of the groups array
      let randomizedGroups = this.shuffleArray([...this.groups]);

      for (let group of randomizedGroups) {
        if (this.canAddToGroup(group)) {
          let score;
          if (this.useGroupPreferences) {
            score = this.calculateGroupPreferenceScore(person, group);
          } else {
            score = this.calculateGroupScore(person, group);
          }
          if (score > bestScore) {
            bestScore = score;
            bestGroup = group;
          }
        }
      }

      if (bestGroup) {
        bestGroup.addMember(
          person,
          bestGroup.x + 10,
          bestGroup.y + 40
        );
      }
    }
  }

  // Minimize number of unhappy people while keeping groups balanced
  minimizeUnhappyAssignment(unassignedPeople) {
    // Ensure every group is used and sizes are balanced as much as possible,
    // while prioritizing placements that make people happy.
    const peopleToPlace = unassignedPeople.slice();

    const numGroups = this.groups.length;
    const totalPeople = this.people.length;

    // Current sizes
    const currentSizes = this.groups.map(
      (g) => g.members.filter((m) => m !== null).length
    );

    // Compute initial targets using floor/ceil distribution, then respect maxSize
    const base = Math.floor(totalPeople / numGroups);
    let remainder = totalPeople % numGroups;
    let targets = this.groups.map((g, idx) => {
      let t = base + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      // don't set target below current size
      t = Math.max(t, currentSizes[idx]);
      // cap at maxSize
      t = Math.min(t, g.maxSize);
      return t;
    });

    // If sum targets < totalPeople (because of caps), distribute remaining capacity
    const totalSlots = this.groups.reduce((s, g) => s + g.maxSize, 0);
    const maxPossible = Math.min(totalPeople, totalSlots);
    let sumTargets = targets.reduce((s, v) => s + v, 0);
    // Give extra capacity where possible until we reach maxPossible
    while (sumTargets < maxPossible) {
      // find group with most room (maxSize - target)
      let bestIdx = -1;
      let bestRoom = 0;
      for (let i = 0; i < this.groups.length; i++) {
        const room = this.groups[i].maxSize - targets[i];
        if (room > bestRoom) {
          bestRoom = room;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;
      targets[bestIdx]++;
      sumTargets++;
    }

    // Helper: placement score favors making person happy, then groups further below target,
    // then preference/connection score.
    const placementScore = (person, groupIdx) => {
      const group = this.groups[groupIdx];
      if (!group.hasAvailableSlot()) return -Infinity;
      const prefScore = this.useGroupPreferences
        ? this.calculateGroupPreferenceScore(person, group)
        : this.calculateGroupScore(person, group);

      const currentSize = group.members.filter(
        (m) => m !== null
      ).length;
      const deficit = targets[groupIdx] - currentSize; // positive if below target

      const wouldBeHappy = prefScore > 0 ? 1 : 0;

      // Weight: happiness wins, then larger deficit (prefer groups needing people), then prefScore
      return (
        wouldBeHappy * 1000 + Math.max(0, deficit) * 10 + prefScore
      );
    };

    // Place more connected people first
    peopleToPlace.sort(
      (a, b) => b.connections.length - a.connections.length
    );

    for (let person of peopleToPlace) {
      // Prefer groups that are below their target
      let bestIdx = -1;
      let bestVal = -Infinity;
      // First pass: groups with currentSize < target
      for (let i = 0; i < this.groups.length; i++) {
        const group = this.groups[i];
        const currentSize = group.members.filter(
          (m) => m !== null
        ).length;
        if (currentSize >= targets[i]) continue; // skip groups already at/above target
        const val = placementScore(person, i);
        if (val > bestVal) {
          bestVal = val;
          bestIdx = i;
        }
      }

      // Second pass: if none below target, consider any group with space
      if (bestIdx === -1) {
        for (let i = 0; i < this.groups.length; i++) {
          const val = placementScore(person, i);
          if (val > bestVal) {
            bestVal = val;
            bestIdx = i;
          }
        }
      }

      if (bestIdx !== -1 && bestVal > -Infinity) {
        const chosen = this.groups[bestIdx];
        chosen.addMember(person, chosen.x + 10, chosen.y + 40);
      } else {
        // fallback: any available slot
        const any = this.groups.find((g) => g.hasAvailableSlot());
        if (any) any.addMember(person, any.x + 10, any.y + 40);
      }
    }
  }

  // Greedy maximize-happiness assignment
  maximizeHappinessAssignment(unassignedPeople) {
    // We'll attempt a greedy placement: for each person, place them in the group
    // that yields the largest marginal increase in total happiness. Re-evaluate
    // after each placement because group composition changes.

    // Copy of people list we will mutate
    const pool = unassignedPeople.slice();

    // Helper to compute total happiness across all people if person were placed in group
    const marginalScore = (person, group) => {
      if (!this.canAddToGroup(group)) return -Infinity;

      // compute person's happiness if placed in this group
      const personHappiness = this.useGroupPreferences
        ? this.calculateGroupPreferenceScore(person, group)
        : this.calculateGroupScore(person, group);

      // compute change for existing group members: adding this person may increase
      // other members' happiness because they may have connections to this person
      let deltaForOthers = 0;
      for (let member of group.members) {
        if (member !== null) {
          const before = member.happiness;
          // temporary: if member would consider this person a connection
          const wouldIncrease =
            person && member && person.id && member;
          // Recalculate member happiness including this person
          const connectionsCount = group.members.filter(
            (m) =>
              m !== null &&
              person &&
              person.id &&
              m &&
              person.connections.includes(m.id)
          ).length;
          const newHappiness = this.useGroupPreferences
            ? member.getPreferenceRank(group.title)
              ? member.groupPreferences.length -
                (member.getPreferenceRank(group.title) - 1)
              : 0
            : connectionsCount +
              (person &&
              member &&
              person.connections.includes(member.id)
                ? 1
                : 0);

          // Normalize newHappiness when using preferences to match calculateHappiness behavior
          let normalizedNew = newHappiness;
          if (this.useGroupPreferences) {
            // if member has no preferences, newHappiness should be computed by connections
            if (member.groupPreferences.length === 0) {
              normalizedNew = group.members.filter(
                (m) => m !== null && member.connections.includes(m.id)
              ).length;
            }
          }

          deltaForOthers += Math.max(-1, normalizedNew - before);
        }
      }

      return personHappiness + deltaForOthers;
    };

    // Greedy loop: pick the best (person, group) pair each iteration
    while (pool.length > 0) {
      let bestPair = null;
      let bestValue = -Infinity;

      for (let i = 0; i < pool.length; i++) {
        const person = pool[i];
        for (let group of this.groups) {
          const score = marginalScore(person, group);
          if (score > bestValue) {
            bestValue = score;
            bestPair = { personIndex: i, group };
          }
        }
      }

      if (bestPair && bestValue > -Infinity) {
        const person = pool.splice(bestPair.personIndex, 1)[0];
        bestPair.group.addMember(
          person,
          bestPair.group.x + 10,
          bestPair.group.y + 40
        );
        // Update happiness for group members after change
        bestPair.group.recalculateHappiness();
      } else {
        // No feasible placement found (e.g., all groups full) -> stop
        break;
      }
    }
  }

  // Compute total happiness across all assigned people
  computeTotalHappiness() {
    let total = 0;
    for (let group of this.groups) {
      for (let person of group.members) {
        if (person !== null) {
          // ensure up-to-date
          person.updateHappiness(group);
          if (typeof person.happiness === 'number')
            total += person.happiness;
        }
      }
    }
    return total;
  }

  // Local optimizer: try single-person moves and pairwise swaps that improve total happiness
  // maxPasses: number of full scans with no improvement before stopping
  // maxEvaluations: safety cap to avoid long runs
  localOptimize(maxPasses = 10, maxEvaluations = 2000) {
    let passesWithoutImprovement = 0;
    let evaluations = 0;
    let improved = false;

    const tryMove = (person, fromGroup, toGroup) => {
      if (!toGroup.hasAvailableSlot()) return false;

      // remove person temporarily
      const fromIndex = fromGroup.members.indexOf(person);
      fromGroup.members[fromIndex] = null;

      // place person in toGroup
      const slot = toGroup.getNearestEmptySlot(
        toGroup.x + 10,
        toGroup.y + 40
      );
      if (slot === -1) {
        // restore
        fromGroup.members[fromIndex] = person;
        return false;
      }
      toGroup.members[slot] = person;

      // recalc happiness for affected groups
      fromGroup.recalculateHappiness();
      toGroup.recalculateHappiness();

      const newTotal = this.computeTotalHappiness();

      // undo move
      toGroup.members[slot] = null;
      fromGroup.members[fromIndex] = person;
      fromGroup.recalculateHappiness();
      toGroup.recalculateHappiness();

      return newTotal;
    };

    const trySwap = (pA, gA, pB, gB) => {
      // swap pA and pB between groups (allow same group check outside)
      const idxA = gA.members.indexOf(pA);
      const idxB = gB.members.indexOf(pB);
      if (idxA === -1 || idxB === -1) return false;

      if (this.avoidGroupsWithPinned) {
        // If swapping would move a non-pinned person into a group that contains pinned members, disallow
        const gAHasPinned = gA.members.some(
          (m) => m !== null && m.pinned
        );
        const gBHasPinned = gB.members.some(
          (m) => m !== null && m.pinned
        );
        // Moving pA into gB: check if gBHasPinned and pA is not pinned
        if (gBHasPinned && !pA.pinned) return -Infinity;
        // Moving pB into gA: check if gAHasPinned and pB is not pinned
        if (gAHasPinned && !pB.pinned) return -Infinity;
      }

      // perform swap
      gA.members[idxA] = pB;
      gB.members[idxB] = pA;
      gA.recalculateHappiness();
      gB.recalculateHappiness();

      const newTotal = this.computeTotalHappiness();

      // undo swap
      gA.members[idxA] = pA;
      gB.members[idxB] = pB;
      gA.recalculateHappiness();
      gB.recalculateHappiness();

      return newTotal;
    };

    let bestTotal = this.computeTotalHappiness();

    while (
      passesWithoutImprovement < maxPasses &&
      evaluations < maxEvaluations
    ) {
      improved = false;

      // iterate over all people assigned
      for (let gIdx = 0; gIdx < this.groups.length; gIdx++) {
        const group = this.groups[gIdx];
        for (let pIdx = 0; pIdx < group.members.length; pIdx++) {
          const person = group.members[pIdx];
          if (person === null || person.pinned) continue; // skip pinned people

          // Try moving to any other group
          for (
            let tgtIdx = 0;
            tgtIdx < this.groups.length;
            tgtIdx++
          ) {
            if (tgtIdx === gIdx) continue;
            const targetGroup = this.groups[tgtIdx];
            if (!this.canAddToGroup(targetGroup)) continue;

            const newTotal = tryMove(person, group, targetGroup);
            evaluations++;
            if (newTotal > bestTotal) {
              // commit move for real
              group.members[pIdx] = null;
              const slot = targetGroup.getNearestEmptySlot(
                targetGroup.x + 10,
                targetGroup.y + 40
              );
              targetGroup.members[slot] = person;
              // Update positions so drawing doesn't show overlaps
              group.updateMemberPositions();
              targetGroup.updateMemberPositions();
              group.recalculateHappiness();
              targetGroup.recalculateHappiness();
              bestTotal = newTotal;
              improved = true;
              break; // break targetGroup loop
            }
            if (evaluations >= maxEvaluations) break;
          }
          if (improved || evaluations >= maxEvaluations) break;

          // Try swaps with members of other groups
          for (
            let tgtIdx = 0;
            tgtIdx < this.groups.length;
            tgtIdx++
          ) {
            if (tgtIdx === gIdx) continue;
            const otherGroup = this.groups[tgtIdx];
            for (let otherPerson of otherGroup.members) {
              if (otherPerson === null || otherPerson.pinned)
                continue;
              const newTotal = trySwap(
                person,
                group,
                otherPerson,
                otherGroup
              );
              evaluations++;
              if (newTotal > bestTotal) {
                // commit swap
                const idxA = group.members.indexOf(person);
                const idxB = otherGroup.members.indexOf(otherPerson);
                group.members[idxA] = otherPerson;
                otherGroup.members[idxB] = person;
                // Update positions after swap to avoid visual overlap
                group.updateMemberPositions();
                otherGroup.updateMemberPositions();
                group.recalculateHappiness();
                otherGroup.recalculateHappiness();
                bestTotal = newTotal;
                improved = true;
                break;
              }
              if (evaluations >= maxEvaluations) break;
            }
            if (improved || evaluations >= maxEvaluations) break;
          }
          if (improved || evaluations >= maxEvaluations) break;
        }
        if (improved || evaluations >= maxEvaluations) break;
      }

      if (improved) {
        passesWithoutImprovement = 0;
      } else {
        passesWithoutImprovement++;
      }
    }

    console.log(
      `localOptimize finished. evaluations=${evaluations}, totalHappiness=${bestTotal}`
    );
    return bestTotal;
  }

  // Two-phase rebalance: Phase 1 - look for simple swaps/moves that reduce unhappy count.
  // Phase 2 - rebalance group sizes without reducing total happiness beyond allowedLoss.
  twoPhaseRebalance(
    maxPasses = 5,
    maxEvaluations = 5000,
    allowedLoss = 0
  ) {
    // Phase 1: reduce unhappy count via simple moves/swaps
    let evaluations = 0;
    let passes = 0;
    let improved = false;

    const getUnhappy = () => this.getUnhappyCount();

    // helper to compute imbalance metric: maxSize - minSize
    const imbalanceMetric = () => {
      const sizes = this.groups.map(
        (g) => g.members.filter((m) => m !== null).length
      );
      return Math.max(...sizes) - Math.min(...sizes);
    };

    // Phase 1 loop
    let unhappy0 = getUnhappy();
    while (passes < maxPasses && evaluations < maxEvaluations) {
      improved = false;

      // try single-person moves first
      for (
        let gFromIdx = 0;
        gFromIdx < this.groups.length;
        gFromIdx++
      ) {
        const gFrom = this.groups[gFromIdx];
        for (let person of gFrom.members) {
          if (!person || person.pinned) continue;
          for (
            let gToIdx = 0;
            gToIdx < this.groups.length;
            gToIdx++
          ) {
            if (gToIdx === gFromIdx) continue;
            const gTo = this.groups[gToIdx];
            if (!this.canAddToGroup(gTo)) continue;

            // perform move simulate
            const fromIdx = gFrom.members.indexOf(person);
            const toSlot = gTo.getNearestEmptySlot(
              gTo.x + 10,
              gTo.y + 40
            );
            if (toSlot === -1) continue;

            // commit temporarily
            gFrom.members[fromIdx] = null;
            gTo.members[toSlot] = person;
            gFrom.recalculateHappiness();
            gTo.recalculateHappiness();
            evaluations++;

            const newUnhappy = getUnhappy();
            if (newUnhappy < unhappy0) {
              // keep change
              gFrom.updateMemberPositions();
              gTo.updateMemberPositions();
              unhappy0 = newUnhappy;
              improved = true;
              break;
            } else {
              // revert
              gTo.members[toSlot] = null;
              gFrom.members[fromIdx] = person;
              gFrom.recalculateHappiness();
              gTo.recalculateHappiness();
            }
            if (evaluations >= maxEvaluations) break;
          }
          if (improved || evaluations >= maxEvaluations) break;
        }
        if (improved || evaluations >= maxEvaluations) break;
      }

      if (!improved) {
        // try pairwise swaps
        for (let i = 0; i < this.groups.length; i++) {
          for (let pA of this.groups[i].members) {
            if (!pA || pA.pinned) continue;
            for (let j = i + 1; j < this.groups.length; j++) {
              for (let pB of this.groups[j].members) {
                if (!pB || pB.pinned) continue;

                // swap
                const idxA = this.groups[i].members.indexOf(pA);
                const idxB = this.groups[j].members.indexOf(pB);
                this.groups[i].members[idxA] = pB;
                this.groups[j].members[idxB] = pA;
                this.groups[i].recalculateHappiness();
                this.groups[j].recalculateHappiness();
                evaluations++;

                const newUnhappy = getUnhappy();
                if (newUnhappy < unhappy0) {
                  // keep
                  this.groups[i].updateMemberPositions();
                  this.groups[j].updateMemberPositions();
                  unhappy0 = newUnhappy;
                  improved = true;
                  break;
                } else {
                  // revert
                  this.groups[i].members[idxA] = pA;
                  this.groups[j].members[idxB] = pB;
                  this.groups[i].recalculateHappiness();
                  this.groups[j].recalculateHappiness();
                }
                if (evaluations >= maxEvaluations) break;
              }
              if (improved || evaluations >= maxEvaluations) break;
            }
            if (improved || evaluations >= maxEvaluations) break;
          }
          if (improved || evaluations >= maxEvaluations) break;
        }
      }

      if (!improved) break;
      passes++;
    }

    // Phase 2: rebalance without reducing total happiness beyond allowedLoss
    const baselineTotal = this.computeTotalHappiness();
    let currentImb = imbalanceMetric();
    evaluations = 0;
    passes = 0;
    improved = false;

    while (passes < maxPasses && evaluations < maxEvaluations) {
      improved = false;

      // try single-person moves that improve imbalance while preserving happiness
      for (
        let gFromIdx = 0;
        gFromIdx < this.groups.length;
        gFromIdx++
      ) {
        const gFrom = this.groups[gFromIdx];
        for (let person of gFrom.members) {
          if (!person || person.pinned) continue;
          for (
            let gToIdx = 0;
            gToIdx < this.groups.length;
            gToIdx++
          ) {
            if (gToIdx === gFromIdx) continue;
            const gTo = this.groups[gToIdx];
            if (!gTo.hasAvailableSlot()) continue;
            if (
              this.avoidGroupsWithPinned &&
              gTo.members.some((m) => m && m.pinned)
            )
              continue;

            const fromIdx = gFrom.members.indexOf(person);
            const toSlot = gTo.getNearestEmptySlot(
              gTo.x + 10,
              gTo.y + 40
            );
            if (toSlot === -1) continue;

            // simulate move
            gFrom.members[fromIdx] = null;
            gTo.members[toSlot] = person;
            gFrom.recalculateHappiness();
            gTo.recalculateHappiness();
            evaluations++;

            const newTotal = this.computeTotalHappiness();
            const newImb = imbalanceMetric();
            if (
              newTotal >= baselineTotal - allowedLoss &&
              newImb < currentImb
            ) {
              // commit
              gFrom.updateMemberPositions();
              gTo.updateMemberPositions();
              currentImb = newImb;
              improved = true;
              break;
            } else {
              // revert
              gTo.members[toSlot] = null;
              gFrom.members[fromIdx] = person;
              gFrom.recalculateHappiness();
              gTo.recalculateHappiness();
            }
            if (evaluations >= maxEvaluations) break;
          }
          if (improved || evaluations >= maxEvaluations) break;
        }
        if (improved || evaluations >= maxEvaluations) break;
      }

      if (!improved) {
        // try swaps
        for (let i = 0; i < this.groups.length; i++) {
          for (let pA of this.groups[i].members) {
            if (!pA || pA.pinned) continue;
            for (let j = 0; j < this.groups.length; j++) {
              if (i === j) continue;
              for (let pB of this.groups[j].members) {
                if (!pB || pB.pinned) continue;
                if (this.avoidGroupsWithPinned) {
                  // disallow if swap would move non-pinned into a pinned group
                  const gAHasPinned = this.groups[i].members.some(
                    (m) => m !== null && m.pinned
                  );
                  const gBHasPinned = this.groups[j].members.some(
                    (m) => m !== null && m.pinned
                  );
                  if (gAHasPinned && !pB.pinned) continue;
                  if (gBHasPinned && !pA.pinned) continue;
                }

                const idxA = this.groups[i].members.indexOf(pA);
                const idxB = this.groups[j].members.indexOf(pB);
                // simulate swap
                this.groups[i].members[idxA] = pB;
                this.groups[j].members[idxB] = pA;
                this.groups[i].recalculateHappiness();
                this.groups[j].recalculateHappiness();
                evaluations++;

                const newTotal = this.computeTotalHappiness();
                const newImb = imbalanceMetric();
                if (
                  newTotal >= baselineTotal - allowedLoss &&
                  newImb < currentImb
                ) {
                  // commit
                  this.groups[i].updateMemberPositions();
                  this.groups[j].updateMemberPositions();
                  currentImb = newImb;
                  improved = true;
                  break;
                } else {
                  // revert
                  this.groups[i].members[idxA] = pA;
                  this.groups[j].members[idxB] = pB;
                  this.groups[i].recalculateHappiness();
                  this.groups[j].recalculateHappiness();
                }
                if (evaluations >= maxEvaluations) break;
              }
              if (improved || evaluations >= maxEvaluations) break;
            }
            if (improved || evaluations >= maxEvaluations) break;
          }
          if (improved || evaluations >= maxEvaluations) break;
        }
      }

      if (!improved) break;
      passes++;
    }

    // Final recalculation and return metrics
    this.updateAllHappiness();
    const finalUnhappy = getUnhappy();
    const finalTotal = this.computeTotalHappiness();
    const finalImb = imbalanceMetric();
    console.log(
      `twoPhaseRebalance done: unhappy ${unhappy0} -> ${finalUnhappy}, total ${finalTotal}, imbalance ${finalImb}`
    );
    return { finalUnhappy, finalTotal, finalImb };
  }

  // Tidy groups: push all non-null members to the top of each group's slots
  tidyGroups() {
    for (let group of this.groups) {
      const members = group.members.filter((m) => m !== null);
      // fill remaining with nulls up to maxSize
      while (members.length < group.maxSize) members.push(null);
      group.members = members;
      group.updateMemberPositions();
      group.recalculateHappiness();
    }
    this.updateAllHappiness();
    console.log('tidyGroups: completed');
    return true;
  }

  calculateGroupPreferenceScore(person, group) {
    const preferenceIndex = person.groupPreferences.indexOf(
      group.title
    );
    return preferenceIndex === -1
      ? 0
      : person.groupPreferences.length - preferenceIndex;
  }

  calculateGroupScore(person, group) {
    return group.members.filter(
      (member) => member && person.connections.includes(member.id)
    ).length;
  }

  randomizeEqualConnections(people) {
    let start = 0;
    for (let i = 1; i <= people.length; i++) {
      if (
        i === people.length ||
        people[i].connections.length !==
          people[start].connections.length
      ) {
        this.shuffleArray(people, start, i);
        start = i;
      }
    }
  }

  shuffleArray(array, start = 0, end = array.length) {
    for (let i = end - 1; i > start; i--) {
      const j = Math.floor(Math.random() * (i - start + 1)) + start;
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  canAddToGroup(group) {
    const currentSize = group.members.filter(
      (m) => m !== null
    ).length;
    const minGroupSize = Math.min(
      ...this.groups.map(
        (g) => g.members.filter((m) => m !== null).length
      )
    );
    if (this.avoidGroupsWithPinned) {
      const hasPinned = group.members.some(
        (m) => m !== null && m.pinned
      );
      if (hasPinned) return false;
    }
    return (
      currentSize < group.maxSize &&
      (!this.useGroupPreferences
        ? currentSize < minGroupSize + 5
        : true)
    );
  }

  assignConnections() {
    this.connections.forEach((c) => {
      let primaryId = c.slice(0, 1);
      let primaryPerson = this.getPersonById(primaryId)[0];
      if (!primaryPerson) {
        console.log(`no person found for ${primaryId}`);
      } else {
        let others = c.slice(1);
        console.log(
          `assigning ${others.length} connections to ${primaryPerson}`
        );
        primaryPerson.setConnectionIds(others);
      }
    });
  }

  getPersonById(id) {
    return this.people.filter((p) => p.id == id);
  }

  handlePress(px, py) {
    for (let person of this.people) {
      if (person.isMouseOver(px, py)) {
        this.currentDragged = person;
        person.startDragging(px, py);
        // console.log(`Dragging ${person.toString()}`);
        break;
      }
    }
  }

  handleHover(x, y) {
    for (let person of this.people) {
      if (person.isMouseOver(x, y) && this.currentDragged == null) {
        this.currentHover = person;
        this.currentConnectionIds = person.getConnectionIds();
        this.currentGroups = person.getGroupPreferences();
        // console.log(`Hovering over ${person.toString()}`);
        break;
      }
    }
  }

  clearHover() {
    this.currentHover = null;
    this.currentConnectionIds = [];
    this.currentGroups = [];
  }

  handleRelease(px, py) {
    if (this.currentDragged) {
      console.log(`dragging: ${this.currentDragged}`);
      let draggedPerson = this.currentDragged;

      // Check if this is a pinned person being dragged
      if (draggedPerson.pinned) {
        const shouldUnpin = confirm(
          `${draggedPerson.displayName} is pinned to ${draggedPerson.pinnedGroupTitle}. Do you want to unpin them?`
        );
        if (shouldUnpin) {
          draggedPerson.unpin();
          console.log(
            `Unpinned ${draggedPerson.displayName} due to manual drag`
          );
        } else {
          // Put them back in their pinned group
          const pinnedGroup = this.groups.find(
            (g) => g.title === draggedPerson.pinnedGroupTitle
          );
          if (pinnedGroup && pinnedGroup.hasAvailableSlot()) {
            const slotIndex = pinnedGroup.getNearestEmptySlot(
              pinnedGroup.x + 10,
              pinnedGroup.y + 40
            );
            if (slotIndex !== -1) {
              pinnedGroup.members[slotIndex] = draggedPerson;
              draggedPerson.x = pinnedGroup.x + 10;
              draggedPerson.y = pinnedGroup.y + slotIndex * 40 + 40;
            }
          }
          draggedPerson.stopDragging();
          this.currentDragged = null;
          this.ensureDataQuality();
          return;
        }
      }

      // Remove dragged person from all groups
      for (let group of this.groups) {
        group.removeMember(draggedPerson);
      }

      // Check if dragged person is dropped inside any group
      let droppedInGroup = false;
      for (let group of this.groups) {
        if (
          group.contains(
            draggedPerson.x + draggedPerson.w / 2,
            draggedPerson.y + draggedPerson.h / 2
          )
        ) {
          group.addMember(draggedPerson, px, py);
          droppedInGroup = true;
          break;
        }
      }

      // Stop dragging the person
      draggedPerson.stopDragging();
      this.currentDragged = null;
    }

    this.ensureDataQuality();
  }

  handleMove(px, py) {
    if (this.currentDragged) {
      this.currentDragged.updatePosition(px, py);
    }
  }

  getUnassignedCount() {
    return this.people.filter(
      (person) =>
        !this.groups.some((group) => group.members.includes(person))
    ).length;
  }

  getUnhappyCount() {
    return this.people.filter((person) => person.happiness === -1)
      .length;
  }

  getPeopleWithConnectionsCount() {
    return this.people.filter(
      (person) => person.connections.length > 1
    ).length;
  }

  updateAllHappiness() {
    for (let group of this.groups) {
      for (let person of group.members) {
        if (person !== null) {
          person.updateHappiness(group);
        }
      }
    }
  }

  validateDataQuality() {
    let errors = [];
    let warnings = [];

    // Check for unique person IDs
    let personIds = new Set();
    for (let person of this.people) {
      if (personIds.has(person.id)) {
        errors.push(`Duplicate person ID: ${person.id}`);
      }
      personIds.add(person.id);
    }

    // Check for unique group titles
    let groupTitles = new Set();
    for (let group of this.groups) {
      if (groupTitles.has(group.title)) {
        errors.push(`Duplicate group title: ${group.title}`);
      }
      groupTitles.add(group.title);
    }

    // Check required fields and data types
    for (let person of this.people) {
      if (!person.id || !person.firstName || !person.lastName) {
        errors.push(
          `Missing required field for person: ${person.id}`
        );
      }
      if (typeof person.id !== 'string') {
        errors.push(`Invalid ID type for person: ${person.id}`);
      }
    }

    for (let group of this.groups) {
      if (!group.title || !group.maxSize) {
        errors.push(
          `Missing required field for group: ${group.title}`
        );
      }
      if (!Number.isInteger(group.maxSize) || group.maxSize <= 0) {
        errors.push(
          `Invalid maxSize for group: ${group.title}, ${group.maxSize}`
        );
      }
    }

    // Check connections and remove invalid ones
    for (let person of this.people) {
      let validConnections = [];
      for (let connId of person.connections) {
        if (!personIds.has(connId)) {
          warnings.push(
            `Removed invalid connection ID ${connId} for person ${person.id}`
          );
        } else if (connId === person.id) {
          warnings.push(
            `Removed self-connection for person ${person.id}`
          );
        } else {
          validConnections.push(connId);
        }
      }
      if (validConnections.length !== person.connections.length) {
        person.connections = validConnections;
        // Update happiness for this person if they're in a group
        const assignedGroup = this.groups.find((group) =>
          group.members.includes(person)
        );
        if (assignedGroup) {
          person.updateHappiness(assignedGroup);
        }
      }
    }

    // Check group assignments
    for (let group of this.groups) {
      if (
        group.members.filter((m) => m !== null).length > group.maxSize
      ) {
        errors.push(`Group ${group.title} exceeds maxSize`);
      }
      for (let member of group.members) {
        if (member !== null && !this.people.includes(member)) {
          errors.push(
            `Invalid member in group ${group.title}: ${member.id}`
          );
        }
      }
    }

    // Check happiness consistency
    for (let person of this.people) {
      let assignedGroup = this.groups.find((group) =>
        group.members.includes(person)
      );
      let expectedHappiness =
        person.calculateHappiness(assignedGroup);
      if (person.happiness !== expectedHappiness) {
        warnings.push(
          `Happiness conflict for person ${person.id}: found ${person.happiness}, expected ${expectedHappiness}.`
        );
      }
    }

    // Check for people occupying the same spot in a group
    for (let group of this.groups) {
      let occupiedPositions = new Set();
      for (let i = 0; i < group.members.length; i++) {
        let member = group.members[i];
        if (member !== null) {
          let position = `${member.x},${member.y}`;
          if (occupiedPositions.has(position)) {
            errors.push(
              `Multiple people occupy the same position in group ${group.title} at (${position})`
            );
          }
          occupiedPositions.add(position);
        }
      }
    }

    // Validate pinned assignments
    for (let person of this.people) {
      if (person.pinned) {
        const pinnedGroup = this.groups.find(
          (g) => g.title === person.pinnedGroupTitle
        );
        if (!pinnedGroup) {
          errors.push(
            `Person ${person.id} is pinned to non-existent group: ${person.pinnedGroupTitle}`
          );
        }
      }
    }

    return { errors, warnings };
  }

  ensureDataQuality() {
    const { errors, warnings } = this.validateDataQuality();

    if (warnings.length > 0) {
      console.warn('Data quality warnings. call Andy.');
      warnings.forEach((warning) => console.warn(warning));
    }

    if (errors.length > 0) {
      alert('Data quality issues detected. call Andy.');
      errors.forEach((error) => console.error(error));
      throw new Error('Data quality check failed');
    }
  }

  highlightGroupAndPeople(mouseX, mouseY) {
    // Clear previous highlight
    this.clearHighlights();

    // Find group under mouse
    for (let group of this.groups) {
      if (group.contains(mouseX, mouseY)) {
        group.highlighted = true;
        this.highlightedGroup = group;
        break;
      }
    }

    // Update person highlighting based on preferences
    if (this.highlightedGroup) {
      for (let person of this.people) {
        const rank = person.getPreferenceRank(
          this.highlightedGroup.title
        );
        // person.highlighted =
        //   rank !== null && rank <= this.rankThreshold;
      }
    }
  }

  clearHighlights() {
    if (this.highlightedGroup) {
      this.highlightedGroup.highlighted = false;
      this.highlightedGroup = null;
    }
    for (let person of this.people) {
      person.highlighted = false;
    }
  }

  show() {
    this.showGroups();
    this.showPeople();
    this.showStatistics();
  }

  showGroups() {
    for (let group of this.groups) {
      if (group.highlighted) {
        fill(0, 0, 255, 100); // Blue highlight for space key
      } else if (this.currentGroups.includes(group.title)) {
        fill(255, 255, 0, 100); // Yellow highlight for currentGroups
      } else {
        fill(255); // White for no highlight
      }

      stroke(0);
      strokeWeight(1);
      rect(group.x, group.y, group.w, group.h);

      fill(0);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(16);
      text(group.title, group.x + group.w / 2, group.y + 15);

      // draw slots
      let rows = group.maxSize;
      for (let row = 0; row < rows; row++) {
        let x = group.x + 10;
        let y = group.y + row * 40 + 40;
        fill(230);
        strokeWeight(1);
        stroke(100);
        rect(x, y, 60, 20);
      }
    }
  }

  showPeople() {
    // Draw all people except the currently clicked one
    for (let person of this.people) {
      person.updatePosition();
      if (person !== this.currentDragged) {
        this.showPerson(person);
      }
    }

    // Draw the currently clicked person last to ensure they appear on top
    if (this.currentDragged) {
      this.showPerson(this.currentDragged);
    }
  }

  showPerson(person) {
    let isHighlighted = false;
    let rank = null;

    // Check if there's a highlighted group and if the person ranks it as 1 or 2
    if (this.highlightedGroup) {
      rank = person.getPreferenceRank(this.highlightedGroup.title);
      isHighlighted = rank !== null && rank <= this.rankThreshold;
    }

    if (isHighlighted) {
      fill(40, 40, 255, 100);
    } else if (
      this.currentHover == person ||
      this.currentDragged == person
    ) {
      this.showGroupPreferences(person);
      fill(210, 210, 40, 100);
    } else if (this.currentConnectionIds.includes(person.id)) {
      fill(255, 255, 40, 100);
    } else {
      fill(255, 100);
    }

    // Determine the outline color and weight based on the person's connections and happiness
    let assignedToGroup = this.groups.some((group) =>
      group.members.includes(person)
    );

    // Special styling for pinned people
    if (person.pinned) {
      stroke(255, 0, 255); // Magenta outline for pinned people
      strokeWeight(1);
    } else if (!assignedToGroup) {
      stroke(200); // Light gray outline if not assigned to any group
      strokeWeight(1);
    } else if (person.happiness === 0) {
      stroke(0); // Black outline if no connections
      strokeWeight(1);
    } else if (person.happiness === -1) {
      stroke(200, 0, 0); // Red outline if assigned to a group but happiness is 0
      strokeWeight(1);
    } else {
      stroke(0, 200, 0); // Green outline if assigned to a group and happiness is greater than 0
      strokeWeight(person.happiness);
    }

    rect(person.x, person.y, person.w, person.h);

    fill(0);
    noStroke();
    textSize(12);
    textAlign(CENTER, CENTER);
    text(
      person.displayName,
      person.x + person.w / 2,
      person.y + person.h / 2
    );

    // Display pin icon for pinned people - show first letter of group
    if (person.pinned && person.pinnedGroupTitle) {
      const pinSize = 8;
      const pinX = person.x + person.w - pinSize - 2;
      const pinY = person.y + 2;

      fill(255, 0, 255); // Magenta pin
      noStroke();
      ellipse(
        pinX + pinSize / 2,
        pinY + pinSize / 2,
        pinSize,
        pinSize
      );

      fill(255);
      textAlign(CENTER, CENTER);
      textSize(6);
      // Show first letter of the pinned group title
      const firstLetter = person.pinnedGroupTitle
        .charAt(0)
        .toUpperCase();
      text(firstLetter, pinX + pinSize / 2, pinY + pinSize / 2);
    }

    // Display preference rank if person is highlighted
    if (isHighlighted && rank !== null) {
      const squareSize = 20;
      const squareX = person.x + person.w + 2;
      const squareY = person.y - squareSize / 2 + person.h / 2;

      // Draw square behind the number
      fill(255); // White background
      stroke(0);
      strokeWeight(1);
      rect(squareX, squareY, squareSize, squareSize);

      // Draw rank number
      fill(0);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(16);
      text(rank, squareX + squareSize / 2, squareY + squareSize / 2);
    }
  }

  showGroupPreferences(person) {
    for (let group of this.groups) {
      let preferenceNumber = this.getPreferenceNumber(person, group);
      if (preferenceNumber > 0) {
        let x = group.x + group.w / 2;
        let y = group.y - 15;

        // Draw a small square behind the number
        fill(255);
        stroke(0);
        let squareSize = 20;
        rect(x - squareSize / 2, y, squareSize, squareSize);

        // Draw the preference number
        fill(0);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(14);
        text(preferenceNumber, x, y + squareSize / 2);
      }
    }
  }

  getPreferenceNumber(person, group) {
    return person.groupPreferences.indexOf(group.title) + 1;
  }

  showStatistics() {
    let unassignedCount = this.getUnassignedCount();
    let totalCount = this.people.length;
    let pinnedCount = this.getPinnedPeople().length;

    let unhappyCount = this.getUnhappyCount();
    let peopleWithConnectionsCount =
      this.getPeopleWithConnectionsCount();

    fill(0);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(24);
    text(`Unassigned: ${unassignedCount}`, 10, height - 90);
    text(`Pinned: ${pinnedCount}`, 10, height - 60);
    text(`Unhappy: ${unhappyCount}`, 10, height - 30);
  }

  saveState() {
    // Remove any states after current index
    this.history = this.history.slice(0, this.historyIndex + 1);

    // Add new state
    this.history.push(this.serialize());

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreState(this.history[this.historyIndex]);
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreState(this.history[this.historyIndex]);
    }
  }

  restoreState(jsonString) {
    const restored = Scheme.deserialize(jsonString);
    this.people = restored.people;
    this.groups = restored.groups;
    this.connections = restored.connections;
    this.useGroupPreferences = restored.useGroupPreferences;
  }

  serialize() {
    return JSON.stringify({
      version: '2.6.2-pinned',
      title: this.title,
      people: this.people.map((person) => ({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        connections: person.connections,
        groupPreferences: person.groupPreferences,
        happiness: person.happiness,
        x: person.x,
        y: person.y,
        pinned: person.pinned,
        pinnedGroupTitle: person.pinnedGroupTitle,
      })),
      groups: this.groups.map((group) => ({
        title: group.title,
        maxSize: group.maxSize,
        x: group.x,
        y: group.y,
        members: group.members.map((member) =>
          member ? member.id : null
        ),
      })),
      useGroupPreferences: this.useGroupPreferences,
    });
  }

  static deserialize(data) {
    const obj = JSON.parse(data);
    const scheme = new Scheme(obj.title);

    scheme.useGroupPreferences = obj.useGroupPreferences || false;

    // First, create people without connections or happiness
    const deserializedPeople = obj.people.map((personData) => {
      const person = new Person(
        personData.id,
        personData.lastName,
        personData.firstName
      );
      person.x = personData.x;
      person.y = personData.y;
      // Don't set happiness yet - it will be calculated later
      person.happiness = 0;
      // Store connections and preferences for later
      person.connections = personData.connections || [];
      person.groupPreferences = personData.groupPreferences || [];

      // Store pinned data for later
      person.pinned = personData.pinned || false;
      person.pinnedGroupTitle = personData.pinnedGroupTitle || null;

      return person;
    });

    // Set people without validation first
    scheme.people = deserializedPeople;

    // Create groups and populate members
    const deserializedGroups = obj.groups.map((groupData) => {
      const group = new Group(
        groupData.title,
        groupData.maxSize,
        groupData.x,
        groupData.y
      );

      // Map member IDs to actual person objects
      group.members = groupData.members.map((memberId) => {
        if (memberId !== null) {
          const member = scheme.people.find((p) => p.id === memberId);
          return member || null;
        } else {
          return null;
        }
      });

      return group;
    });

    // Set groups
    scheme.groups = deserializedGroups;

    // Now validate pinned assignments - groups exist now
    scheme.people.forEach((person) => {
      if (person.pinned && person.pinnedGroupTitle) {
        const pinnedGroup = scheme.groups.find(
          (g) => g.title === person.pinnedGroupTitle
        );
        if (!pinnedGroup) {
          console.warn(
            `Person ${person.id} was pinned to non-existent group ${person.pinnedGroupTitle}. Unpinning.`
          );
          person.pinned = false;
          person.pinnedGroupTitle = null;
        }
      }
    });

    // Finally, recalculate all happiness values based on actual group assignments
    scheme.groups.forEach((group) => {
      group.members.forEach((member) => {
        if (member !== null) {
          member.updateHappiness(group);
        }
      });
    });

    // Skip strict validation during load - happiness will be recalculated
    console.log(
      'Scheme loaded successfully. Groups:',
      scheme.groups.length,
      'People:',
      scheme.people.length
    );

    return scheme;
  }

  cleanupInvalidPinnedAssignments() {
    let cleanedCount = 0;

    this.people.forEach((person) => {
      if (person.pinned && person.pinnedGroupTitle) {
        const pinnedGroup = this.groups.find(
          (g) => g.title === person.pinnedGroupTitle
        );

        if (!pinnedGroup) {
          console.warn(
            `Cleaning up invalid pin: ${person.displayName} was pinned to non-existent group "${person.pinnedGroupTitle}"`
          );
          person.pinned = false;
          person.pinnedGroupTitle = null;
          cleanedCount++;
        } else {
          // Check if the person is actually in their pinned group
          const isInGroup = pinnedGroup.members.includes(person);

          if (!isInGroup) {
            console.warn(
              `Person ${person.displayName} is marked as pinned to ${person.pinnedGroupTitle} but is not in that group`
            );

            // Try to place them in their pinned group if there's space
            if (pinnedGroup.hasAvailableSlot()) {
              // Remove from any current group first
              this.groups.forEach((group) => {
                if (group !== pinnedGroup) {
                  group.removeMember(person);
                }
              });

              // Add to pinned group
              const slotIndex = pinnedGroup.getNearestEmptySlot(
                pinnedGroup.x + 10,
                pinnedGroup.y + 40
              );

              if (slotIndex !== -1) {
                pinnedGroup.members[slotIndex] = person;
                person.x = pinnedGroup.x + 10;
                person.y = pinnedGroup.y + slotIndex * 40 + 40;
                person.updateHappiness(pinnedGroup);
                console.log(
                  `Restored ${person.displayName} to their pinned group ${pinnedGroup.title}`
                );
              }
            } else {
              console.warn(
                `Cannot restore ${person.displayName} to pinned group ${pinnedGroup.title} - group is full`
              );
              person.pinned = false;
              person.pinnedGroupTitle = null;
              cleanedCount++;
            }
          }
        }
      }
    });

    if (cleanedCount > 0) {
      console.log(
        `Cleaned up ${cleanedCount} invalid pinned assignments`
      );
    }

    // Recalculate all happiness after cleanup
    this.updateAllHappiness();

    return cleanedCount;
  }
}
