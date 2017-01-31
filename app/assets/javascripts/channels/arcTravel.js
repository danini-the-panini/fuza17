const THREE = require('three');

const tmpVector3 = new THREE.Vector3();

module.exports = function arcTravel(klass) {
  klass.prototype.onFinishedMoving = function onFinishedMoving(handler) {
    this.finishMoveHandlers = this.finishMoveHandlers || []
    this.finishMoveHandlers.push(handler);
  };

  klass.prototype.getProgress = function getProgress() {
    tmpVector3.copy(this.position).sub(this.startingPoint).setZ(0);
    return Math.min(tmpVector3.length() / this.travelLength, 1.0000001);
  }

  klass.prototype.targetPoint = function targetPoint(target, timePassed = 0) {
    this.target.set(target.x, target.y, 0);
    this.travelVector.copy(this.target).sub(this.startingPoint);
    this.travelLength = this.travelVector.length();
    this.travelVectorNorm.copy(this.travelVector).normalize();
    this.moveOverTime(timePassed);
  }

  klass.prototype.getDirection = function getDirection(vector = tmpVector3) {
    return vector.copy(this.travelVectorNorm);
  }

  klass.prototype.moveOverTime = function moveOverTime(timePassed = 0) {
    if (timePassed <= 0) return;
    tmpVector3.copy(this.travelVectorNorm).multiplyScalar(this.speed * timePassed);
    this.position.add(tmpVector3);
    this.position.z = this.getHeight() * 3;
    if (this.getProgress() >= 1.0 && this.finishMoveHandlers) {
      this.finishMoveHandlers.forEach(handler => handler());
    }
  };

  return klass;
}
