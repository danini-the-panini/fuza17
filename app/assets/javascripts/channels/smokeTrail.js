const THREE = require('three');

const tmpVector3 = new THREE.Vector3();

const SMOKE_GEOM = new THREE.SphereGeometry(1);


const SMOKE_TIME = 20;

function createSmokeTrail() {
  const material = new THREE.MeshPhongMaterial({ color: 0xDDDDDD, transparent: true });
  return new THREE.Mesh(SMOKE_GEOM, material);
}

function findScene(object) {
  if (!object) return null;
  if (object.constructor === THREE.Scene) return object;
  return findScene(object.parent);
}

function rando(min, max) {
  const range = max - min;
  return Math.random() * range + min;
}

function randomizeScale(object) {
  const scale = rando(0.2, 0.4);
  object.scale.set(scale, scale, scale);
}

const PJMIN = -0.1;
const PJMAX = 0.1;
function jitterPosition(object) {
  tmpVector3.set(rando(PJMIN, PJMAX), rando(PJMIN, PJMAX), rando(PJMIN, PJMAX));
  object.position.add(tmpVector3);
}

function smokeTrail(klass) {
  const originalUpdate = klass.prototype.update;
  klass.prototype.update = function update(delta) {
    originalUpdate.call(this, delta);
    const lastSmoke = this.lastSmoke || 0;
    this.smokeTrails = this.smokeTrails || [];
    const now = +(new Date());
    if (now - lastSmoke > SMOKE_TIME) {
      const smokeMesh = createSmokeTrail();
      smokeMesh.birthtime = now;
      this.getDirection(tmpVector3).negate().multiplyScalar(1).add(this.position);
      smokeMesh.position.copy(tmpVector3);
      randomizeScale(smokeMesh);
      jitterPosition(smokeMesh);
      const scene = findScene(this);
      if (scene) scene.add(smokeMesh);
      smokeTrail.allTrails.push(smokeMesh);
      this.lastSmoke = now;
    }
  };

  return klass;
}

smokeTrail.allTrails = [];

const OPACITY_CHANGE = -0.02;
const S = 0.0001;
const SCALE_CHANGE = new THREE.Vector3(S, S, S);
const TRAIL_MAX_AGE = 1000;

smokeTrail.update = function update(delta) {
  const now = +(new Date());
  let i = this.allTrails.length;
  while (i--) {
    const trail = this.allTrails[i];
    const trailAge = now - trail.birthtime;
    if (trailAge > TRAIL_MAX_AGE) {
      if (trail.parent) trail.parent.remove(trail);
      this.allTrails.splice(i, 1);
    } else {
      trail.material.opacity += OPACITY_CHANGE;
      trail.scale.add(tmpVector3.copy(SCALE_CHANGE).multiplyScalar(delta));
    }
  }
}

module.exports = smokeTrail;
