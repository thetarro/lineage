// Era-appropriate life sharing the world with the player: low-poly builders for
// prehistoric animals and plants, and which of them live in each era and habitat.
// Every builder returns a Group facing +z with its base/belly at y = 0.

import * as THREE from 'three';

const { PI } = Math;
const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, ...opts });
const sphere = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cyl = (rt, rb, h, s = 6) => new THREE.CylinderGeometry(rt, rb, h, s);
const cone = (r, h, s = 5) => new THREE.ConeGeometry(r, h, s);
const dome = (r) => new THREE.SphereGeometry(r, 10, 4, 0, PI * 2, 0, PI / 2);

/** Add a mesh to `parent` positioned/rotated/scaled by arrays. */
function part(parent, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.scale.set(...scale);
  parent.add(m);
  return m;
}

function legs(g, material, { x, zs, top, len, r = 0.06 }) {
  for (const z of zs) for (const side of [-1, 1]) part(g, cyl(r, r * 0.8, len), material, [side * x, top - len / 2, z]);
}

function wings(g, material, { span, depth, y = 0, z = 0, x = 0.05 }) {
  g.userData.wings = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * x, y, z);
    pivot.userData.side = side;
    part(pivot, box(span, 0.02, depth), material, [side * span / 2, 0, 0]);
    g.add(pivot);
    g.userData.wings.push(pivot);
  }
}

function fishTail(g, material, z, size) {
  part(g, cone(size * 0.5, size, 4), material, [0, size * 0.25, z], [-PI / 2 - 0.5, 0, 0], [0.2, 1, 1]);
  part(g, cone(size * 0.5, size, 4), material, [0, -size * 0.25, z], [-PI / 2 + 0.5, 0, 0], [0.2, 1, 1]);
}

// ── Builders ────────────────────────────────────────────────────────────

