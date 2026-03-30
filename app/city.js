// city.js — Dense cyberpunk night city with InstancedMesh, glowing windows, packed layout
import * as THREE from 'three';

const CITY_SIZE = 300;
const ROAD_GAP = 0.4;
const MAX_HEIGHT = 60;
const MIN_HEIGHT = 0.8;
const FILL_DENSITY = 3; // Multiplier for filler buildings

export class City {
  constructor(scene, data) {
    this.scene = scene;
    this.data = data;
    this.buildings = [];
    this.buildingGroup = new THREE.Group();
    this.windowGroup = new THREE.Group();
    this.districtGroup = new THREE.Group();
    this.labelGroup = new THREE.Group();
    this.roadGroup = new THREE.Group();

    this.scene.add(this.buildingGroup);
    this.scene.add(this.windowGroup);
    this.scene.add(this.districtGroup);
    this.scene.add(this.labelGroup);
    this.scene.add(this.roadGroup);

    // Shared materials — visible dark blue buildings with slight sheen
    this.buildingMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a30,
      roughness: 0.5,
      metalness: 0.6,
      emissive: 0x050510,
      emissiveIntensity: 0.3,
    });
    this.windowMat = new THREE.MeshBasicMaterial({
      color: 0xaaccff,
      transparent: true,
      opacity: 1.0,
    });
  }

  build() {
    const files = this.flattenFiles(this.data.tree);
    if (files.length === 0) return;

    const maxLoc = Math.max(...files.map(f => f.metrics?.loc || 1), 100);

    // Layout
    const layout = this.computeTreemap(this.data.tree, 0, 0, CITY_SIZE, CITY_SIZE);

    this.createGround();

    // Merge all buildings into batches for performance
    const buildingGeos = [];
    const windowGeos = [];

    for (const item of layout) {
      if (item.type === 'file') {
        const { geos, wins } = this.buildBuilding(item, maxLoc);
        buildingGeos.push(...geos);
        windowGeos.push(...wins);
      } else if (item.type === 'district') {
        this.createDistrict(item);
      }
    }

    // Add filler buildings to fill gaps and increase density
    const fillerResult = this.generateFillerBuildings(layout);
    buildingGeos.push(...fillerResult.geos);
    windowGeos.push(...fillerResult.wins);

    // Merge building geometries into single mesh for performance
    if (buildingGeos.length > 0) {
      const merged = this.mergeGeometries(buildingGeos);
      const buildingMesh = new THREE.Mesh(merged, this.buildingMat);
      buildingMesh.castShadow = true;
      buildingMesh.receiveShadow = true;
      this.buildingGroup.add(buildingMesh);
    }

    // Merge window geometries
    if (windowGeos.length > 0) {
      const mergedWins = this.mergeGeometries(windowGeos);
      const windowMesh = new THREE.Mesh(mergedWins, this.windowMat);
      this.windowGroup.add(windowMesh);
    }

    // Individual meshes for raycasting (invisible, thin)
    for (const item of layout) {
      if (item.type === 'file') {
        this.createHitbox(item, maxLoc);
      }
    }

    // Roads
    this.createRoads(layout);
  }

  buildBuilding(item, maxLoc) {
    const loc = item.metrics?.loc || 1;
    const height = MIN_HEIGHT + (loc / maxLoc) * MAX_HEIGHT;
    const { x, z, w, d } = item.layout;
    const geos = [];
    const wins = [];

    // Main building body
    const geo = new THREE.BoxGeometry(w - ROAD_GAP, height, d - ROAD_GAP);
    geo.translate(x, height / 2, z);
    geos.push(geo);

    // Rooftop detail (smaller box on top for variety)
    if (height > 8 && Math.random() > 0.4) {
      const roofW = (w - ROAD_GAP) * (0.3 + Math.random() * 0.4);
      const roofD = (d - ROAD_GAP) * (0.3 + Math.random() * 0.4);
      const roofH = height * (0.1 + Math.random() * 0.2);
      const roofGeo = new THREE.BoxGeometry(roofW, roofH, roofD);
      roofGeo.translate(x, height + roofH / 2, z);
      geos.push(roofGeo);
    }

    // Antenna on tall buildings
    if (height > 25 && Math.random() > 0.5) {
      const antennaGeo = new THREE.CylinderGeometry(0.05, 0.05, height * 0.3, 4);
      antennaGeo.translate(x, height + height * 0.15, z);
      geos.push(antennaGeo);
    }

    // Windows — fewer but bigger and brighter for performance
    const bw = w - ROAD_GAP;
    const bd = d - ROAD_GAP;

    if (height > 2) {
      const floorH = 1.5;
      const floors = Math.min(Math.floor(height / floorH), 25);
      const wSize = Math.min(bw * 0.25, 0.4);
      const wCount = Math.max(1, Math.floor(bw / (wSize * 2.5)));

      for (let f = 1; f < floors; f++) {
        const fy = f * floorH;
        // Front face only (z+) — biggest perf win
        for (let wi = 0; wi < wCount; wi++) {
          if (Math.random() > 0.55) continue;
          const wGeo = new THREE.PlaneGeometry(wSize, wSize * 0.7);
          wGeo.translate(x - bw / 2 + (wi + 0.5) * (bw / wCount), fy, z + bd / 2 + 0.03);
          wins.push(wGeo);
        }
        // Right face (x+) — every other floor
        if (f % 2 === 0) {
          const dCount = Math.max(1, Math.floor(bd / (wSize * 2.5)));
          for (let di = 0; di < dCount; di++) {
            if (Math.random() > 0.5) continue;
            const wGeo = new THREE.PlaneGeometry(wSize, wSize * 0.7);
            wGeo.rotateY(Math.PI / 2);
            wGeo.translate(x + bw / 2 + 0.03, fy, z - bd / 2 + (di + 0.5) * (bd / dCount));
            wins.push(wGeo);
          }
        }
      }
    }

    // Store for later
    this.buildings.push({
      data: item,
      position: new THREE.Vector3(x, height / 2, z),
      height,
      mesh: null // will be set by hitbox
    });

    return { geos, wins };
  }

  createHitbox(item, maxLoc) {
    const loc = item.metrics?.loc || 1;
    const height = MIN_HEIGHT + (loc / maxLoc) * MAX_HEIGHT;
    const { x, z, w, d } = item.layout;

    // Invisible hitbox for raycasting
    const geo = new THREE.BoxGeometry(w, height, d);
    const mat = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, height / 2, z);
    mesh.userData = {
      type: 'building',
      name: item.name,
      path: item.path,
      loc: item.metrics?.loc,
      language: item.metrics?.language,
      churn: item.metrics?.churn,
      bug_count: item.metrics?.bug_count,
      last_author: item.metrics?.last_author,
      is_test: item.metrics?.is_test,
      age_days: item.metrics?.age_days,
      height
    };
    this.buildingGroup.add(mesh);

    // Update building reference
    const building = this.buildings.find(b => b.data.path === item.path);
    if (building) building.mesh = mesh;
  }

  generateFillerBuildings(layout) {
    const geos = [];
    const wins = [];
    const occupied = new Set();

    // Mark occupied grid cells
    for (const item of layout) {
      if (item.type === 'file' && item.layout) {
        const { x, z } = item.layout;
        const gx = Math.floor(x / 2);
        const gz = Math.floor(z / 2);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            occupied.add(`${gx + dx},${gz + dz}`);
          }
        }
      }
    }

    // Fill empty spaces densely with ambient buildings
    const gridSize = 1.8;
    const count = Math.floor(CITY_SIZE / gridSize);
    let fillerCount = 0;
    const maxFillers = Math.max(2000, this.buildings.length * 8);

    for (let gx = 1; gx < count - 1; gx++) {
      for (let gz = 1; gz < count - 1; gz++) {
        if (fillerCount >= maxFillers) break;
        const key = `${gx},${gz}`;
        if (occupied.has(key)) continue;
        if (Math.random() > 0.55) continue;

        const x = gx * gridSize + (Math.random() - 0.5) * 0.8;
        const z = gz * gridSize + (Math.random() - 0.5) * 0.8;
        const w = 0.6 + Math.random() * 1.2;
        const d = 0.6 + Math.random() * 1.2;
        // Height distribution: mostly short, some medium, rare tall
        let h = 0.8 + Math.random() * 5;
        if (Math.random() > 0.7) h += Math.random() * 15;
        if (Math.random() > 0.93) h += Math.random() * 35;

        const geo = new THREE.BoxGeometry(w, h, d);
        geo.translate(x, h / 2, z);
        geos.push(geo);

        // Windows for taller fillers
        if (h > 3) {
          const floors = Math.min(Math.floor(h / 1.2), 20);
          for (let f = 1; f < floors; f++) {
            if (Math.random() > 0.5) continue;
            const wGeo = new THREE.PlaneGeometry(0.2, 0.2);
            wGeo.translate(x, f * 1.2, z + d / 2 + 0.02);
            wins.push(wGeo);

            if (Math.random() > 0.5) {
              const wGeo2 = new THREE.PlaneGeometry(0.2, 0.2);
              wGeo2.rotateY(Math.PI / 2);
              wGeo2.translate(x + w / 2 + 0.02, f * 1.2, z);
              wins.push(wGeo2);
            }
          }
        }

        occupied.add(key);
        fillerCount++;
      }
      if (fillerCount >= maxFillers) break;
    }

    return { geos, wins };
  }

  mergeGeometries(geos) {
    // Manual merge: combine all buffer geometries into one
    let totalVerts = 0;
    let totalIndices = 0;
    for (const g of geos) {
      totalVerts += g.attributes.position.count;
      totalIndices += g.index ? g.index.count : g.attributes.position.count;
    }

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const indices = new Uint32Array(totalIndices);

    let vertOffset = 0;
    let indexOffset = 0;
    let vertCount = 0;

    for (const g of geos) {
      const pos = g.attributes.position;
      const norm = g.attributes.normal;

      for (let i = 0; i < pos.count; i++) {
        positions[(vertCount + i) * 3] = pos.getX(i);
        positions[(vertCount + i) * 3 + 1] = pos.getY(i);
        positions[(vertCount + i) * 3 + 2] = pos.getZ(i);
        if (norm) {
          normals[(vertCount + i) * 3] = norm.getX(i);
          normals[(vertCount + i) * 3 + 1] = norm.getY(i);
          normals[(vertCount + i) * 3 + 2] = norm.getZ(i);
        }
      }

      if (g.index) {
        for (let i = 0; i < g.index.count; i++) {
          indices[indexOffset + i] = g.index.getX(i) + vertCount;
        }
        indexOffset += g.index.count;
      } else {
        for (let i = 0; i < pos.count; i++) {
          indices[indexOffset + i] = vertCount + i;
        }
        indexOffset += pos.count;
      }

      vertCount += pos.count;
      g.dispose();
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setIndex(new THREE.BufferAttribute(indices.slice(0, indexOffset), 1));
    merged.computeVertexNormals();
    return merged;
  }

  computeTreemap(nodes, x, y, w, h) {
    const result = [];
    if (!nodes || nodes.length === 0) return result;

    const getValue = (node) => {
      if (node.type === 'file') return Math.max(node.metrics?.loc || 1, 1);
      if (node.children) return node.children.reduce((s, c) => s + getValue(c), 0);
      return 1;
    };

    const totalValue = nodes.reduce((s, n) => s + getValue(n), 0);
    if (totalValue === 0) return result;

    const sorted = [...nodes].sort((a, b) => getValue(b) - getValue(a));
    let remaining = [...sorted];
    let rx = x + ROAD_GAP, ry = y + ROAD_GAP;
    let rw = w - ROAD_GAP * 2, rh = h - ROAD_GAP * 2;

    while (remaining.length > 0) {
      const horizontal = rw >= rh;
      const row = [];
      let rowValue = 0;
      const totalRemaining = remaining.reduce((s, n) => s + getValue(n), 0);

      for (let i = 0; i < remaining.length; i++) {
        row.push(remaining[i]);
        rowValue += getValue(remaining[i]);
        if (rowValue / totalRemaining > 0.4 && row.length > 1) break;
        if (row.length >= Math.ceil(Math.sqrt(remaining.length))) break;
      }

      remaining = remaining.slice(row.length);
      const rowFraction = rowValue / totalRemaining;
      const rowSize = horizontal ? rw * rowFraction : rh * rowFraction;

      let offset = 0;
      const crossSize = horizontal ? rh : rw;

      for (const node of row) {
        const fraction = getValue(node) / rowValue;
        const itemSize = crossSize * fraction;

        const ix = horizontal ? rx : rx + offset;
        const iy = horizontal ? ry + offset : ry;
        const iw = horizontal ? rowSize : itemSize;
        const ih = horizontal ? itemSize : rowSize;

        if (node.type === 'file') {
          result.push({
            type: 'file', ...node,
            layout: { x: ix + iw / 2, z: iy + ih / 2, w: Math.max(iw, 0.5), d: Math.max(ih, 0.5) }
          });
        } else if (node.type === 'directory' && node.children) {
          result.push({ type: 'district', name: node.name, path: node.path, layout: { x: ix, z: iy, w: iw, d: ih } });
          result.push(...this.computeTreemap(node.children, ix, iy, iw, ih));
        }
        offset += itemSize;
      }

      if (horizontal) { rx += rowSize; rw -= rowSize; }
      else { ry += rowSize; rh -= rowSize; }
    }
    return result;
  }

  createGround() {
    const groundGeo = new THREE.PlaneGeometry(CITY_SIZE + 100, CITY_SIZE + 100);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x080810,
      roughness: 0.95,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(CITY_SIZE / 2, -0.01, CITY_SIZE / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Very faint grid — almost invisible
    const grid = new THREE.GridHelper(CITY_SIZE + 100, 150, 0x0c0c18, 0x08080f);
    grid.position.set(CITY_SIZE / 2, 0.01, CITY_SIZE / 2);
    grid.material.opacity = 0.15;
    grid.material.transparent = true;
    this.scene.add(grid);
  }

  createDistrict(item) {
    const { x, z, w, d } = item.layout;
    if (w > 8 && d > 8) {
      const label = this.createLabel(item.name, x + w / 2, 1, z + d / 2);
      this.labelGroup.add(label);
    }
  }

  createLabel(text, x, y, z) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 64);
    ctx.fillStyle = '#4466aa';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text.toUpperCase().slice(0, 20), 256, 40);
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.5 });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(12, 1.5, 1);
    return sprite;
  }

  createRoads(layout) {
    const filePositions = {};
    for (const item of layout) {
      if (item.type === 'file' && item.layout) filePositions[item.path] = item.layout;
    }
    const deps = (this.data.dependencies || []).slice(0, 300);
    const roadMat = new THREE.LineBasicMaterial({ color: 0x223355, transparent: true, opacity: 0.08 });

    for (const dep of deps) {
      const from = filePositions[dep.from];
      const to = filePositions[dep.to];
      if (!from || !to) continue;
      const mid = new THREE.Vector3((from.x + to.x) / 2, 3, (from.z + to.z) / 2);
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(from.x, 0.2, from.z), mid,
        new THREE.Vector3(to.x, 0.2, to.z)
      );
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(16));
      this.roadGroup.add(new THREE.Line(geo, roadMat));
    }
  }

  update(time) {
    // Animate window glow
    if (this.windowGroup.children[0]) {
      this.windowGroup.children[0].material.opacity = 0.7 + 0.2 * Math.sin(time * 0.5);
      // Shift window color slightly over time
      const hue = 0.6 + 0.05 * Math.sin(time * 0.3);
      this.windowGroup.children[0].material.color.setHSL(hue, 0.5, 0.7);
    }
  }

  getBuildingAt(raycaster) {
    const intersects = raycaster.intersectObjects(this.buildingGroup.children, false);
    for (const hit of intersects) {
      if (hit.object.userData?.type === 'building') return hit.object;
    }
    return null;
  }

  flattenFiles(nodes, result = []) {
    if (!nodes) return result;
    for (const node of nodes) {
      if (node.type === 'file') result.push(node);
      else if (node.children) this.flattenFiles(node.children, result);
    }
    return result;
  }
}
