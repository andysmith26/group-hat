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
