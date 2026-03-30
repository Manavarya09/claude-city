// effects.js — Fire, sparkles, rockets, day/night cycle, atmosphere
import * as THREE from 'three';

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.fires = [];
    this.sparkles = [];
    this.rockets = [];
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.skyColor = new THREE.Color(0x0a0a1a);
  }

  // --- Fire (bugs) ---
  addFire(x, y, z, intensity = 1) {
    const count = Math.floor(20 * intensity);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x + (Math.random() - 0.5) * 1.5;
      positions[i * 3 + 1] = y + Math.random() * 2;
      positions[i * 3 + 2] = z + (Math.random() - 0.5) * 1.5;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.3 + Math.random() * 0.4;
      colors[i * 3 + 2] = 0;
      sizes[i] = 0.2 + Math.random() * 0.3;
      velocities.push({ vy: 1 + Math.random() * 2, life: Math.random() });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.group.add(points);

    // Fire light
    const light = new THREE.PointLight(0xff4400, 2 * intensity, 8);
    light.position.set(x, y + 1, z);
    this.group.add(light);

    this.fires.push({ points, light, baseX: x, baseY: y, baseZ: z, velocities, count });
  }

  // --- Sparkles (new features) ---
  addSparkle(x, y, z) {
    const count = 15;
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      velocities.push({
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        vz: (Math.random() - 0.5) * 3,
        life: Math.random()
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.3,
      color: 0x00ff88,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.group.add(points);
    this.sparkles.push({ points, baseX: x, baseY: y, baseZ: z, velocities, count, time: 0 });
  }

  // --- Rockets (deploys) ---
  launchRocket(x, z) {
    const rocketGeo = new THREE.ConeGeometry(0.3, 1, 6);
    const rocketMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const rocket = new THREE.Mesh(rocketGeo, rocketMat);
    rocket.position.set(x, 0, z);

    // Exhaust trail
    const trailCount = 30;
    const trailPositions = new Float32Array(trailCount * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({
      size: 0.5,
      color: 0xff8800,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const trail = new THREE.Points(trailGeo, trailMat);

    // Rocket light
    const light = new THREE.PointLight(0xff6600, 5, 15);
    light.position.copy(rocket.position);

    this.group.add(rocket);
    this.group.add(trail);
    this.group.add(light);

    this.rockets.push({
      mesh: rocket, trail, light,
      y: 0, speed: 15, baseX: x, baseZ: z,
      trailPositions, trailIndex: 0, trailCount,
      alive: true
    });
  }

  // --- Atmosphere ---
  createAtmosphere() {
    // Ambient light (dim for night city)
    const ambient = new THREE.AmbientLight(0x222244, 0.4);
    this.scene.add(ambient);

    // Directional "moonlight"
    const moon = new THREE.DirectionalLight(0x4466aa, 0.3);
    moon.position.set(50, 80, 30);
    moon.castShadow = true;
    moon.shadow.mapSize.width = 2048;
    moon.shadow.mapSize.height = 2048;
    moon.shadow.camera.near = 0.5;
    moon.shadow.camera.far = 200;
    moon.shadow.camera.left = -100;
    moon.shadow.camera.right = 100;
    moon.shadow.camera.top = 100;
    moon.shadow.camera.bottom = -100;
    this.scene.add(moon);

    // Hemisphere light for sky colors
    const hemi = new THREE.HemisphereLight(0x1a1a3e, 0x0a0a15, 0.3);
    this.scene.add(hemi);

    // Fog for depth
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.003);

    // Starfield
    this.createStars();
  }

  createStars() {
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 400;
      positions[i * 3 + 1] = 50 + Math.random() * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ size: 0.3, color: 0xffffff, transparent: true, opacity: 0.6 });
    const stars = new THREE.Points(geo, mat);
    this.scene.add(stars);
    this.stars = stars;
  }

  // --- Update Loop ---
  update(time, delta) {
    // Update fires
    for (const fire of this.fires) {
      const positions = fire.points.geometry.attributes.position.array;
      for (let i = 0; i < fire.count; i++) {
        const v = fire.velocities[i];
        v.life += delta;
        if (v.life > 1) {
          // Reset particle
          positions[i * 3] = fire.baseX + (Math.random() - 0.5) * 1.5;
          positions[i * 3 + 1] = fire.baseY;
          positions[i * 3 + 2] = fire.baseZ + (Math.random() - 0.5) * 1.5;
          v.life = 0;
        } else {
          positions[i * 3 + 1] += v.vy * delta;
          positions[i * 3] += (Math.random() - 0.5) * delta * 2;
        }
      }
      fire.points.geometry.attributes.position.needsUpdate = true;
      fire.light.intensity = 1.5 + Math.sin(time * 8) * 0.5;
    }

    // Update sparkles
    for (const sparkle of this.sparkles) {
      sparkle.time += delta;
      const positions = sparkle.points.geometry.attributes.position.array;
      for (let i = 0; i < sparkle.count; i++) {
        const v = sparkle.velocities[i];
        v.life += delta;
        if (v.life > 2) {
          positions[i * 3] = sparkle.baseX;
          positions[i * 3 + 1] = sparkle.baseY;
          positions[i * 3 + 2] = sparkle.baseZ;
          v.life = 0;
          v.vy = 2 + Math.random() * 4;
        } else {
          positions[i * 3] += v.vx * delta;
          positions[i * 3 + 1] += v.vy * delta;
          positions[i * 3 + 2] += v.vz * delta;
          v.vy -= 3 * delta; // gravity
        }
      }
      sparkle.points.geometry.attributes.position.needsUpdate = true;
      sparkle.points.material.opacity = Math.max(0, 0.9 - sparkle.time * 0.1);
    }

    // Update rockets
    for (const rocket of this.rockets) {
      if (!rocket.alive) continue;
      rocket.y += rocket.speed * delta;
      rocket.mesh.position.y = rocket.y;
      rocket.light.position.y = rocket.y;

      // Trail
      const tp = rocket.trailPositions;
      const idx = (rocket.trailIndex % rocket.trailCount) * 3;
      tp[idx] = rocket.baseX + (Math.random() - 0.5) * 0.5;
      tp[idx + 1] = rocket.y - 0.5;
      tp[idx + 2] = rocket.baseZ + (Math.random() - 0.5) * 0.5;
      rocket.trailIndex++;
      rocket.trail.geometry.attributes.position.needsUpdate = true;

      // Remove when out of view
      if (rocket.y > 100) {
        this.group.remove(rocket.mesh);
        this.group.remove(rocket.trail);
        this.group.remove(rocket.light);
        rocket.alive = false;
      }
    }

    // Twinkle stars
    if (this.stars) {
      this.stars.material.opacity = 0.4 + 0.2 * Math.sin(time * 0.5);
    }
  }

  // --- Public API ---
  addBugFires(buildings) {
    for (const b of buildings) {
      if (b.data.metrics?.bug_count > 0) {
        const pos = b.mesh.position;
        const height = b.data.metrics.loc ? b.mesh.userData.height : 2;
        this.addFire(pos.x, height, pos.z, Math.min(b.data.metrics.bug_count / 3, 2));
      }
    }
  }

  addNewFeatureSparkles(buildings) {
    for (const b of buildings) {
      if (b.data.metrics?.age_days < 3) {
        const pos = b.mesh.position;
        this.addSparkle(pos.x, b.mesh.userData.height + 1, pos.z);
      }
    }
  }
}
