const THREE = require('three');

const Player = require('./player');
const moveToTarget = require('./moveToTarget');
const smokeTrail = require('./smokeTrail');

class Grenade extends THREE.Object3D {
  static SPEED = 0.01
  static HALF_UP = new THREE.Vector3(0, 0, 0.5)
  static GEOM = new THREE.SphereGeometry(1);

  constructor(hitId, ability, startingPoint, target, team) {
    super();

    this.up.set(0, 0, 1);
    const mesh = new THREE.Mesh(Grenade.GEOM, new THREE.MeshPhongMaterial({
      color: Player.TEAM_COLORS[team]
    }))
    mesh.scale.multiplyScalar(0.2);
    mesh.castShadow = true;
    this.add(mesh);

    this.hitId = hitId;
    this.ability = ability;
    this.team = team;

    this._tmpVector = new THREE.Vector3();

    this.startingPoint = new THREE.Vector3(startingPoint.x, startingPoint.y, 0);
    this.position.copy(this.startingPoint);
    this.target = new THREE.Vector3();
    this.travelVector = new THREE.Vector3();
    this.travelVectorNorm = new THREE.Vector3();
    this.targetPoint(target);

    this.speed = Grenade.SPEED;

    this.finishMoveHandlers = [];
  }

  onFinishedMoving(handler) {
    this.finishMoveHandlers.push(handler);
  };

  getProgress() {
    this._tmpVector.copy(this.position).sub(this.startingPoint).setZ(0);
    return Math.min(this._tmpVector.length() / this.travelLength, 1.0000001);
  }

  getHeight() {
    const x = this.getProgress();
    return -4 * x * x + 4 * x;
  }

  targetPoint(target, timePassed = 0) {
    this.target.set(target.x, target.y, 0);
    this.travelVector.copy(this.target).sub(this.startingPoint);
    this.travelLength = this.travelVector.length();
    this.travelVectorNorm.copy(this.travelVector).normalize();
    this.moveOverTime(timePassed);
  }

  getDirection(vector = this._tmpVector) {
    return vector.copy(this.travelVectorNorm);
  }

  moveOverTime(timePassed = 0) {
    if (timePassed <= 0) return;
    this._tmpVector.copy(this.travelVectorNorm).multiplyScalar(this.speed * timePassed);
    this.position.add(this._tmpVector);
    this.position.z = this.getHeight() * 3;
    if (this.getProgress() >= 1.0) {
      this.finishMoveHandlers.forEach(handler => handler());
    }
  }

  update(delta) {
    this.moveOverTime(delta);
  }
}

smokeTrail(Grenade, {
  pjmin: 0, pjmax: 0,
  sjmin: 0.1, sjmax: 0.1,
  spawnTime: 30,
  distance: 0,
  scaleChange: -0.00003,
  maxAge: 3000,
  opacityChange: 0
});
module.exports = Grenade;