const B = {
  bacterium() {
    const g = new THREE.Group();
    part(g, new THREE.CapsuleGeometry(0.08, 0.25, 3, 6), mat(0xd9a0c0, { transparent: true, opacity: 0.85 }), [0, 0, 0], [PI / 2, 0, 0]);
    return g;
  },
  cyanobacteria() {
    const g = new THREE.Group();
    const m = mat(0x3fae5a);
    for (let i = 0; i < 7; i++) part(g, sphere(0.07, 6, 4), m, [Math.sin(i) * 0.04, 0, (i - 3) * 0.13]);
    return g;
  },
  stromatolite() {
    const g = new THREE.Group();
    const [a, b] = [mat(0x6b7a4a), mat(0x8a8a5a)];
    part(g, cyl(0.6, 0.8, 0.4, 9), a, [0, 0.2, 0]);
    part(g, cyl(0.45, 0.6, 0.35, 9), b, [0, 0.55, 0]);
    part(g, cyl(0.25, 0.45, 0.3, 9), a, [0, 0.85, 0]);
    return g;
  },
  dickinsonia() {
    const g = new THREE.Group();
    part(g, sphere(0.5, 10, 6), mat(0xc9a27a), [0, 0.04, 0], [0, 0, 0], [1, 0.12, 1.4]);
    const rib = mat(0x9a7450);
    for (let i = 0; i < 9; i++) {
      const z = (i - 4) * 0.14;
      const w = Math.sqrt(Math.max(0, 1 - (z / 0.68) ** 2));
      part(g, box(0.9 * w, 0.03, 0.03), rib, [0, 0.1, z]);
    }
    return g;
  },
  charnia() {
    const g = new THREE.Group();
    const m = mat(0xb8956a);
    part(g, cyl(0.03, 0.04, 0.4), m, [0, 0.2, 0]);
    part(g, sphere(0.3), m, [0, 1.05, 0], [0, 0, 0], [0.5, 2.2, 0.15]);
    return g;
  },
  jellyfish() {
    const g = new THREE.Group();
    const m = mat(0xc8a2ff, { transparent: true, opacity: 0.6, emissive: 0x6040a0, emissiveIntensity: 0.4 });
    part(g, dome(0.35), m);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      part(g, cyl(0.01, 0.01, 0.7, 3), m, [Math.cos(a) * 0.2, -0.35, Math.sin(a) * 0.2]);
    }
    return g;
  },
  sponge() {
    const g = new THREE.Group();
    const m = mat(0xd9b64c, { side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const h = 0.5 + Math.random() * 0.7;
      part(g, new THREE.CylinderGeometry(0.2, 0.14, h, 8, 1, true), m, [(i - 1) * 0.25, h / 2, (i % 2) * 0.2]);
    }
    return g;
  },
  trilobite() {
    const g = new THREE.Group();
    const m = mat(0x7a6a58);
    part(g, sphere(0.3, 8, 6), m, [0, 0.08, 0], [0, 0, 0], [1, 0.3, 1.4]);
    part(g, dome(0.32), mat(0x6a5a48), [0, 0.04, 0.32], [0, 0, 0], [1.1, 0.35, 0.6]);
    part(g, box(0.12, 0.08, 0.75), mat(0x5a4a3a), [0, 0.14, 0]);
    for (let i = 0; i < 5; i++) part(g, box(0.55, 0.03, 0.04), mat(0x5a4a3a), [0, 0.13, -0.3 + i * 0.11]);
    for (const s of [-1, 1]) part(g, sphere(0.04, 5, 4), mat(0x111111), [s * 0.15, 0.16, 0.36]);
    return g;
  },
  anomalocaris() {
    const g = new THREE.Group();
    const body = mat(0xc0503a), flap = mat(0xd8704f);
    part(g, sphere(0.4, 10, 6), body, [0, 0, 0], [0, 0, 0], [0.8, 0.35, 2.2]);
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
      part(g, box(0.45, 0.02, 0.2), flap, [s * 0.38, 0, -0.55 + i * 0.22], [0, 0, s * 0.15]);
    }
    for (const s of [-1, 1]) {
      part(g, cone(0.2, 0.5, 4), flap, [s * 0.12, 0, -0.95], [-PI / 2, 0, s * 0.4], [1, 1, 0.15]);
      part(g, new THREE.TorusGeometry(0.18, 0.04, 4, 8, PI * 1.3), body, [s * 0.12, -0.12, 0.95], [0, PI / 2, 0]);
      part(g, cyl(0.015, 0.015, 0.2, 3), body, [s * 0.2, 0.15, 0.7]);
      part(g, sphere(0.07, 6, 4), mat(0x111111), [s * 0.2, 0.26, 0.7]);
    }
    return g;
  },
  opabinia() {
    const g = new THREE.Group();
    const m = mat(0x8a6a8a);
    part(g, sphere(0.2, 8, 6), m, [0, 0, 0], [0, 0, 0], [0.7, 0.5, 2]);
    for (let i = 0; i < 5; i++) part(g, sphere(0.045, 5, 4), mat(0x111111), [(i - 2) * 0.06, 0.1, 0.3 + (i % 2) * 0.04]);
    part(g, cyl(0.02, 0.02, 0.5, 4), m, [0, -0.05, 0.6], [PI / 2, 0, 0]);
    part(g, sphere(0.05, 5, 4), m, [0, -0.05, 0.86]);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) part(g, box(0.2, 0.01, 0.1), m, [s * 0.18, 0, -0.25 + i * 0.13]);
    return g;
  },
  hallucigenia() {
    const g = new THREE.Group();
    const m = mat(0xe0a0a0);
    part(g, cyl(0.05, 0.05, 0.8), m, [0, 0.3, 0], [PI / 2, 0, 0]);
    for (let i = 0; i < 7; i++) {
      const z = -0.35 + i * 0.11;
      part(g, cone(0.02, 0.18, 3), mat(0xf0e0d0), [0, 0.42, z]);
      for (const s of [-1, 1]) part(g, cyl(0.012, 0.012, 0.28, 3), m, [s * 0.04, 0.14, z]);
    }
    return g;
  },
  pikaia() {
    const g = new THREE.Group();
    const m = mat(0xa0b8c0);
    part(g, sphere(0.12, 8, 5), m, [0, 0, 0], [0, 0, 0], [0.5, 0.8, 4]);
    fishTail(g, m, -0.5, 0.2);
    return g;
  },
  eurypterid() {
    const g = new THREE.Group();
    const m = mat(0x6a5a48);
    for (let i = 0; i < 6; i++) part(g, sphere(0.3 - i * 0.035, 8, 5), m, [0, 0.1, 0.4 - i * 0.24], [0, 0, 0], [1, 0.3, 0.8]);
    part(g, cone(0.06, 0.6, 4), mat(0x4a3a28), [0, 0.1, -1.2], [-PI / 2, 0, 0]);
    part(g, dome(0.32), mat(0x5a4a38), [0, 0.08, 0.55], [0, 0, 0], [1, 0.4, 0.8]);
    for (const s of [-1, 1]) part(g, box(0.5, 0.02, 0.18), m, [s * 0.4, 0.08, 0.15], [0, s * 0.4, 0]);
    return g;
  },
  orthocone() {
    const g = new THREE.Group();
    part(g, cone(0.25, 2.4, 8), mat(0xd8c8a8), [0, 0, -1.2], [-PI / 2, 0, 0]);
    for (let i = 0; i < 4; i++) part(g, new THREE.TorusGeometry(0.2 - i * 0.04, 0.02, 4, 10), mat(0x9a7a5a), [0, 0, -0.3 - i * 0.45]);
    const t = mat(0xc08070);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      part(g, cyl(0.02, 0.01, 0.5, 3), t, [Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.25], [PI / 2, 0, 0]);
    }
    return g;
  },
  dunkleosteus() {
    const g = new THREE.Group();
    const m = mat(0x5a6a7a), armor = mat(0x3a3a44);
    part(g, sphere(0.6, 10, 6), m, [0, 0, -0.3], [0, 0, 0], [0.8, 0.9, 2.2]);
    part(g, box(0.9, 0.8, 0.7), armor, [0, 0.05, 1.0]);
    part(g, box(0.85, 0.12, 0.5), mat(0xd8d0c0), [0, -0.3, 1.25]);
    part(g, cone(0.3, 0.6, 3), m, [0, 0.6, -0.2], [0, 0, 0], [0.3, 1, 1.5]);
    fishTail(g, m, -1.6, 0.9);
    return g;
  },
  ostracoderm() {
    const g = new THREE.Group();
    part(g, sphere(0.15, 8, 5), mat(0x8a8a70), [0, 0, 0], [0, 0, 0], [0.8, 0.6, 2.2]);
    part(g, dome(0.18), mat(0x5a5a48), [0, 0, 0.18], [0, 0, 0], [1.1, 0.6, 1.3]);
    fishTail(g, mat(0x8a8a70), -0.35, 0.2);
    return g;
  },
  crinoid() {
    const g = new THREE.Group();
    const m = mat(0xb07a8a), arm = mat(0xd08aa0);
    part(g, cyl(0.04, 0.05, 1.4), m, [0, 0.7, 0]);
    part(g, sphere(0.12), m, [0, 1.45, 0]);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      part(g, cone(0.04, 0.6, 3), arm, [Math.cos(a) * 0.18, 1.7, Math.sin(a) * 0.18], [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]);
    }
    return g;
  },
  cooksonia() {
    const g = new THREE.Group();
    const m = mat(0x5a8a3a), spore = mat(0xb08a3a);
    for (let i = 0; i < 4; i++) {
      const stem = new THREE.Group();
      stem.position.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3);
      stem.rotation.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4);
      part(stem, cyl(0.015, 0.02, 0.3, 3), m, [0, 0.15, 0]);
      for (const s of [-1, 1]) {
        part(stem, cyl(0.012, 0.012, 0.22, 3), m, [s * 0.05, 0.38, 0], [0, 0, -s * 0.45]);
        part(stem, sphere(0.04, 5, 4), spore, [s * 0.1, 0.48, 0]);
      }
      g.add(stem);
    }
    return g;
  },
  moss() {
    const g = new THREE.Group();
    part(g, sphere(0.6, 8, 4), mat(0x4a7a2a), [0, 0, 0], [0, 0, 0], [1, 0.15, 1]);
    part(g, sphere(0.4, 8, 4), mat(0x5a8a32), [0.4, 0, 0.2], [0, 0, 0], [1, 0.2, 1]);
    return g;
  },
  millipede() {
    const g = new THREE.Group();
    const m = mat(0x3a2a20), l = mat(0x6a4a30);
    for (let i = 0; i < 10; i++) {
      part(g, sphere(0.08, 6, 4), m, [0, 0.1, (i - 4.5) * 0.12]);
      for (const s of [-1, 1]) part(g, cyl(0.01, 0.01, 0.12, 3), l, [s * 0.08, 0.04, (i - 4.5) * 0.12], [0, 0, s * 0.6]);
    }
    return g;
  },
  stethacanthus() {
    const g = new THREE.Group();
    const m = mat(0x6a7a86);
    part(g, sphere(0.4, 10, 6), m, [0, 0, 0], [0, 0, 0], [0.7, 0.75, 2.4]);
    part(g, cyl(0.12, 0.05, 0.4, 5), m, [0, 0.4, 0.1]);
    part(g, box(0.15, 0.08, 0.4), mat(0x3a3a40), [0, 0.6, 0.1]);
    for (const s of [-1, 1]) part(g, box(0.4, 0.03, 0.2), m, [s * 0.3, -0.15, 0.3], [0, 0, s * -0.3]);
    fishTail(g, m, -1.05, 0.6);
    return g;
  },
  ammonite() {
    const g = new THREE.Group();
    const shell = mat(0xc8a070);
    part(g, new THREE.TorusGeometry(0.28, 0.14, 6, 14), shell, [0, 0, 0], [0, PI / 2, 0]);
    part(g, new THREE.TorusGeometry(0.12, 0.07, 6, 10), mat(0xa88050), [0, 0, 0], [0, PI / 2, 0]);
    const t = mat(0xd09080);
    for (let i = 0; i < 6; i++) part(g, cyl(0.015, 0.01, 0.35, 3), t, [(i - 2.5) * 0.04, -0.3, 0.35], [PI / 2 - 0.3, 0, 0]);
    return g;
  },
  coelacanth() {
    const g = new THREE.Group();
    const m = mat(0x3a5a8a);
    part(g, sphere(0.35, 10, 6), m, [0, 0, 0], [0, 0, 0], [0.7, 0.9, 2]);
    for (let i = 0; i < 8; i++) part(g, sphere(0.04, 4, 3), mat(0xe0e8f0), [(i % 2 ? 1 : -1) * 0.24, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 1.1]);
    for (const s of [-1, 1]) part(g, sphere(0.1, 6, 4), m, [s * 0.25, -0.2, 0.2], [0, 0, 0], [0.5, 0.5, 1.6]);
    fishTail(g, m, -0.8, 0.5);
    return g;
  },
  lepidodendron() {
    const g = new THREE.Group();
    part(g, cyl(0.25, 0.4, 7, 7), mat(0x5a5040), [0, 3.5, 0]);
    const tuft = mat(0x2e5a2e), wood = mat(0x5a5040);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2;
      part(g, cyl(0.1, 0.12, 1.2, 5), wood, [Math.cos(a) * 0.4, 7.3, Math.sin(a) * 0.4], [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7]);
      part(g, cone(0.5, 1.2, 6), tuft, [Math.cos(a) * 0.9, 7.9, Math.sin(a) * 0.9], [PI, 0, 0]);
    }
    return g;
  },
  calamites() {
    const g = new THREE.Group();
    const m = mat(0x5a8a4a), leaf = mat(0x3a6a2a);
    part(g, cyl(0.1, 0.12, 3, 6), m, [0, 1.5, 0]);
    for (let n = 1; n <= 5; n++) {
      part(g, new THREE.TorusGeometry(0.12, 0.03, 4, 8), mat(0x3a5a2a), [0, n * 0.55, 0], [PI / 2, 0, 0]);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * PI * 2;
        part(g, cone(0.03, 0.5, 3), leaf, [Math.cos(a) * 0.25, n * 0.55, Math.sin(a) * 0.25], [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2]);
      }
    }
    return g;
  },
  treeFern() {
    const g = new THREE.Group();
    part(g, cyl(0.15, 0.2, 2.2), mat(0x5a4030), [0, 1.1, 0]);
    const frond = mat(0x3a7a3a);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      const f = new THREE.Group();
      f.position.y = 2.2;
      f.rotation.set(0, a, 0);
      part(f, sphere(0.3, 6, 4), frond, [0, -0.1, 0.8], [0.35, 0, 0], [0.3, 0.06, 2.6]);
      g.add(f);
    }
    return g;
  },
  meganeura() {
    const g = new THREE.Group();
    part(g, cyl(0.04, 0.03, 0.9, 5), mat(0x2a6a8a), [0, 0, -0.1], [PI / 2, 0, 0]);
    part(g, sphere(0.07, 6, 4), mat(0x1a3a5a), [0, 0, 0.38]);
    wings(g, mat(0xcde6f0, { transparent: true, opacity: 0.5, side: THREE.DoubleSide }), { span: 0.75, depth: 0.15, z: 0.12 });
    return g;
  },
  arthropleura() {
    const g = new THREE.Group();
    for (let i = 0; i < 12; i++) part(g, box(0.5, 0.08, 0.2), mat(i % 2 ? 0x4a3a30 : 0x5a4a3a), [0, 0.12, (i - 5.5) * 0.21]);
    legs(g, mat(0x6a5a48), { x: 0.24, zs: [-1, -0.5, 0, 0.5, 1], top: 0.12, len: 0.15, r: 0.025 });
    return g;
  },
  eryops() {
    const g = new THREE.Group();
    const m = mat(0x6a7a4a);
    part(g, sphere(0.4, 8, 6), m, [0, 0.35, 0], [0, 0, 0], [1, 0.5, 1.8]);
    part(g, sphere(0.3, 8, 5), m, [0, 0.38, 0.8], [0, 0, 0], [1.3, 0.45, 1.1]);
    part(g, cone(0.15, 1, 5), m, [0, 0.3, -1.1], [-PI / 2, 0, 0]);
    legs(g, mat(0x5a6a3a), { x: 0.4, zs: [-0.4, 0.4], top: 0.3, len: 0.3, r: 0.07 });
    return g;
  },
  ichthyosaur() {
    const g = new THREE.Group();
    const m = mat(0x5a7aa0);
    part(g, sphere(0.45, 10, 6), m, [0, 0, 0], [0, 0, 0], [0.7, 0.8, 2.4]);
    part(g, cone(0.12, 0.8, 5), m, [0, 0, 1.4], [PI / 2, 0, 0]);
    part(g, cone(0.25, 0.5, 3), m, [0, 0.45, 0], [0, 0, 0], [0.3, 1, 1.4]);
    for (const s of [-1, 1]) part(g, box(0.5, 0.03, 0.2), m, [s * 0.35, -0.2, 0.4], [0, s * 0.3, s * -0.3]);
    fishTail(g, m, -1.15, 0.8);
    return g;
  },
  plesiosaur() {
    const g = new THREE.Group();
    const m = mat(0x6a8a7a);
    part(g, sphere(0.6, 10, 6), m, [0, 0, 0], [0, 0, 0], [1, 0.6, 1.6]);
    for (let i = 0; i < 7; i++) part(g, sphere(0.16 - i * 0.012, 6, 4), m, [0, i * 0.12, 0.95 + i * 0.2]);
    part(g, sphere(0.14, 6, 4), m, [0, 0.9, 2.4], [0, 0, 0], [1, 0.8, 1.6]);
    for (const s of [-1, 1]) for (const z of [-0.5, 0.5]) part(g, box(0.9, 0.04, 0.25), m, [s * 0.75, -0.1, z], [0, s * 0.3, s * -0.2]);
    part(g, cone(0.2, 0.8, 5), m, [0, 0, -1.2], [-PI / 2, 0, 0]);
    return g;
  },
  sauropod() {
    const g = new THREE.Group();
    const m = mat(0x8a8a6a);
    part(g, sphere(1, 10, 8), m, [0, 2.6, 0], [0, 0, 0], [1, 0.9, 1.6]);
    legs(g, mat(0x7a7a5a), { x: 0.6, zs: [-0.9, 0.9], top: 2.2, len: 2.2, r: 0.28 });
    part(g, cyl(0.22, 0.38, 3.4, 7), m, [0, 4.2, 2.3], [0.75, 0, 0]);
    part(g, sphere(0.3, 8, 6), m, [0, 5.5, 3.6], [0, 0, 0], [0.9, 0.8, 1.4]);
    part(g, cone(0.4, 4, 7), m, [0, 2.3, -3.2], [-PI / 2 - 0.15, 0, 0]);
    return g;
  },
  theropod() {
    const g = new THREE.Group();
    const m = mat(0x6a5a3a);
    part(g, sphere(0.6, 10, 6), m, [0, 1.8, 0], [-0.2, 0, 0], [0.8, 0.8, 1.6]);
    part(g, box(0.45, 0.5, 0.85), m, [0, 2.4, 1.1]);
    for (let i = 0; i < 4; i++) part(g, cone(0.03, 0.1, 3), mat(0xffffff), [(i - 1.5) * 0.08, 2.12, 1.45], [PI, 0, 0]);
    part(g, cone(0.35, 2.2, 6), m, [0, 1.8, -1.8], [-PI / 2, 0, 0]);
    legs(g, mat(0x5a4a2a), { x: 0.3, zs: [-0.1], top: 1.5, len: 1.5, r: 0.15 });
    for (const s of [-1, 1]) part(g, cyl(0.04, 0.03, 0.35, 4), m, [s * 0.3, 1.8, 0.75], [0.8, 0, 0]);
    return g;
  },
  triceratops() {
    const g = new THREE.Group();
    const m = mat(0x7a6a50), horn = mat(0xe8dcc0);
    part(g, sphere(0.8, 10, 6), m, [0, 1.3, 0], [0, 0, 0], [1, 0.8, 1.5]);
    part(g, sphere(0.4, 8, 6), m, [0, 1.2, 1.35], [0, 0, 0], [1, 0.9, 1.2]);
    part(g, dome(0.75), mat(0x9a5a40), [0, 1.45, 1.1], [-1.1, 0, 0], [1, 1, 0.15]);
    for (const s of [-1, 1]) part(g, cone(0.07, 0.7, 5), horn, [s * 0.2, 1.65, 1.6], [1.2, 0, 0]);
    part(g, cone(0.06, 0.3, 5), horn, [0, 1.3, 1.85], [1, 0, 0]);
    legs(g, mat(0x6a5a40), { x: 0.5, zs: [-0.7, 0.7], top: 1, len: 1, r: 0.2 });
    part(g, cone(0.25, 1.2, 5), m, [0, 1.1, -1.5], [-PI / 2, 0, 0]);
    return g;
  },
  pterosaur() {
    const g = new THREE.Group();
    const m = mat(0x8a6a4a);
    part(g, sphere(0.15, 6, 5), m, [0, 0, 0], [0, 0, 0], [0.8, 0.8, 2]);
    part(g, cone(0.06, 0.7, 4), mat(0xd8b070), [0, 0.05, 0.6], [PI / 2, 0, 0]);
    part(g, cone(0.05, 0.5, 3), mat(0xc04030), [0, 0.15, 0.1], [-PI / 2 - 0.4, 0, 0]);
    wings(g, mat(0xa07a50, { side: THREE.DoubleSide }), { span: 1.4, depth: 0.45 });
    return g;
  },
  cycad() {
    const g = new THREE.Group();
    part(g, cyl(0.25, 0.3, 0.8, 7), mat(0x6a5a3a), [0, 0.4, 0]);
    const leaf = mat(0x4a7a3a);
    for (let i = 0; i < 10; i++) {
      const f = new THREE.Group();
      f.position.y = 0.8;
      f.rotation.y = (i / 10) * PI * 2;
      part(f, sphere(0.2, 5, 3), leaf, [0, 0.3, 0.5], [-0.6, 0, 0], [0.4, 0.08, 3]);
      g.add(f);
    }
    return g;
  },
  conifer() {
    const g = new THREE.Group();
    const h = 2 + Math.random() * 2;
    part(g, cyl(0.15, 0.25, h), mat(0x6b4a2b), [0, h / 2, 0]);
    part(g, cone(1.2, 2.5, 7), mat(0x2e5a30), [0, h + 0.5, 0]);
    part(g, cone(0.9, 2, 7), mat(0x2e6b30), [0, h + 1.5, 0]);
    return g;
  },
  fern() {
    const g = new THREE.Group();
    const m = mat(0x3f7f2f);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Group();
      f.rotation.y = (i / 6) * PI * 2;
      part(f, sphere(0.15, 5, 3), m, [0, 0.25, 0.3], [-0.7, 0, 0], [0.5, 0.1, 3]);
      g.add(f);
    }
    return g;
  },
  flower() {
    const g = new THREE.Group();
    part(g, cyl(0.01, 0.01, 0.3, 3), mat(0x3a7a2a), [0, 0.15, 0]);
    part(g, new THREE.IcosahedronGeometry(0.1, 0), mat([0xff6fa0, 0xffe14d, 0xffffff, 0xb07cff][Math.floor(Math.random() * 4)]), [0, 0.32, 0]);
    return g;
  },
  seaweed() {
    const g = new THREE.Group();
    const m = mat(0x4a8a3a, { side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) part(g, sphere(0.15, 5, 4), m, [(i - 1.5) * 0.12, 0.6, 0], [0, i, (i - 1.5) * 0.15], [0.6, 4, 0.1]);
    return g;
  },
  kelp() {
    // A chain of segments; each bends a little so the whole strand sways.
    const g = new THREE.Group();
    const m = mat(0x6a6a2a, { side: THREE.DoubleSide });
    g.userData.chain = [];
    let parent = g;
    const n = 7 + Math.floor(Math.random() * 6);
    for (let s = 0; s < n; s++) {
      const seg = new THREE.Group();
      seg.position.y = s === 0 ? 0 : 1;
      part(seg, box(0.35, 1, 0.04), m, [0, 0.5, 0]);
      parent.add(seg);
      g.userData.chain.push(seg);
      parent = seg;
    }
    return g;
  },
  whale() {
    const g = new THREE.Group();
    const m = mat(0x4a5a6a);
    part(g, sphere(1, 12, 8), m, [0, 0, 0], [0, 0, 0], [1, 0.85, 3]);
    part(g, sphere(0.9, 10, 6), mat(0xa0aab0), [0, -0.3, 0.6], [0, 0, 0], [0.9, 0.5, 2.2]);
    for (const s of [-1, 1]) {
      part(g, box(1.2, 0.06, 0.6), m, [s * 0.7, 0, -3.1], [0, s * 0.4, 0]);
      part(g, box(1, 0.06, 0.35), m, [s * 1, -0.4, 1], [0, s * 0.5, s * -0.4]);
    }
    return g;
  },
  megalodon() {
    const g = B.stethacanthus();
    g.children.forEach((c) => { if (c.material) c.material = mat(0x5a6670); });
    g.children[1].visible = g.children[2].visible = false; // no anvil crest
    return g;
  },
  fish() {
    const g = new THREE.Group();
    const m = mat([0x8fa8b8, 0xc0a040, 0x5a90b0][Math.floor(Math.random() * 3)]);
    part(g, sphere(0.3, 8, 6), m, [0, 0, 0], [0, 0, 0], [0.5, 0.8, 1.4]);
    fishTail(g, m, -0.5, 0.35);
    return g;
  },
  mammoth() {
    const g = new THREE.Group();
    const m = mat(0x6b4423), tusk = mat(0xf0e8d0);
    part(g, sphere(1, 10, 8), m, [0, 2.2, 0], [0, 0, 0], [1, 1, 1.4]);
    part(g, sphere(0.6, 8, 6), m, [0, 2.9, 1.2]);
    part(g, sphere(0.5, 8, 6), mat(0x5a3818), [0, 3.1, 0.3]);
    for (let i = 0; i < 4; i++) part(g, cyl(0.16 - i * 0.025, 0.18 - i * 0.025, 0.5, 6), m, [0, 2.6 - i * 0.42, 1.7 + i * 0.06], [0.15 * i, 0, 0]);
    for (const s of [-1, 1]) part(g, new THREE.TorusGeometry(0.5, 0.06, 5, 10, PI * 0.9), tusk, [s * 0.3, 2.2, 1.9], [0, PI / 2, 0]);
    legs(g, mat(0x5a3818), { x: 0.55, zs: [-0.8, 0.8], top: 1.7, len: 1.7, r: 0.3 });
    return g;
  },
  sabertooth() {
    const g = new THREE.Group();
    const m = mat(0xc8a060);
    part(g, sphere(0.4, 8, 6), m, [0, 0.9, 0], [0, 0, 0], [0.8, 0.8, 1.8]);
    part(g, sphere(0.3, 8, 6), m, [0, 1.15, 0.85]);
    for (const s of [-1, 1]) part(g, cone(0.04, 0.3, 4), mat(0xffffff), [s * 0.08, 0.9, 1.05], [PI, 0, 0]);
    legs(g, mat(0xb08a50), { x: 0.2, zs: [-0.5, 0.5], top: 0.75, len: 0.75, r: 0.08 });
    part(g, cyl(0.05, 0.03, 0.4, 4), m, [0, 0.95, -0.8], [-0.6, 0, 0]);
    return g;
  },
  bird() {
    const g = new THREE.Group();
    const m = mat([0x4a4a5a, 0xa04030, 0x3a6aa0][Math.floor(Math.random() * 3)]);
    part(g, sphere(0.15, 6, 5), m, [0, 0, 0], [0, 0, 0], [0.8, 0.8, 1.6]);
    part(g, cone(0.04, 0.15, 4), mat(0xe0b030), [0, 0, 0.3], [PI / 2, 0, 0]);
    wings(g, m, { span: 0.6, depth: 0.2 });
    return g;
  },
  deer() {
    const g = new THREE.Group();
    const m = mat(0x8a6a4a), antler = mat(0xd8c8a0);
    part(g, sphere(0.35, 8, 6), m, [0, 1.1, 0], [0, 0, 0], [0.7, 0.8, 1.6]);
    part(g, cyl(0.1, 0.13, 0.6, 5), m, [0, 1.5, 0.5], [0.5, 0, 0]);
    part(g, sphere(0.15, 6, 5), m, [0, 1.8, 0.75], [0, 0, 0], [0.8, 0.8, 1.4]);
    for (const s of [-1, 1]) {
      part(g, cyl(0.02, 0.02, 0.5, 3), antler, [s * 0.12, 2.1, 0.7], [0, 0, s * -0.5]);
      part(g, cyl(0.015, 0.015, 0.25, 3), antler, [s * 0.18, 2.2, 0.8], [0.6, 0, 0]);
    }
    legs(g, mat(0x6a4a30), { x: 0.15, zs: [-0.4, 0.4], top: 0.9, len: 0.9, r: 0.04 });
    return g;
  },
  grass() {
    const g = new THREE.Group();
    const m = mat(0x8aa040);
    for (let i = 0; i < 5; i++) part(g, cone(0.04, 0.5, 3), m, [(Math.random() - 0.5) * 0.2, 0.25, (Math.random() - 0.5) * 0.2], [(Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5]);
    return g;
  },
  broadleaf() {
    const g = new THREE.Group();
    const h = 2 + Math.random() * 1.5;
    part(g, cyl(0.15, 0.25, h), mat(0x6b4a2b), [0, h / 2, 0]);
    part(g, new THREE.IcosahedronGeometry(1.3, 0), mat(0x3d8a3a), [0, h + 0.8, 0]);
    part(g, new THREE.IcosahedronGeometry(0.9, 0), mat(0x4a9a40), [0.6, h + 0.4, 0.3]);
    return g;
  },
};

// ── Species: name, fact, behavior ───────────────────────────────────────
// kind: drifter | swimmer | crawler (seafloor) | walker | flyer | plant
// size scales the model; speed is m/s; reach widens the "you meet it" radius.

export const SPECIES = {
  bacterium: { name: 'Archaea & bacteria', kind: 'drifter', fact: "Earth's first life, thriving without oxygen." },
  cyanobacteria: { name: 'Cyanobacteria', kind: 'drifter', fact: 'Microbes that photosynthesize, slowly filling the air with oxygen.' },
  stromatolite: { name: 'Stromatolites', kind: 'plant', fact: 'Layered mounds built by microbial mats. A few still grow today in Shark Bay, Australia.' },
  dickinsonia: { name: 'Dickinsonia', kind: 'crawler', speed: 0.1, size: 1.4, fact: 'A flat, ribbed Ediacaran animal up to 1.4 m long, one of the first large animals.' },
  charnia: { name: 'Charnia', kind: 'plant', sway: true, fact: 'A frond anchored to the seafloor. Despite looking like a plant, it was probably an animal.' },
  jellyfish: { name: 'Medusoids', kind: 'drifter', fact: 'Early jellyfish-like drifters, among the oldest animals.' },
  sponge: { name: 'Sponges', kind: 'plant', fact: 'Simple filter-feeding animals with no organs, among the earliest animal lineages.' },
  trilobite: { name: 'Trilobites', kind: 'crawler', speed: 0.4, fact: 'Armored arthropods with crystal eyes. Over 20,000 species lived for 270 million years.' },
  anomalocaris: { name: 'Anomalocaris', kind: 'swimmer', speed: 1.6, size: 1.2, reach: 1.5, fact: 'A 1 m Cambrian apex predator that grabbed prey with spiny frontal limbs.' },
  opabinia: { name: 'Opabinia', kind: 'swimmer', speed: 0.8, fact: 'Five eyes and a grasping nozzle. It made scientists laugh when first presented.' },
  hallucigenia: { name: 'Hallucigenia', kind: 'crawler', speed: 0.15, fact: 'A spiny worm so strange it was first reconstructed upside down.' },
  pikaia: { name: 'Pikaia', kind: 'swimmer', speed: 1, fact: 'A tiny swimmer with a notochord, a distant relative of every vertebrate.' },
  eurypterid: { name: 'Sea scorpions', kind: 'crawler', speed: 0.5, size: 1.4, fact: 'Eurypterids; some grew over 2.5 m long, the largest arthropods ever.' },
  orthocone: { name: 'Orthocone nautiloids', kind: 'swimmer', speed: 0.9, size: 1.2, reach: 1.5, fact: 'Squid-like hunters in straight shells up to 6 m long.' },
  dunkleosteus: { name: 'Dunkleosteus', kind: 'swimmer', speed: 1.4, size: 1.5, reach: 3, fact: 'A 6 m armored fish with self-sharpening bony jaw blades.' },
  ostracoderm: { name: 'Ostracoderms', kind: 'swimmer', speed: 0.8, fact: 'Jawless armored fish, early experiments in having a backbone.' },
  crinoid: { name: 'Crinoids', kind: 'plant', sway: true, fact: 'Sea lilies: relatives of starfish that filter food from atop long stalks.' },
  cooksonia: { name: 'Cooksonia', kind: 'plant', fact: 'A few centimeters tall, one of the very first plants on land.' },
  moss: { name: 'Mosses & liverworts', kind: 'plant', fact: 'Low green carpets that first softened the bare rock.' },
  millipede: { name: 'Early millipedes', kind: 'walker', speed: 0.3, size: 1.3, fact: 'Among the first animals to walk on land.' },
  stethacanthus: { name: 'Stethacanthus', kind: 'swimmer', speed: 1.8, size: 1.2, reach: 1.5, fact: 'An early shark with a strange anvil-shaped crest on its back.' },
  ammonite: { name: 'Ammonites', kind: 'swimmer', speed: 0.6, fact: 'Coiled-shell relatives of squid that thrived for 340 million years.' },
  coelacanth: { name: 'Coelacanths', kind: 'swimmer', speed: 0.8, size: 1.3, fact: 'Lobe-finned fish thought extinct until one was caught alive in 1938.' },
  lepidodendron: { name: 'Lepidodendron', kind: 'plant', reach: 2, fact: 'Scale trees up to 40 m tall. Their remains became much of the coal we burn today.' },
  calamites: { name: 'Calamites', kind: 'plant', fact: 'Giant horsetails, tree-sized relatives of the small horsetails alive today.' },
  treeFern: { name: 'Tree ferns', kind: 'plant', fact: 'Ferns with trunks, the understory of the coal swamps.' },
  meganeura: { name: 'Meganeura', kind: 'flyer', speed: 3, size: 1.5, fact: 'A dragonfly-like insect with a 70 cm wingspan, possible thanks to oxygen-rich air.' },
  arthropleura: { name: 'Arthropleura', kind: 'walker', speed: 0.4, size: 1.2, reach: 1.5, fact: 'A millipede 2.5 m long, the largest land invertebrate ever.' },
  eryops: { name: 'Eryops', kind: 'walker', speed: 0.5, size: 1.2, fact: 'A 2 m amphibian that hunted fish in the swamps.' },
  ichthyosaur: { name: 'Ichthyosaurs', kind: 'swimmer', speed: 2.2, size: 1.3, reach: 2, fact: 'Dolphin-shaped marine reptiles with the largest eyes of any animal.' },
  plesiosaur: { name: 'Plesiosaurs', kind: 'swimmer', speed: 1.2, size: 1.3, reach: 2.5, fact: 'Long-necked marine reptiles that "flew" through water with four flippers.' },
  sauropod: { name: 'Sauropods', kind: 'walker', speed: 0.7, size: 1.4, reach: 5, fact: 'The largest animals ever to walk the Earth, some over 30 m long.' },
  theropod: { name: 'Tyrannosaurus', kind: 'walker', speed: 1.4, size: 1.3, reach: 3, fact: 'A 12 m predator with one of the strongest bites of any land animal.' },
  triceratops: { name: 'Triceratops', kind: 'walker', speed: 0.6, size: 1.2, reach: 3, fact: 'A three-horned plant-eater with a bony neck frill.' },
  pterosaur: { name: 'Pterosaurs', kind: 'flyer', speed: 3.5, size: 1.5, reach: 2, fact: 'Flying reptiles. The largest had 10 m wingspans.' },
  cycad: { name: 'Cycads', kind: 'plant', fact: 'Palm-like seed plants, a staple food of plant-eating dinosaurs.' },
  conifer: { name: 'Conifers', kind: 'plant', sway: true, fact: 'Cone-bearing trees that dominated Mesozoic forests.' },
  fern: { name: 'Ferns', kind: 'plant', fact: 'Ancient spore-bearing plants carpeting the forest floor.' },
  flower: { name: 'Flowering plants', kind: 'plant', fact: 'They appeared in the Cretaceous and rapidly took over the land.' },
  seaweed: { name: 'Algae & seaweed', kind: 'plant', sway: true, shallow: true, fact: 'Marine algae swaying in the sunlit shallows.' },
  kelp: { name: 'Kelp', kind: 'plant', shallow: true, fact: 'Giant brown algae forming underwater forests. It evolved only ~30 million years ago.' },
  whale: { name: 'Whales', kind: 'swimmer', speed: 1.5, size: 1.4, reach: 5, fact: 'Mammals whose ancestors walked on land before returning to the sea.' },
  megalodon: { name: 'Megalodon', kind: 'swimmer', speed: 2, size: 3, reach: 4, fact: 'An 18 m shark, the largest predatory fish that ever lived.' },
  fish: { name: 'Ray-finned fish', kind: 'swimmer', speed: 1.4, fact: 'The most diverse group of vertebrates alive today.' },
  mammoth: { name: 'Woolly mammoths', kind: 'walker', speed: 0.7, size: 1.2, reach: 3.5, fact: 'Shaggy elephants of the Ice Age steppes.' },
  sabertooth: { name: 'Smilodon', kind: 'walker', speed: 1.3, size: 1.2, fact: 'The saber-toothed cat, with fangs 28 cm long.' },
  bird: { name: 'Birds', kind: 'flyer', speed: 3, fact: 'The dinosaurs that survived the meteor.' },
  deer: { name: 'Deer', kind: 'walker', speed: 1, fact: 'Grazers that spread across the new grasslands.' },
  grass: { name: 'Grasses', kind: 'plant', fact: 'They spread only ~20 million years ago, transforming whole continents.' },
  broadleaf: { name: 'Broadleaf trees', kind: 'plant', sway: true, reach: 1.5, fact: 'Flowering trees that came to dominate forests.' },
};
for (const [id, s] of Object.entries(SPECIES)) {
  s.id = id;
  s.build = B[id];
}

// Who lives where, per era (index into ERAS): [speciesId, count].
const ERA_LIFE = [
  { water: [['bacterium', 16], ['cyanobacteria', 12], ['stromatolite', 30]] },
  { water: [['dickinsonia', 10], ['jellyfish', 8], ['charnia', 22], ['sponge', 12]] },
  { water: [['trilobite', 14], ['anomalocaris', 3], ['opabinia', 4], ['hallucigenia', 8], ['pikaia', 6], ['sponge', 16], ['seaweed', 10]] },
  {
    water: [['eurypterid', 5], ['orthocone', 3], ['dunkleosteus', 2], ['ostracoderm', 8], ['trilobite', 6], ['crinoid', 20], ['sponge', 8]],
    land: [['millipede', 8], ['cooksonia', 70], ['moss', 25]],
  },
  {
    water: [['stethacanthus', 4], ['ammonite', 7], ['coelacanth', 3], ['crinoid', 16], ['seaweed', 10]],
    land: [['meganeura', 6], ['arthropleura', 3], ['eryops', 4], ['lepidodendron', 14], ['calamites', 20], ['treeFern', 16], ['moss', 15]],
  },
  {
    water: [['ichthyosaur', 4], ['plesiosaur', 3], ['ammonite', 8], ['fish', 8], ['seaweed', 14]],
    land: [['sauropod', 2], ['theropod', 2], ['triceratops', 3], ['pterosaur', 4], ['cycad', 16], ['conifer', 14], ['fern', 30], ['flower', 30]],
  },
  {
    water: [['whale', 2], ['megalodon', 2], ['fish', 14], ['kelp', 26]],
    land: [['mammoth', 3], ['sabertooth', 2], ['deer', 5], ['bird', 6], ['broadleaf', 18], ['conifer', 6], ['grass', 70], ['flower', 30]],
  },
];

export function lifeFor(era, habitat) {
  const e = ERA_LIFE[Math.min(era, ERA_LIFE.length - 1)];
  return e[habitat] ?? e.water;
}
