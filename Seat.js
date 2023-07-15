export default class Seat {
  constructor(group, x, y, w, h) {
    this.group = group;
    this.system = this.group.system;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.member = null;
    this.rollover = false;
  }

  assignMember(member) {
    if (member != null) {
      member.x = this.x;
      member.y = this.y;
    }
    this.member = member;
  }

  unassignMember() {
    this.member = null;
  }

  isOccupied() {
    return this.member != null;
  }

  show() {
    const p5 = this.group.system.p5;
    if (this.member) {
      p5.stroke(0, 200, 0);
    } else if (this.rollover) {
      p5.stroke(200, 200, 0);
    } else {
      p5.stroke(100, 0, 0);
    }
    p5.strokeWeight(3);
    p5.fill(255);
    p5.rect(this.x, this.y, this.w, this.h);
  }

  isMouseOver() {
    const p5 = this.group.system.p5;
    if (
      p5.mouseX > this.x &&
      p5.mouseX < this.x + this.w &&
      p5.mouseY > this.y &&
      p5.mouseY < this.y + this.h
    ) {
      if (this.system.getDraggingMember() !== null) {
        this.rollover = true;
      }
      return true;
    } else {
      this.rollover = false;
      return false;
    }
  }

  released() {
    if (
      this.rollover &&
      this.member === null &&
      this.system.getDraggingMember() !== null
    ) {
      this.member = this.system.getDraggingMember();
      this.member.x = this.x;
      this.member.y = this.y;
      this.system.stopDraggingMember();
    }
  }
}
