class Person {
  constructor(id, lastName, firstName) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.displayName = firstName + ' ' + lastName.slice(0, 1);
    this.x = round(random(width - 400, width - 70));
    this.y = round(random(50, height - 50));
    this.w = 60;
    this.h = 20;
    this.dragging = false;
    this.connections = [];
    this.groupPreferences = [];
    this.happiness = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.highlighted = false;

    // New pinned assignment properties
    this.pinned = false;
    this.pinnedGroupTitle = null;

    this.gender = null; // Will be set from gender data: 'M', 'F', or other
  }

  isMouseOver() {
    return (
      mouseX > this.x &&
      mouseX < this.x + this.w &&
      mouseY > this.y &&
      mouseY < this.y + this.h
    );
  }

  setConnectionIds(idList) {
    this.connections = idList;
  }

  getConnectionIds() {
    return this.connections;
  }

  setGroupPreferences(preferenceList) {
    this.groupPreferences = preferenceList;
  }

  getGroupPreferences() {
    return this.groupPreferences;
  }

  getPreferenceRank(groupTitle) {
    const rank = this.groupPreferences.indexOf(groupTitle);
    return rank !== -1 ? rank + 1 : null; // Adding 1 to make it 1-based instead of 0-based
  }

  // New pinned assignment methods
  pinToGroup(groupTitle) {
    this.pinned = true;
    this.pinnedGroupTitle = groupTitle;
    console.log(`${this.displayName} pinned to ${groupTitle}`);
  }

  unpin() {
    this.pinned = false;
    this.pinnedGroupTitle = null;
    console.log(`${this.displayName} unpinned`);
  }

  isPinnedTo(groupTitle) {
    return this.pinned && this.pinnedGroupTitle === groupTitle;
  }

  calculateHappiness(group) {
    if (!group) return 0;

    let happiness = 0;
    if (this.groupPreferences.length > 0) {
      const preferenceIndex = this.groupPreferences.indexOf(
        group.title
      );
      happiness =
        preferenceIndex !== -1
          ? this.groupPreferences.length - preferenceIndex
          : 0;
    } else {
      happiness = group.members.filter(
        (m) => m !== null && this.connections.includes(m.id)
      ).length;
    }

    if (
      happiness === 0 &&
      (this.connections.length > 0 ||
        this.groupPreferences.length > 0)
    ) {
      happiness = -1;
    }

    return happiness;
  }

  updateHappiness(group) {
    this.happiness = this.calculateHappiness(group);
  }

  startDragging(mx, my) {
    this.dragging = true;
    this.offsetX = this.x - mx;
    this.offsetY = this.y - my;
  }

  stopDragging() {
    this.dragging = false;
  }

  updatePosition() {
    if (this.dragging) {
      this.x = mouseX + this.offsetX;
      this.y = mouseY + this.offsetY;
    }
  }

  toString() {
    const pinnedStatus = this.pinned
      ? ` (pinned to ${this.pinnedGroupTitle})`
      : '';
    const genderStatus = this.gender ? ` [${this.gender}]` : '';
    return `${this.id}: ${this.lastName}, ${this.firstName}${genderStatus}${pinnedStatus}`;
  }
}
