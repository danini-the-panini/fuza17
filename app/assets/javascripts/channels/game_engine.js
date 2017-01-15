const THREE = require('three');
const Player = require('./player');

module.exports = class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setSize( window.innerWidth, window.innerHeight );

		this.camera.position.z = 5;

    $(window).on('resize', () => {
      this.camera.aspect = window.innerWidth/window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize( window.innerWidth, window.innerHeight );
    });
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
