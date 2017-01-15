const THREE = require('three');
const Player = require('./player');

module.exports = class GameEngine {
  static CAMERA_OFFSET = new THREE.Vector3(-5, -5, 10)
  static LIGHT_OFFSET = new THREE.Vector3(10, -8, 20)

  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
  	this.scene.fog = new THREE.FogExp2(0x999999, 0.055);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 1, 1000);
    this.setCameraExtents();

    this.camera.position.copy(GameEngine.CAMERA_OFFSET);
    this.camera.up = new THREE.Vector3(0, 0, 1);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.floor = new THREE.Mesh(
      new THREE.BoxGeometry(200, 200, 1),
      new THREE.MeshPhongMaterial({ color: 0x00ff00 })
    );
    this.floor.position.z = -0.5;
    this.floor.castShadow = true;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    this.light = new THREE.DirectionalLight(0xffffff, 0.5);
    this.light.position.copy(GameEngine.LIGHT_OFFSET);
    this.light.castShadow = true;
    this.light.shadow.camera.left = -20;
    this.light.shadow.camera.right = 20;
    this.light.shadow.camera.top = 20;
    this.light.shadow.camera.bottom = -20;
    this.light.shadow.camera.far = 50;
    this.light.shadow.camera.near = 1;
    this.light.shadow.camera.up.set(0, 0, 1);
    this.light.shadow.mapSize = new THREE.Vector2(2048, 2048);
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
  }

  setCameraExtents() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  addPlayer(player = new Player()) {
    this.scene.add(player);
    return player;
  }

  removePlayer(player) {
    this.scene.remove(player);
  }

  render = () => {
    requestAnimationFrame( this.render );
    this.renderer.render(this.scene, this.camera);
  }
};
