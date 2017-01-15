const THREE = require('three');

module.exports = class Player extends THREE.Object3D {
  constructor() {
    super();
    var geometry = new THREE.BoxGeometry( 1, 1, 1 );
		var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
		var cube = new THREE.Mesh( geometry, material );
    this.add(cube);
  }
};
