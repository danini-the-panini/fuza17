const THREE = require('three');

module.exports = class Map extends THREE.Object3D {
  static WALL_GEOM = new THREE.BoxGeometry(1, 1, 1);
  static WALL_MAT = new THREE.MeshPhongMaterial({ color: 0xff00ff });

  constructor() {
    super();

    const img = document.getElementById('map-image');
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);

    const texture = new THREE.TextureLoader().load('/assets/floor.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(img.width, img.height, 1),
      new THREE.MeshPhongMaterial({ color: 0x00ff00, map: texture })
    );
    floor.position.z = -0.5;
    floor.castShadow = true;
    floor.receiveShadow = true;
    this.add(floor);

    for (let i = 0; i < img.width; i++) {
      for (let j = 0; j < img.height; j++) {
        const pixel = canvas.getContext('2d').getImageData(i, j, 1, 1).data;
        if (pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0) {
      		const mesh = new THREE.Mesh(Map.WALL_GEOM, Map.WALL_MAT);
          mesh.position.set(i - img.width/2, j - img.height/2, 0.5);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.add(mesh);
        }
      }
    }
  }
}
