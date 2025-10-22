class Group {
  constructor(title, maxSize, x, y) {
    this.title = title;
    this.maxSize = parseInt(maxSize);
    this.members = this.initializeNullMembers(maxSize);
    console.log(
      `Initialized members array for ${this.title}:`,
      this.members
    );
    this.x = x;
    this.y = y;
    this.w = 80;
    this.h = 40 + maxSize * 40;
    this.highlighted = false;
  }

  initializeNullMembers(maxSize) {
    let members = [];
    for (let i = 0; i < maxSize; i++) {
      members.push(null);
    }
    return members;
  }

  contains(px, py) {
    return (
      px > this.x &&
      px < this.x + this.w &&
      py > this.y &&
      py < this.y + this.h
    );
  }

  addMember(person, px, py) {
    console.log(
      `Trying to add member ${person.firstName} at position (${px}, ${py})`
    );
    const nearestSlotIndex = this.getNearestEmptySlot(px, py);
    console.log(
      `Nearest empty slot index for ${person.firstName}:`,
      nearestSlotIndex
    );
    if (nearestSlotIndex !== -1) {
      this.members[nearestSlotIndex] = person;
      console.log(`Added ${person.firstName} to ${this.title}`);
      this.updateMemberPositions();
      this.recalculateHappiness();
    } else {
      console.log(
        `Group ${this.title} is full. ${person.firstName} not added.`
      );
      person.x = this.x + this.w - person.w / 2 + 10;
    }
    console.log(
      `Members array after adding ${person.firstName}:`,
      this.members
    );
  }

  removeMember(person) {
    const index = this.members.indexOf(person);
    console.log(
      `Trying to remove member ${person.firstName} from index ${index}`
    );
    person.happiness = 0;
    if (index !== -1) {
      this.members[index] = null;
      console.log(`Removed ${person.firstName} from ${this.title}`);
      this.updateMemberPositions();
      this.recalculateHappiness();
    }
    console.log(
      `Members array after removing ${person.firstName}:`,
      this.members
    );
  }

  getNearestEmptySlot(px, py) {
    let nearestIndex = -1;
    let minDist = Infinity;
    this.members.forEach((member, index) => {
      if (member === null) {
        const slotX = this.x + 10;
        const slotY = this.y + index * 40 + 40;
        const currentDist = dist(px, py, slotX, slotY);
        if (currentDist < minDist) {
          minDist = currentDist;
          nearestIndex = index;
        }
      }
    });
    return nearestIndex;
  }

  updateMemberPositions() {
    this.members.forEach((member, index) => {
      if (member !== null) {
        member.x = this.x + 10;
        member.y = this.y + index * 40 + 40;
        console.log(
          `Updated position of ${member.displayName} to (${member.x}, ${member.y})`
        );
      }
    });
  }

  hasAvailableSlot() {
    let available = this.members.some((member) => member === null);
    console.log(
      `Group ${this.title} has available slot: ${available}`
    );
    return available;
  }

  recalculateHappiness() {
    this.members.forEach((member) => {
      if (member !== null) {
        member.updateHappiness(this);
      }
    });
  }

  getGenderCounts() {
    const counts = { M: 0, F: 0, Other: 0 };
    this.members.forEach((member) => {
      if (member !== null && member.gender) {
        if (member.gender === 'M') {
          counts.M++;
        } else if (member.gender === 'F') {
          counts.F++;
        } else {
          counts.Other++;
        }
      }
    });
    return counts;
  }

  toString() {
    let memberNames = this.members.join(', ');
    return `Group: ${this.title}\nMax Size: ${this.maxSize}\nMembers: [${memberNames}]`;
  }
}
