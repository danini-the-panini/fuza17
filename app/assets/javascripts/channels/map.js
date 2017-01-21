const THREE = require('three');
const OBJLoader = require('three-obj-loader');
OBJLoader(THREE);

module.exports = class Map extends THREE.Object3D {
  static WALL_GEOM = new THREE.BoxGeometry(1, 1, 1);

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

    var loader = new THREE.OBJLoader();
    loader.load('/assets/tree.obj', (tree) => { loader.load('/assets/tree_low.obj', (treeLow) => {
      tree.traverse(child => {
        child.castShadow = true;
        child.receiveShadow = false;
        if (child.material) {
          child.material.color = new THREE.Color(0x00ff00);
        }
      });
      treeLow.traverse(child => {
        if (child.material) {
          child.material.color = new THREE.Color(0x009900);
        }
      });
      for (let i = 0; i < img.width; i++) {
        for (let j = 0; j < img.height; j++) {
          const pixel = canvas.getContext('2d').getImageData(i, j, 1, 1).data;
          let treeType = 0;
          if (pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0) {
            treeType = 1;
          }
          if(pixel[0] === 0 && pixel[1] === 0 && pixel[2] > 0) {
            treeType = Math.random() > 0.75 ? 2 : 0;
          }

          if (treeType > 0) {
            const rotation = Math.random()*2*Math.PI;
            const scale = 1.0 + Math.random()*0.7 - 0.5;
        		const mesh = treeType === 1 ? tree.clone() : treeLow.clone();
            mesh.rotation.x += 1.5708;
            mesh.rotation.y == rotation;
            mesh.scale.multiplyScalar(scale);
            mesh.position.set(i - img.width/2, j - img.height/2, 0.5);
            this.add(mesh);
          }
        }
      }
    }) });
  }
};
