const THREE = require('three');

module.exports = class Player extends THREE.Object3D {
  static SPEED = 0.01

  constructor(state) {
    super();

    const geometry = new THREE.BoxGeometry( 1, 1, 1 );
		const material = new THREE.MeshPhongMaterial( { color: 0xff00ff } );
		const mesh = new THREE.Mesh( geometry, material );
    mesh.position.z = 0.5;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.up.set(0, 0, 1);
    this.add(mesh);

    this.moveTarget = new THREE.Vector3(0, 0, 0);
    this._vector3 = new THREE.Vector3();
    this.moving = false;

    this.position.set(state.x, state.y, 0.0);
  }

  onFinishedMoving(handler) {
    this.finishMoveHandler = handler;
  }

  update(delta) {
    if (this.moving) {
      const distanceToTargetSq = this.moveTarget.distanceToSquared(this.position);
      const minStep = Player.SPEED * delta;
      if (distanceToTargetSq <= minStep * minStep) {
        this.position.copy(this.moveTarget);
        this.moving = false;
        if (this.finishMoveHandler) this.finishMoveHandler();
      } else if (distanceToTargetSq > 0) {
        this._vector3.copy(this.moveTarget).sub(this.position)
          .normalize().multiplyScalar(minStep);
        this.position.add(this._vector3);
      }
    }
  }

  moveTo(point) {
    this.moveTarget.set(point.x, point.y, 0);
    this.moving = true;
  }

  getState() {
    return {
      x: this.position.x,
      y: this.position.y
    };
  }
};
