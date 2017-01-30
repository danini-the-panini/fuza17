const THREE = require('three');
const Map = require('./map');
const Player = require('./player');
const Monument = require('./monument');

const smokeTrail = require('./smokeTrail');

module.exports = class GameEngine {
  static CAMERA_OFFSET = new THREE.Vector3(0, -5, 10)
  static LIGHT_OFFSET = new THREE.Vector3(10, 4, 20)

  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
  	this.scene.fog = new THREE.FogExp2(0x999999, 0.055);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 1, 1000);
    this.setCameraExtents();

    this.camera.position.copy(GameEngine.CAMERA_OFFSET);
    this.camera.up = new THREE.Vector3(0, 0, 1);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.map = new Map();
    this.scene.add(this.map);

    this.light = new THREE.DirectionalLight(0xffffff, 0.5);
    this.light.position.copy(GameEngine.LIGHT_OFFSET);
    this.light.castShadow = true;
    this.light.shadow.camera.left = -30;
    this.light.shadow.camera.right = 30;
    this.light.shadow.camera.top = 30;
    this.light.shadow.camera.bottom = -30;
    this.light.shadow.camera.far = 50;
    this.light.shadow.camera.near = 1;
    this.light.shadow.camera.up.set(0, 0, 1);
    this.light.shadow.mapSize = new THREE.Vector2(256, 256);
    this.light.target = new THREE.Object3D();
    this.scene.add(this.light);

    const amLight = new THREE.AmbientLight(0x999999, 0.5);
    this.scene.add(amLight);

    // const helper = new THREE.CameraHelper( this.light.shadow.camera );
    // this.scene.add(helper);

    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    $(window).on('resize', () => {
      this.setCameraExtents();
      this.renderer.setSize( window.innerWidth, window.innerHeight );
    });

    this.canvasPosition = $(canvas).position();
    this.rayCaster = new THREE.Raycaster();
    $('#game').on('click', evt => {
      if (evt.which !== 1) return;
      this.mouseClicked(evt);
      evt.preventDefault();
    });

    this.players = new THREE.Group();
    this.scene.add(this.players);

    this.projectiles = new THREE.Group();
    this.scene.add(this.projectiles);

    this._tmpVector = new THREE.Vector3();
  }

  onMouseClicked(handler) {
    this.mouseClickHandler = handler;
  }

  onPlayerClicked(handler) {
    this.playerClickHandler = handler;
  }

  onMonumentClicked(handler) {
    this.monumentClickHandler = handler;
  }

  onUpdate(handler) {
    this.updateHandler = handler;
  }

  mouseClicked(evt) {
    if (!this.mouseClickHandler) return;

    const mousePosition = new THREE.Vector2(
      ((evt.clientX - this.canvasPosition.left) / this.canvas.width) * 2 - 1,
      -((evt.clientY - this.canvasPosition.top) / this.canvas.height) * 2 + 1
    );

    const floorIntersection = this.getIntersection(mousePosition, [this.map.floor]);
    const playerIntersection = this.getIntersection(mousePosition, this.getOtherPlayers());
    const monumentIntersection = this.map.monuments ? this.getIntersection(mousePosition, this.map.monuments) : false;

    if (monumentIntersection) {
      const monument = this.getParentOfType(monumentIntersection.object, Monument);
      if (this.monumentClickHandler(monument)) return;
    }
    if (playerIntersection) {
      const player = this.getParentOfType(playerIntersection.object, Player);
      if (this.playerClickHandler(player)) return;
    }
    if (floorIntersection) {
      const point = floorIntersection.point;
      this.mouseClickHandler(point);
      return;
    }
  }

  getIntersection(mousePosition, objects) {
    this.rayCaster.setFromCamera(mousePosition, this.camera);
    const intersects = this.rayCaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
      return intersects[0];
    }
    return null;
  }

  getParentOfType(object, type) {
    if (!object) return null;
    if (object.constructor === type) return object;
    return this.getParentOfType(object.parent, type);
  }

  setCameraExtents() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  addPlayer(player = new Player()) {
    this.players.add(player);
    return player;
  }

  addProjectile(projectile) {
    projectile.onFinishedMoving(() => {
      this.removeProjectile(projectile);
    });
    this.projectiles.add(projectile);
    return projectile;
  }

  removePlayer(player) {
    this.players.remove(player);
  }

  setThisPlayer(player) {
    this.thisPlayer = player;
  }

  getOtherPlayers() {
    return this.players.children.filter(player => player !== this.thisPlayer);
  }

  removeProjectile(projectile) {
    this.projectiles.remove(projectile);
  }

  followPlayer(player) {
    this.followingPlayer = player;
    this.light.target = player;
  }

  getPlayerScreenCoords(player, tmpVector = this._tmpVector) {
    tmpVector.setFromMatrixPosition(player.matrixWorld);
    tmpVector.z += 1.5;
    tmpVector.project(this.camera);

    tmpVector.x = (tmpVector.x * (window.innerWidth/2)) + (window.innerWidth/2);
    tmpVector.y = - (tmpVector.y * (window.innerHeight/2)) + (window.innerHeight/2);

    return tmpVector;
  }

  update() {
    const now = +(new Date());
    const delta = now - this.lastUpdate;

    this.players.children.forEach(player => {
      player.update(delta);
    });

    this.projectiles.children.forEach(projectile => {
      projectile.update(delta);
    });

    if (this.followingPlayer) {
      this.light.position.copy(this.followingPlayer.position).add(GameEngine.LIGHT_OFFSET);
      this.camera.position.copy(this.followingPlayer.position).add(GameEngine.CAMERA_OFFSET);
      this.camera.lookAt(this.followingPlayer.position);
    }

    smokeTrail.update(delta);

    this.lastUpdate = now;

    if (this.updateHandler) this.updateHandler(delta);
  }

  render = () => {
    requestAnimationFrame( this.render );

    this.update();

    this.renderer.render(this.scene, this.camera);
  }

  start() {
    this.lastUpdate = +(new Date());
    this.render();
  }
};
