const THREE = require('three');
const moveToTarget = require('./moveToTarget');

class Player extends THREE.Object3D {
  static SPEED = 0.01
  static RADIUS = 0.5

  constructor(playerId, state) {
    super();

    this.playerId = playerId;
    const geometry = new THREE.BoxGeometry( 1, 1, 1 );
		const material = new THREE.MeshPhongMaterial( { color: 0xff00ff } );
		const mesh = new THREE.Mesh( geometry, material );
    mesh.position.z = 0.5;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.up.set(0, 0, 1);
    this.add(mesh);

    this.moveTarget = new THREE.Vector3(0, 0, 0);
    this.moving = false;
    this.speed = Player.SPEED;

    this.position.set(state.x, state.y, 0.0);
  }

  update(delta) {
    if (this.moving) {
      this.moveOverTime(delta);
    }
  }

  getState() {
    return {
      x: this.position.x,
      y: this.position.y
    };
  }
};

moveToTarget(Player);
module.exports = Player;
