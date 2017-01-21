const THREE = require('three');
const Player = require('./player');
const moveToTarget = require('./moveToTarget');

class HomingMissile extends THREE.Object3D {
  static SPEED = 0.05
  static HALF_UP = new THREE.Vector3(0, 0, 0.5)

  constructor(startingPoint, target) {
    super();

    const geometry = new THREE.SphereGeometry(0.15);
    const material = new THREE.MeshBasicMaterial( { color: 0x00e9ff } );
    const mesh = new THREE.Mesh( geometry, material );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.up.set(0, 0, 1);
    this.add(mesh);

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
