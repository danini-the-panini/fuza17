const THREE = require('three');

const Player = require('./player');
const arcTravel = require('./arcTravel');
const smokeTrail = require('./smokeTrail');

class Missile extends THREE.Object3D {
  static SPEED = 0.005
  static HALF_UP = new THREE.Vector3(0, 0, 0.5)

  constructor(hitId, ability, startingPoint, target, team) {
    super();

    this.up.set(0, 0, 1);
    let loader = new THREE.OBJLoader();
    loader.load('/assets/bullet.obj', (object) => {
      object.traverse(child => {
        child.castShadow = true;
        child.receiveShadow = false;
        if (child.material) {
          child.material.color = new THREE.Color(Player.TEAM_COLORS[team]);
        }
      });
      object.scale.multiplyScalar(2);
      this.add(object);
    });

    this.hitId = hitId;
    this.ability = ability;
    this.team = team;

    this._tmpVector3 = new THREE.Vector3();

    this.startingPoint = new THREE.Vector3(startingPoint.x, startingPoint.y, 0);
    this.position.copy(this.startingPoint);
    this.target = new THREE.Vector3();
    this.travelVector = new THREE.Vector3();
    this.travelVectorNorm = new THREE.Vector3();
    this.targetPoint(target);

    this.speed = Missile.SPEED;
  }

  onUpdate(handler) {
    this.updateHandler = handler;
  }

  getHeight() {
    return 0.5;
  }

  update(delta) {
    this.moveOverTime(delta);
    this._tmpVector3.copy(this.target).z += this.getHeight();
    this.lookAt(this._tmpVector3);

    if (this.updateHandler) {
      this.updateHandler();
    }
  }
}

smokeTrail(Missile, {
  sjmin: 0.2, sjmax: 0.8,
  spawnTime: 30,
  distance: 2,
  maxAge: 10000
});
arcTravel(Missile);
module.exports = Missile;
