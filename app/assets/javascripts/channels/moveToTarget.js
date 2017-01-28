const THREE = require('three');

const tmpVector3 = new THREE.Vector3();

module.exports = function(klass) {
  klass.prototype.onFinishedMoving = function(handler) {
    this.finishMoveHandlers = this.finishMoveHandlers || []
    this.finishMoveHandlers.push(handler);
  }

  klass.prototype.stopMoving = function() {
    if (!this.moving) return;
    this.moving = false;
    if (this.finishMoveHandlers) {
      this.finishMoveHandlers.forEach(handler => handler());
    }
  }

  klass.prototype.moveOverTime = function(delta) {
    const distanceToTargetSq = this.moveTarget.distanceToSquared(this.position);
    const minStep = this.speed * delta;
    if (distanceToTargetSq <= minStep * minStep) {
      this.position.copy(this.moveTarget);
      this.stopMoving();
    } else if (distanceToTargetSq > 0) {
      tmpVector3.copy(this.moveTarget).sub(this.position)
        .normalize().multiplyScalar(minStep);
      this.position.add(tmpVector3);
    }
  }

  klass.prototype.moveTo = function(point, timePassed = 0.0) {
    this.moveTarget.set(point.x, point.y, point.z || 0);
    this.moving = true;
    if (timePassed > 0) {
      this.moveOverTime(timePassed);
    }
  }
}
