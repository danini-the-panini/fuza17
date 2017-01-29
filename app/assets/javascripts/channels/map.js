const THREE = require('three');
const OBJLoader = require('three-obj-loader');
OBJLoader(THREE);

const AStar = require('./astar');
const Graph = require('./graph');

const Monument = require('./monument');

module.exports = class Map extends THREE.Object3D {
  static WALL_GEOM = new THREE.BoxGeometry(1, 1, 1);
  static TILE_TYPES = {
    tree: [0, 0, 0],
    lowTree: [0, 0, 255],
    treePadding: [255, 0, 255],
    spawnPoint0: [255, 0, 0],
    spawnPoint1: [0, 255, 0],
    monument0: [255, 255, 0],
    monument1: [0, 255, 255],
    invisibleWall: [127, 127, 127]
  }

  constructor() {
    super();

    this.addFloor();
    this.computeGraph(() => {
      this.addTrees();
      this.addMonuments();
    });
  }

  addFloor() {
    const texture = new THREE.TextureLoader().load('/assets/floor.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16);
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
    this.loadImage('/assets/noise.png', (img, canvas) => {
      let loader = new THREE.OBJLoader();
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
            if (treeType === 'tree' || treeType === 'lowTree') {
              const noise = canvas.getContext('2d').getImageData(i, j, 1, 1).data[0]/256;
              const rotation = noise*2*Math.PI;
              const scale = 1.0 + noise*0.7 - 0.5;
          		const mesh = treeType === 'tree' ? tree.clone() : treeLow.clone();
              mesh.rotation.x += 1.5708;
              mesh.rotation.y == rotation;
              mesh.scale.multiplyScalar(scale);
              mesh.position.set(i - this.mapData.length/2, j - this.mapData[i].length/2, 0.5);
              this.add(mesh);
            }
          }
        }
      }) });
    });
  }

  addMonuments() {
    this.monuments = [];
    for (let i = 0; i < this.mapData.length; i++) {
      for (let j = 0; j < this.mapData[i].length; j++) {
        const monumentType = this.mapData[i][j];
        if (monumentType === 'monument0' || monumentType === 'monument1') {
          const team = monumentType === 'monument0' ? 0 : 1;
          const monument = new Monument(team, new THREE.Vector3(i - this.mapData.length/2, j - this.mapData[i].length/2, 0));
          this.add(monument);
          this.monuments[team] = monument;
        }
      }
    }
  }

  printMap() {
    for (let i = 0; i < this.mapData.length; i++) {
      let s = '';
      for (let j = 0; j < this.mapData[i].length; j++) {
        const m = this.mapData[i][j];
        if (m === 'tree') {
          s += '^';
        } else if (m === 'lowTree') {
          s += '#';
        } else if (/spawn/.test(m)) {
          s += '*';
        } else if (/monument/.test(m)) {
          s += 'M';
        } else {
          s += ' ';
        }
      }
      console.log(s);
    }
  }

  getMonumentForTeam(team) {
    this.monuments[team];
  }

  getTileType(pixel) {
    for (let type in Map.TILE_TYPES) {
      if (!Map.TILE_TYPES.hasOwnProperty(type)) return;
      const typePixel = Map.TILE_TYPES[type];
      if (pixel[0] === typePixel[0] && pixel[1] === typePixel[1] && pixel[2] === typePixel[2]) {
        return type;
      }
    }
    return 'path';
  }

  computeGraph(callback) {
    this.loadImage('/assets/map.png', (img, canvas) => {

      this.mapData = [];

      for (let i = 0; i < img.width; i++) {
        this.mapData[i] = [];
        for (let j = 0; j < img.height; j++) {
          const pixel = canvas.getContext('2d').getImageData(i, j, 1, 1).data;
          this.mapData[i][j] = this.getTileType(pixel);
        }
      }

      this.navGraph = new Graph(this.mapData.map(row => row.map(v => this.isPathable(v) ? 1 : 9999)));

      callback();
    });
  }

  isPathable(m) {
    if (m === 'path' || /spawn/.test(m)) return true;
    return false;
  }

  isTree(i, j) {
    const m = this.mapData[i][j];
    return m === 'tree' || m === 'lowTree' || /monument/.test(m) || m === 'invisibleWall';
  }

  isTreeOrBuffer(i, j) {
    return this.isTree(i) || this.mapData[i][j] === 'treePadding';
  }

  loadImage(path, callback) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
      callback(img, canvas);
    };
    img.src = path;
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

    return this.trimPath(path);
  }

  lineIntersectsTree(from, to) {
    const blocks = this.getDiscreetBlocks(from, to);

    for (let i = 0; i < blocks.length; i++) {
      if (this.isTree(blocks[i].x, blocks[i].y)) return true;
    }

    return false;
  }

  trimPath(path) {
    if (path.length <= 2) return path;

    const newPath = [];
    const end = path[path.length - 1];

    i_loop: for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      for (let j = path.length - 1; j > i; j--) {
        const p2 = path[j];

        if (!this.lineIntersectsTree(p1, p2)) {
          newPath.push(p1);
          i = j - 1;
          continue i_loop;
        }
      }
    }

    newPath.push(end);

    return newPath;
  }

  getDiscreetBlocks(from, to) {
    let coordinatesArray = [];
    // Translate coordinates
    let x1 = Math.floor(from.x + this.mapData.length/2);
    let y1 = Math.floor(from.y + this.mapData[0].length/2);
    let x2 = Math.floor(to.x + this.mapData.length/2);
    let y2 = Math.floor(to.y + this.mapData[0].length/2);
    // Define differences and error check
    let dx = Math.abs(x2 - x1);
    let dy = Math.abs(y2 - y1);
    let sx = (x1 < x2) ? 1 : -1;
    let sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy;
    // Set first coordinates
    coordinatesArray.push(new THREE.Vector2(x1, y1));
    // Main loop
    while (!((x1 == x2) && (y1 == y2))) {
      let e2 = err << 1;
      if (e2 > -dy) {
        err -= dy;
        x1 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y1 += sy;
      }
      // Set coordinates
      coordinatesArray.push(new THREE.Vector2(x1, y1));
    }
    // Return the result
    return coordinatesArray;
  }

  getDebugBlocks(path) {
    const pathBlocks = new THREE.Group();
    for (let i = 0; i < path.length - 1; i++) {
      pathBlocks.add(this.getDebugBlocksForLine(path[i], path[i+1]));
    }
    return pathBlocks;
  }

  getDebugBlocksForLine(from, to) {
    const blocks = this.getDiscreetBlocks(from, to);
    const blocksGroup = new THREE.Group();

    for (let i = 0; i < blocks.length; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({
        color: 0xff00ff, wireframe: true
      }));
      box.position.set(blocks[i].x - this.mapData.length/2, blocks[i].y - this.mapData[0].length/2, 0.5);
      blocksGroup.add(box);
    }

    return blocksGroup;
  }
};
