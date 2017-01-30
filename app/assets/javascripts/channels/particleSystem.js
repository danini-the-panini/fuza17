const THREE = require('three');

const tmpVector3 = new THREE.Vector3();

module.exports = class ParticleSystem extends THREE.Object3D {
  static GEOM = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  static GRAVITY = 0.00001;

  constructor() {
    super();
    this.particles = [];
  }

  getParticle(material) {
    for (let i = 0; i < this.particles.length; i++) {
      if (!this.particles[i].object.visible) {
        this.particles[i].object.visible = true;
        this.particles[i].object.material = material;
        return this.particles[i];
      }
    }
    const particle = {
      object: new THREE.Mesh(ParticleSystem.GEOM, material),
      velocity: new THREE.Vector3()
    };
    particle.object.receiveShadow = true;
    particle.object.castShadow = true;
    this.add(particle.object);
    this.particles.push(particle);
    return particle;
  }

  createExplosion(material, position, minSpeed = 0.002, maxSpeed = 0.006, limit = 500) {
    const speedRange = maxSpeed - minSpeed;
    for (let i = 0; i < limit; i ++) {
      const particle = this.getParticle(material);
      const speed = minSpeed + (Math.random() * speedRange);
      particle.object.position.copy(position);
      particle.velocity.set(
        -1.0 + (Math.random() * 2.0),
        -1.0 + (Math.random() * 2.0),
        0.0 + (Math.random() * 1.0)
      ).normalize().multiplyScalar(speed);
    }
  }

  update(delta) {
    this.particles.forEach(function(particle) {
      if (particle.object.visible) {
        tmpVector3.copy(particle.velocity).multiplyScalar(delta);
        particle.object.position.add(tmpVector3);
        particle.velocity.z -= ParticleSystem.GRAVITY * delta;
        if (particle.object.position.z < 0) {
          particle.object.visible = false;
        }
      }
    });
  }
}
