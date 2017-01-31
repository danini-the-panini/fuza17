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

const SJMIN = 0.2;
const SJMAX = 0.4;
function rando(min, max) {
  const range = max - min;
  return Math.random() * range + min;
}

function randomizeScale(object, sjmin, sjmax) {
  const scale = rando(sjmin, sjmax);
  object.scale.set(scale, scale, scale);
}

const PJMIN = -0.1;
const PJMAX = 0.1;
function jitterPosition(object, pjmin, pjmax) {
  tmpVector3.set(rando(pjmin, pjmax), rando(pjmin, pjmax), rando(pjmin, pjmax));
  object.position.add(tmpVector3);
}

function getProp(object, key, defaultValue = null) {
  if (typeof object[key] === 'undefined') return defaultValue;
  return object[key];
}

const SCALE_CHANGE = 0.0001;
const TRAIL_MAX_AGE = 1000;

function smokeTrail(klass, options = {}) {
  const pjmin = getProp(options, 'pjmin', PJMIN);
  const pjmax = getProp(options, 'pjmax', PJMAX);

  const sjmin = getProp(options, 'sjmin', SJMIN);
  const sjmax = getProp(options, 'sjmax', SJMAX);

  const spawnTime = getProp(options, 'spawnTime', SMOKE_TIME);
  const distance = getProp(options, 'distance', 1);

  const opacityChange = getProp(options, 'opacityChange', true);
  const s = getProp(options, 'scaleChange', SCALE_CHANGE);
  const scaleChange = new THREE.Vector3(s, s, s);

  const maxAge = getProp(options, 'maxAge', TRAIL_MAX_AGE);

  const originalUpdate = klass.prototype.update;
  klass.prototype.update = function update(delta) {
    originalUpdate.call(this, delta);
    const lastSmoke = this.lastSmoke || 0;
    this.smokeTrails = this.smokeTrails || [];
    const now = +(new Date());
    if (now - lastSmoke > spawnTime) {
      const smokeMesh = createSmokeTrail();
      smokeMesh._birthtime = now;
      smokeMesh._opacityChange = opacityChange;
      smokeMesh._scaleChange = scaleChange;
      smokeMesh._maxAge = maxAge;

      this.getDirection(tmpVector3).negate().multiplyScalar(distance).add(this.position);
      smokeMesh.position.copy(tmpVector3);
      randomizeScale(smokeMesh, sjmin, sjmax);
      jitterPosition(smokeMesh, pjmin, pjmax);
      const scene = findScene(this);
      if (scene) scene.add(smokeMesh);
      smokeTrail.allTrails.push(smokeMesh);
      this.lastSmoke = now;
    }
  };

  return klass;
}

smokeTrail.allTrails = [];

smokeTrail.update = function update(delta) {
  const now = +(new Date());
  let i = this.allTrails.length;
  while (i--) {
    const trail = this.allTrails[i];
    const trailAge = now - trail._birthtime;
    if (trailAge > trail._maxAge) {
      if (trail.parent) trail.parent.remove(trail);
      this.allTrails.splice(i, 1);
    } else {
      if (trail._opacityChange) {
        trail.material.opacity = 1 - trailAge / trail._maxAge;
      }
      trail.scale.add(tmpVector3.copy(trail._scaleChange).multiplyScalar(delta));
    }
  }
}

module.exports = smokeTrail;
