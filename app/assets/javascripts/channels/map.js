const THREE = require('three');
const OBJLoader = require('three-obj-loader');
OBJLoader(THREE);

const AStar = require('./astar');
const Graph = require('./graph');

module.exports = class Map extends THREE.Object3D {
  static WALL_GEOM = new THREE.BoxGeometry(1, 1, 1);

  constructor() {
    super();

    this.computeGraph();
    this.addFloor();
    this.addTrees();
  }

  addFloor() {
    const texture = new THREE.TextureLoader().load('/assets/floor.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);
    this.floor = new THREE.Mesh(
      new THREE.BoxGeometry(128, 128, 1),
      new THREE.MeshPhongMaterial({ color: 0x00ff00, map: texture })
    );
    this.floor.position.z = -0.5;
    this.floor.castShadow = true;
    this.floor.receiveShadow = true;
    this.add(this.floor);
  }

  addTrees() {
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
      for (let i = 0; i < this.mapData.length; i++) {
        for (let j = 0; j < this.mapData[i].length; j++) {
          let treeType = this.mapData[i][j];

          if (treeType === 2 && Math.random() < 0.75) {
            treeType = 0;
          }

          if (treeType === 3) {
            treeType = 0;
          }

          if (treeType > 0) {
            const rotation = Math.random()*2*Math.PI;
            const scale = 1.0 + Math.random()*0.7 - 0.5;
        		const mesh = treeType === 1 ? tree.clone() : treeLow.clone();
            mesh.rotation.x += 1.5708;
            mesh.rotation.y == rotation;
            mesh.scale.multiplyScalar(scale);
            mesh.position.set(i - this.mapData.length/2, j - this.mapData[i].length/2, 0.5);
            this.add(mesh);
          }
        }
      }
    }) });
  }

  computeGraph() {
    const img = document.getElementById('map-image');
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);

    this.mapData = [];

    for (let i = 0; i < img.width; i++) {
      this.mapData[i] = [];
      for (let j = 0; j < img.height; j++) {
        const pixel = canvas.getContext('2d').getImageData(i, j, 1, 1).data;
        let treeType = 0;
        if (pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0) {
          treeType = 1;
        }
        if(pixel[0] === 0 && pixel[1] === 0 && pixel[2] > 0) {
          treeType = 2;
        }
        if(pixel[0] > 0 && pixel[1] === 0 && pixel[2] > 0) {
          treeType = 3;
        }

        this.mapData[i][j] = treeType;
      }
    }

    this.navGraph = new Graph(this.mapData.map(row => row.map(v => v ? 9999 : 1)));
  }

  isTree(i, j) {
    return this.mapData[i][j] === 1 || this.mapData[i][j] === 2;
  }

  getPath(from, to) {
    const startI = Math.floor(from.x + this.mapData.length/2);
    const startJ = Math.floor(from.y + this.mapData[0].length/2);
    const endI = Math.floor(to.x + this.mapData.length/2);
    const endJ = Math.floor(to.y + this.mapData[0].length/2);

    if (startI === endI && startJ === endJ) {
      if (this.isTree(endI, endJ)) return;
      return [to];
    }

    const start = this.navGraph.grid[startI][startJ];
    const end = this.navGraph.grid[endI][endJ];

    const result = AStar.search(this.navGraph, start, end);

    const path = result.filter(node => {
      return !this.isTree(node.x, node.y);
    }).map(node => {
      return new THREE.Vector2(node.x - this.mapData.length/2, node.y - this.mapData[0].length/2);
    });

    if (result.length === path.length) {
      path[path.length - 1].copy(to);
    }

    return path;
  }
};
