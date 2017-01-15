const THREE = require('three');

module.exports = class Player extends THREE.Object3D {
  constructor() {
    super();
    const geometry = new THREE.BoxGeometry( 1, 1, 1 );
		const material = new THREE.MeshPhongMaterial( { color: 0xff00ff } );

		const mesh = new THREE.Mesh( geometry, material );
    mesh.position.z = 0.5;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.up.set(0, 0, 1);

    this.add(mesh);
  }
};
