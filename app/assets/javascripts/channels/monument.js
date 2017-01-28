const THREE = require('three');
const OBJLoader = require('three-obj-loader');
OBJLoader(THREE);

const Player = require('./player');

module.exports = class Monument extends THREE.Object3D {
  constructor(team, position) {
    super();

    this.team = team;
    this.position.copy(position);

    let loader = new THREE.OBJLoader();
    loader.load('/assets/monument.obj', (object) =>
      object.traverse(child => {
        child.castShadow = true;
        child.receiveShadow = false;
        if (child.material) {
          child.material.color = new THREE.Color(Player.TEAM_COLORS[this.team]);
        }
      });
      mesh = object.clone();
      this.add(mesh);
    })
  }
};
