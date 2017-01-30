const THREE = require('three');
const OBJLoader = require('three-obj-loader');
OBJLoader(THREE);

const Player = require('./player');
const moveToTarget = require('./moveToTarget');

class HomingMissile extends THREE.Object3D {
  static SPEED = 0.015
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
      this.add(object);
    });

    this.hitId = hitId;
    this.ability = ability;
    this.team = team;

    this.position.copy(startingPoint);
    this.target = target;

    this._tmpVectorA = new THREE.Vector3();
    this._tmpVectorB = new THREE.Vector3();

    this.moveTarget = target.position.clone();
    this.moving = true;
    this.speed = HomingMissile.SPEED;
  }

  update(delta) {
    if (this.moving) {
      this.moveTarget.copy(this.getTargetSurface()).add(HomingMissile.HALF_UP);
      this.lookAt(this.moveTarget);
      this.moveOverTime(delta);
    }
  }

  targetObject(target, timePassed = 0.0) {
    this.target = target;
    this.moveTo(this.getTargetSurface(), timePassed);
  }

  getTargetSurface() {
    this._tmpVectorA.copy(this.target.position).sub(this.position).normalize().multiplyScalar(Player.RADIUS);
    return this._tmpVectorB.copy(this.target.position).sub(this._tmpVectorA);
  }
}

moveToTarget(HomingMissile);
module.exports = HomingMissile;
