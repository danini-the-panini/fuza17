const THREE = require('three');
const moveToTarget = require('./moveToTarget');

class Player extends THREE.Object3D {
  static SPEED = 0.01
  static RADIUS = 0.5

  constructor(playerId, state) {
    super();

    this.playerId = playerId;
		const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
                                new THREE.MeshPhongMaterial({ color: 0xff00ff }));
    mesh.position.z = 0.5;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.up.set(0, 0, 1);
    this.add(mesh);

		const hitMesh = new THREE.Mesh(new THREE.SphereGeometry(2),
                                new THREE.MeshBasicMaterial({
                                                              color: 0xff00ff,
                                                              wireframe: true,
                                                              opacity: 0,
                                                              transparent: true
                                                            }));
    hitMesh.up.set(0, 0, 1);
    this.add(hitMesh);

    this.moveTarget = new THREE.Vector3(0, 0, 0);
    this.moving = false;
    this.speed = Player.SPEED;

    this.position.set(state.x, state.y, 0.0);
    this.abilities = state.abilities;
  }

  setState(state) {
    this.position.set(state.x, state.y, 0.0);
    this.abilities = state.abilities;
  }

  update(delta) {
    if (this.moving) {
      this.moveOverTime(delta);
    }
  }

  getState() {
    return {
      x: this.position.x,
      y: this.position.y,
      abilities: this.abilities
    };
  }
};

moveToTarget(Player);
module.exports = Player;
