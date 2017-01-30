const THREE = require('three');
const moveToTarget = require('./moveToTarget');

class Player extends THREE.Object3D {
  static SPEED = 0.01
  static RADIUS = 0.5
  static TEAM_COLORS = [0x0000ff, 0xff0000];

  constructor(playerId, name, state) {
    super();

    this.playerId = playerId;
    this.name = name;
    this.setState(state);

		const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
                                new THREE.MeshPhongMaterial({ color: Player.TEAM_COLORS[this.team] }));
    mesh.position.z = 0.5;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.up.set(0, 0, 1);
    this.add(mesh);

		const hitMesh = new THREE.Mesh(new THREE.SphereGeometry(2),
                                new THREE.MeshBasicMaterial({
                                                              color: 0xff00ff,
                                                              wireframe: true,
                                                              visible: false
                                                            }));
    hitMesh.up.set(0, 0, 1);
    this.add(hitMesh);

    this.moveTarget = new THREE.Vector3(0, 0, 0);
    this.moving = false;
    this.speed = Player.SPEED;
  }

  setState(state) {
    this.position.set(state.x, state.y, 0.0);
    this.abilities = state.abilities;
    this.hp = state.hp;
    this.state = state;
    this.team = state.team;
  }

  update(delta) {
    if (this.moving) {
      this.moveOverTime(delta);
    }
  }

  die() {
    this.visible = false;
    this.dead = true;
  }

  respawn(state) {
    this.visible = true;
    this.dead = false;
    this.setState(state);
  }
};

moveToTarget(Player);
module.exports = Player;
