// 3D rendering: habitat dioramas, procedural creatures and extinction effects.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LINE_COLORS } from './data.js';
import { SPECIES, lifeFor } from './fauna.js';

const WATER_LEVEL = -0.4; // land-mode lakes and shoreline
const BOUNDS = 26; // how far the player can roam from the center
// Group-living species bring kin along: [tag, followers]. The largest group wins.
const GROUPS = [['swarm', 14], ['schooling', 10], ['colony', 10], ['packHunter', 6], ['social', 5]];

const groundHeight = (x, z) =>
  Math.sin(x * 0.18) * 0.7 + Math.cos(z * 0.22) * 0.6 + Math.sin((x + z) * 0.08) * 1.0;

const rand = (a, b) => a + Math.random() * (b - a);

const THEMES = {
  primordial: { bg: 0x1f3b30, near: 6, far: 38, floor: 0x3b3a2a, hemi: 0.9, sun: 0.8, water: true },
  ocean: { bg: 0x0d4a6e, near: 10, far: 55, floor: 0xc2b280, hemi: 1.0, sun: 1.3, water: true },
  deep: { bg: 0x0b2440, near: 6, far: 40, floor: 0x2e3a50, hemi: 1.0, sun: 0.6, water: true },
  reef: { bg: 0x1a8fb5, near: 14, far: 65, floor: 0xe8d8a8, hemi: 1.1, sun: 1.6, water: true },
  land: { bg: 0x9fd3f0, near: 30, far: 90, floor: 0x6a9a48, hemi: 1.1, sun: 2.2, water: false },
};

const EVENT_LOOKS = {
  greatOxidation: { bg: 0x8a3e16, near: 4, far: 30, particles: 'bubbles', color: 0xff9a50 },
  snowball: { bg: 0xd8ecf6, near: 4, far: 28, particles: 'snow', color: 0xffffff, ice: true },
  ordovicianIce: { bg: 0x9fbfd0, near: 5, far: 32, particles: 'snow', color: 0xe8f4ff, ice: true },
  oceanAnoxia: { bg: 0x2b1838, near: 2, far: 22, particles: 'murk', color: 0x8a50a0 },
  greatDying: { bg: 0x5a1208, near: 4, far: 30, particles: 'ash', color: 0x666666, shake: 0.15 },
  meteor: { bg: 0x2e2a28, near: 3, far: 26, particles: 'ash', color: 0x888888, meteor: true },
  iceAge: { bg: 0xe2eef5, near: 6, far: 40, particles: 'snow', color: 0xffffff, frost: true },
};

function themeFor(g) {
  if (g.tags.has('terrestrial')) return 'land';
  if (g.tags.has('deepSea')) return 'deep';
  if (g.tags.has('reef')) return 'reef';
  return g.era === 0 ? 'primordial' : 'ocean';
}

let dotTexture;
function softDot() {
  if (dotTexture) return dotTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  dotTexture = new THREE.CanvasTexture(c);
  return dotTexture;
}

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, ...opts });

export class World {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // Phones get a lighter render: lower resolution and smaller shadow maps.
    const phone = window.matchMedia('(pointer: coarse)').matches && Math.min(window.innerWidth, window.innerHeight) < 600;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, phone ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x000000, 10, 50);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
    this.camera.position.set(0, 9, 22);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 45;
    this.controls.target.set(0, 3, 0);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x334455, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sun.position.set(10, 25, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.setScalar(phone ? 1024 : 2048);
    Object.assign(this.sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 });
    this.scene.add(this.hemi, this.sun);

    // Everything that shakes during disasters lives in `stage`.
    this.stage = new THREE.Group();
    this.scene.add(this.stage);
    this.env = new THREE.Group();
    this.fx = new THREE.Group();
    this.avatar = new THREE.Group();
    this.stage.add(this.env, this.fx, this.avatar);

    this.mood = { bg: new THREE.Color(), near: 10, far: 50, hemi: 1, sun: 1.5 };
    this.moodTarget = { ...this.mood, bg: new THREE.Color() };
    this.player = null;
    this.followers = []; // kin of the player's species that travel with it
    this.life = []; // other species: { obj, sp, ...motion }
    this.met = new Set(); // species ids the player has encountered
    this.onEncounter = null;
    this.active = false; // the player is out roaming: not on a menu or watching a disaster
    this.food = []; // { obj, type, baseY, phase, eatenAt }
    this.foodKind = null;
    this.onEat = null;
    this.hunt = null; // { e, until, speed }: a predator chasing the player
    this.nextHunt = 0;
    this.onHuntStart = null;
    this.onBite = null;
    this.onHuntEnd = null;
    this.swayers = [];
    this.particles = [];
    this.shake = 0;
    this.flash = 0;
    this.input = { x: 0, y: 0, up: 0 }; // replaced by the joystick's live state

    // Floating marker over the leader: the individual the player steers.
    this.marker = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.45, 4),
      new THREE.MeshStandardMaterial({ color: 0x5fd3b8, emissive: 0x5fd3b8, emissiveIntensity: 0.8, flatShading: true }),
    );
    this.marker.rotation.x = Math.PI;
    this.stage.add(this.marker);
    // The same marker in red over a predator that is hunting the player.
    this.huntMarker = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.6, 4),
      new THREE.MeshStandardMaterial({ color: 0xff4d4d, emissive: 0xff4d4d, emissiveIntensity: 0.9, flatShading: true }),
    );
    this.huntMarker.rotation.x = Math.PI;
    this.huntMarker.visible = false;
    this.stage.add(this.huntMarker);
    this.animations = [];
    this.clock = new THREE.Clock();

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ── Environment ────────────────────────────────────────────────────────

  setEnvironment(g) {
    this.clear(this.env);
    this.clear(this.fx);
    this.swayers = [];
    this.particles = [];
    this.life = [];
    this.food = [];
    this.foodKind = null;
    this.hunt = null;
    this.huntMarker.visible = false;
    this.era = g.era;
    this.themeKey = themeFor(g);
    const theme = THEMES[this.themeKey];
    this.aquatic = theme.water;
    this.setMood(theme);
    this.mood.bg.copy(this.moodTarget.bg);

    this.floorMat = mat(theme.floor, { roughness: 1 });
    this.floorBase = new THREE.Color(theme.floor);
    const floorGeo = new THREE.PlaneGeometry(90, 90, 60, 60);
    floorGeo.rotateX(-Math.PI / 2);
    const pos = floorGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, groundHeight(pos.getX(i), pos.getZ(i)));
    floorGeo.computeVertexNormals();
    const floor = new THREE.Mesh(floorGeo, this.floorMat);
    floor.receiveShadow = true;
    this.env.add(floor);

    this.addRocks(theme.water ? 14 : 10);
    if (theme.water) this.buildSea(g);
    else this.buildLand(g);
    this.buildLife(g);
    this.controls.maxPolarAngle = theme.water ? Math.PI * 0.62 : Math.PI * 0.47;
  }

  setMood(m) {
    this.moodTarget.bg.set(m.bg);
    this.moodTarget.near = m.near;
    this.moodTarget.far = m.far;
    if (m.hemi !== undefined) this.moodTarget.hemi = m.hemi;
    if (m.sun !== undefined) this.moodTarget.sun = m.sun;
  }

  addRocks(n) {
    const rockMat = mat(0x6b6b6b);
    for (let i = 0; i < n; i++) {
      const r = rand(0.4, 1.6);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockMat);
      const x = rand(-25, 25), z = rand(-25, 25);
      rock.position.set(x, groundHeight(x, z) + r * 0.3, z);
      rock.rotation.set(rand(0, 3), rand(0, 3), 0);
      rock.castShadow = rock.receiveShadow = true;
      this.env.add(rock);
    }
  }

  buildSea(g) {
    const key = this.themeKey;
    // Surface seen from below and shafts of light.
    const surface = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: key === 'deep' ? 0 : 0.25, side: THREE.DoubleSide }),
    );
    surface.rotation.x = Math.PI / 2;
    surface.position.y = 16;
    this.env.add(surface);
    if (key !== 'deep') {
      const shaftMat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      for (let i = 0; i < 7; i++) {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 2.8, 32, 8, 1, true), shaftMat);
        shaft.position.set(rand(-18, 18), 8, rand(-18, 10));
        shaft.rotation.set(rand(-0.2, 0.2), 0, rand(0.15, 0.35));
        this.env.add(shaft);
      }
    }

    if (key === 'reef') this.addCoral(40);
    if (key === 'deep') this.addVents();

    this.addParticles(key === 'deep' ? 'deepSnow' : 'plankton', key === 'deep' ? 0x99bbff : 0xddffee, 700);
  }

  addCoral(n) {
    const colors = [0xff6f61, 0xffb347, 0xb565d9, 0x4fc3f7, 0xf06292, 0xffe066];
    for (let i = 0; i < n; i++) {
      const x = rand(-22, 22), z = rand(-22, 22);
      const c = mat(colors[i % colors.length]);
      const kind = i % 3;
      let coral;
      if (kind === 0) {
        coral = new THREE.Group();
        for (let b = 0; b < 5; b++) {
          const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, rand(0.8, 1.8), 5), c);
          branch.rotation.set(rand(-0.6, 0.6), 0, rand(-0.6, 0.6));
          branch.position.y = 0.5;
          coral.add(branch);
        }
      } else if (kind === 1) {
        coral = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.4, 1), 1), c);
      } else {
        coral = new THREE.Mesh(new THREE.ConeGeometry(rand(0.3, 0.6), rand(1, 2.2), 6, 1, true), c);
        coral.position.y = 0.5;
      }
      const holder = new THREE.Group();
      holder.add(coral);
      holder.position.set(x, groundHeight(x, z), z);
      this.env.add(holder);
    }
  }

  addVents() {
    const ventMat = mat(0x3a3a44, { emissive: 0x401808, emissiveIntensity: 0.6 }); // warm from the heat within
    const glow = new THREE.MeshBasicMaterial({ color: 0xffa050 });
    for (let i = 0; i < 6; i++) {
      const x = rand(-18, 18), z = rand(-18, 18);
      const h = rand(2, 5);
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1.1, h, 7), ventMat);
      vent.position.set(x, groundHeight(x, z) + h / 2, z);
      const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), glow);
      mouth.position.y = h / 2;
      vent.add(mouth);
      this.env.add(vent);
      if (i < 3) {
        const light = new THREE.PointLight(0xff7a30, 70, 22);
        light.position.set(x, groundHeight(x, z) + h + 0.5, z);
        this.env.add(light);
      }
    }
  }

  buildLand(g) {
    const lake = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0x3a8fc0, transparent: true, opacity: 0.85, roughness: 0.2 }),
    );
    lake.rotation.x = -Math.PI / 2;
    lake.position.y = WATER_LEVEL;
    this.env.add(lake);

    this.addParticles('pollen', 0xfff6c0, 200);
  }

  dryPoint() {
    for (let i = 0; i < 30; i++) {
      const x = rand(-26, 26), z = rand(-26, 26);
      if (groundHeight(x, z) > WATER_LEVEL + 0.2) return [x, z];
    }
    return [0, 0];
  }

  /** Populate the scene with the plants and animals of this era and habitat. */
  buildLife(g) {
    const deep = this.themeKey === 'deep';
    this.contemporaries = [];
    for (const [id, count] of lifeFor(g.era, this.aquatic ? 'water' : 'land')) {
      const sp = SPECIES[id];
      if (deep && sp.shallow) continue;
      this.contemporaries.push(sp);
      for (let i = 0; i < count; i++) {
        const obj = sp.build();
        obj.scale.multiplyScalar((sp.size ?? 1) * rand(0.85, 1.15));
        // Numerous small things skip shadows to keep the frame rate up.
        obj.traverse((o) => { o.castShadow = count <= 20; });
        this.env.add(obj);
        const e = { obj, sp, phase: rand(0, 6) };
        if (sp.kind === 'plant') {
          const [x, z] = this.aquatic ? [rand(-28, 28), rand(-28, 28)] : this.dryPoint();
          obj.position.set(x, groundHeight(x, z) - 0.05, z);
          obj.rotation.y = rand(0, Math.PI * 2);
          if (obj.userData.chain) obj.userData.chain.forEach((seg, k) => this.swayers.push({ obj: seg, phase: e.phase + k * 0.4, amp: 0.07 }));
          else if (sp.sway) this.swayers.push({ obj, phase: e.phase, amp: 0.03 });
        } else {
          const r = rand(4, 14);
          Object.assign(e, {
            cx: rand(-16, 16), cz: rand(-16, 16), r, a: rand(0, 6),
            w: ((sp.speed ?? 0.5) / r) * (Math.random() < 0.5 ? 1 : -1), // angular speed
            y: sp.kind === 'flyer' ? rand(5, 10) : rand(1.5, deep ? 7 : 11),
          });
        }
        this.life.push(e);
      }
    }
  }

  addParticles(kind, color, count) {
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = rand(-25, 25);
      p[i * 3 + 1] = rand(0, 18);
      p[i * 3 + 2] = rand(-25, 25);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const sizes = { plankton: 0.08, deepSnow: 0.07, pollen: 0.07, snow: 0.22, ash: 0.18, bubbles: 0.2, murk: 0.6 };
    const material = new THREE.PointsMaterial({
      color, size: sizes[kind] * 1.6, map: softDot(), transparent: true, opacity: kind === 'murk' ? 0.35 : 0.85, depthWrite: false,
    });
    const points = new THREE.Points(geo, material);
    this.fx.add(points);
    this.particles.push({ points, kind });
  }

  // ── Creatures ──────────────────────────────────────────────────────────

  /** Rebuild the player's organism from its species' traits. `evolve` plays a growth pop. */
  setCreature(g, { evolve = false } = {}) {
    const prev = this.player;
    this.clear(this.avatar);
    const built = buildCreature(g);
    this.avatar.add(built.root);
    this.player = {
      ...built,
      pos: prev?.pos.clone() ?? new THREE.Vector3(0, this.aquatic ? 4 : 0, 0),
      dir: prev?.dir.clone() ?? new THREE.Vector3(0, 0, 1),
      phase: 0, anim: 0, moving: 0.3, grow: evolve ? 0 : 1, flying: g.tags.has('flight'),
      speed: (0.9 + g.traits.speed * 0.25) * (g.era === 0 ? 0.5 : 1),
    };
    this.setFood(g);

    const lead = this.player;
    const n = Math.max(0, ...GROUPS.filter(([tag]) => g.tags.has(tag)).map(([, count]) => count));
    const spread3d = this.aquatic || lead.flying;
    this.followers = Array.from({ length: n }, (_, i) => {
      const kin = buildCreature(g);
      if (n > 8) kin.root.traverse((o) => { o.castShadow = false; });
      this.avatar.add(kin.root);
      // Spiral slots around the leader, wider for bigger bodies.
      const a = i * 2.4;
      const r = (1.1 + 0.55 * Math.sqrt(i + 1)) * kin.scale * 1.5;
      const offset = new THREE.Vector3(Math.cos(a) * r, spread3d ? rand(-0.5, 0.5) * r : 0, Math.sin(a) * r);
      return {
        ...kin, offset, scale: kin.scale * rand(0.8, 1),
        pos: lead.pos.clone().add(offset), dir: lead.dir.clone(),
        phase: rand(0, 6), anim: 0, moving: 0.3, grow: lead.grow, flying: lead.flying, speed: lead.speed,
      };
    });
  }

  // ── Food the player can collect ──────────────────────────────────────

  /** Scatter food that suits the species' diet; rebuilt only when the kind of food changes. */
  setFood(g) {
    const kind = g.era === 0 || !g.diet ? 'nutrients' : { carnivore: 'meat', herbivore: 'plants' }[g.diet.line] ?? 'mixed';
    if (kind === this.foodKind) return;
    for (const f of this.food) {
      this.env.remove(f.obj);
      this.clear(f.obj);
    }
    this.foodKind = kind;
    this.food = Array.from({ length: 14 }, (_, i) => {
      const type = kind === 'mixed' ? (i % 2 ? 'meat' : 'plants') : kind;
      const f = { obj: buildFood(type, this.aquatic), type, phase: rand(0, 6), eatenAt: null };
      this.env.add(f.obj);
      this.placeFood(f);
      return f;
    });
  }

  placeFood(f) {
    const [x, z] = this.aquatic ? [rand(-22, 22), rand(-22, 22)] : this.dryPoint();
    f.baseY = groundHeight(x, z) + (this.aquatic ? rand(1.2, 6) : 0.3);
    f.obj.position.set(x, f.baseY, z);
    f.obj.visible = true;
    f.eatenAt = null;
  }

  updateFood(lead, dt, t) {
    for (const f of this.food) {
      if (f.eatenAt !== null) {
        if (t - f.eatenAt > 8) this.placeFood(f); // grows back somewhere else
        continue;
      }
      f.obj.position.y = f.baseY + Math.sin(t * 1.5 + f.phase) * 0.12;
      f.obj.rotation.y += dt * 0.6;
      if (!this.active) continue;
      const d = f.obj.position;
      const flat = Math.hypot(d.x - lead.pos.x, d.z - lead.pos.z);
      const reach = 0.9 + lead.scale * 0.8;
      // Flyers swoop down for food on the ground, so only nearness on the map counts for them.
      const near = lead.flying && !this.aquatic ? flat < reach * 1.5 : Math.hypot(flat, d.y - lead.pos.y) < reach;
      if (!near) continue;
      f.obj.visible = false;
      f.eatenAt = t;
      this.burst(d, FOOD_COLORS[f.type]);
      this.onEat?.(f.type);
    }
  }

  /** A quick puff of crumbs where something was eaten. */
  burst(pos, color) {
    const bits = Array.from({ length: 7 }, () => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), new THREE.MeshBasicMaterial({ color }));
      m.position.copy(pos);
      m.userData.v = new THREE.Vector3(rand(-1, 1), rand(-0.2, 1), rand(-1, 1)).normalize().multiplyScalar(rand(0.6, 1.2));
      this.fx.add(m);
      return m;
    });
    const start = pos.clone();
    this.animate(0.5, (k) => {
      for (const m of bits) {
        m.position.copy(start).addScaledVector(m.userData.v, k);
        m.scale.setScalar(1 - k);
      }
      if (k === 1) for (const m of bits) { this.fx.remove(m); m.geometry.dispose(); m.material.dispose(); }
    });
  }

  // ── Predators that hunt the player ───────────────────────────────────

  updateHunt(lead, dt, t) {
    if (!this.active) {
      if (this.hunt) this.endHunt(t, 'cancelled');
      this.nextHunt = 0;
      return;
    }
    if (!this.hunt) {
      if (!this.nextHunt) this.nextHunt = t + rand(12, 25);
      if (t >= this.nextHunt) this.startHunt(lead, t);
      return;
    }
    const { e, speed } = this.hunt;
    const p = e.obj.position;
    const to = lead.pos.clone().sub(p);
    const swims = this.aquatic && e.sp.kind === 'swimmer';
    if (!swims) to.y = 0; // walkers and seafloor crawlers stay on the ground
    const step = to.length();
    if (step > 1e-3) p.addScaledVector(to.normalize(), Math.min(step, speed * dt));
    const ground = groundHeight(p.x, p.z);
    p.y = swims ? Math.max(ground + 1, Math.min(14, p.y)) : this.aquatic ? ground : Math.max(ground, WATER_LEVEL);
    e.obj.lookAt(lead.pos.x, swims ? lead.pos.y : p.y, lead.pos.z);
    this.huntMarker.position.set(p.x, p.y + 1.6 + (e.sp.size ?? 1) * 1.6 + Math.sin(t * 5) * 0.15, p.z);
    this.huntMarker.rotation.y += dt * 3;

    const dist = lead.pos.distanceTo(p);
    if (dist < 0.9 + (e.sp.size ?? 1) * 0.7 + lead.scale * 0.5) {
      this.onBite?.(e.sp);
      this.endHunt(t, 'caught');
    } else if (t > this.hunt.until || dist > 24) {
      this.endHunt(t, 'escaped');
    }
  }

  /** The nearest predator of this habitat starts chasing the player. */
  startHunt(lead, t) {
    const hunters = this.life.filter((e) => e.sp.predator && (this.aquatic ? e.sp.kind !== 'walker' : e.sp.kind === 'walker'));
    if (!hunters.length) {
      this.nextHunt = t + 30;
      return;
    }
    const e = hunters.reduce((a, b) => (a.obj.position.distanceTo(lead.pos) < b.obj.position.distanceTo(lead.pos) ? a : b));
    this.hunt = { e, until: t + 8, speed: 2.2 + this.era * 0.15 };
    this.huntMarker.visible = true;
    this.onHuntStart?.(e.sp);
  }

  endHunt(t, outcome) {
    const { e } = this.hunt;
    // Resume its usual circuit from where the chase left it.
    const p = e.obj.position;
    const a = (e.a0 ?? e.a) + e.w * t;
    e.cx = p.x - Math.cos(a) * e.r;
    e.cz = p.z - Math.sin(a) * e.r;
    if (e.sp.kind === 'swimmer') e.y = p.y;
    this.hunt = null;
    this.huntMarker.visible = false;
    this.nextHunt = t + rand(25, 45);
    if (outcome === 'escaped') this.onHuntEnd?.(e.sp);
  }

  // ── Extinction events ──────────────────────────────────────────────────

  playEvent(id) {
    const look = EVENT_LOOKS[id];
    this.setMood({ ...look, hemi: 0.8, sun: 0.6 });
    this.addParticles(look.particles, look.color, look.particles === 'murk' ? 300 : 1500);
    if (look.shake) this.shake = look.shake;
    if (look.ice) {
      const ice = new THREE.Mesh(
        new THREE.PlaneGeometry(120, 120),
        new THREE.MeshStandardMaterial({ color: 0xf0f8ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
      );
      ice.rotation.x = Math.PI / 2;
      ice.position.y = 14;
      this.fx.add(ice);
    }
    if (look.frost) this.animate(3, (k) => this.floorMat.color.copy(this.floorBase).lerp(new THREE.Color(0xf4f8fb), k));
    if (look.meteor) this.launchMeteor();
    return new Promise((resolve) => setTimeout(resolve, look.meteor ? 4200 : 3500));
  }

  launchMeteor() {
    const rock = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.4, 0),
      new THREE.MeshStandardMaterial({ color: 0x552200, emissive: 0xff6a00, emissiveIntensity: 2, flatShading: true }),
    );
    const trail = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 14, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    trail.position.y = 7.5;
    rock.add(trail);
    const from = new THREE.Vector3(45, 60, -60);
    const to = new THREE.Vector3(8, 0, -30);
    rock.position.copy(from);
    rock.lookAt(to);
    rock.rotateX(-Math.PI / 2);
    this.fx.add(rock);
    this.setMood({ bg: 0x40303a, near: 15, far: 70 });
    this.animate(1.6, (k) => {
      rock.position.lerpVectors(from, to, k * k);
      if (k >= 1) {
        this.fx.remove(rock);
        this.flash = 1;
        this.shake = 0.6;
        this.setMood({ ...EVENT_LOOKS.meteor, hemi: 0.5, sun: 0.3 });
      }
    });
  }

  animate(duration, fn) {
    this.animations.push({ t: 0, duration, fn });
  }

  // ── Frame loop ─────────────────────────────────────────────────────────

  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    // Ease lighting & fog toward the target mood.
    const k = 1 - Math.exp(-dt * 1.5);
    this.mood.bg.lerp(this.moodTarget.bg, k);
    this.mood.near += (this.moodTarget.near - this.mood.near) * k;
    this.mood.far += (this.moodTarget.far - this.mood.far) * k;
    this.mood.hemi += (this.moodTarget.hemi - this.mood.hemi) * k;
    this.mood.sun += (this.moodTarget.sun - this.mood.sun) * k;
    this.flash = Math.max(0, this.flash - dt * 1.2);
    this.scene.background.copy(this.mood.bg).lerp(new THREE.Color(0xfff2d0), this.flash);
    this.scene.fog.color.copy(this.scene.background);
    this.scene.fog.near = this.mood.near;
    this.scene.fog.far = this.mood.far;
    this.hemi.intensity = this.mood.hemi + this.flash * 4;
    this.sun.intensity = this.mood.sun;

    this.animations = this.animations.filter((a) => {
      a.t = Math.min(a.t + dt, a.duration);
      a.fn(a.t / a.duration);
      return a.t < a.duration;
    });

    for (const s of this.swayers) s.obj.rotation.z = Math.sin(t * 0.8 + s.phase) * s.amp;
    for (const e of this.life) if (e !== this.hunt?.e) this.moveLife(e, t);
    for (const p of this.particles) this.moveParticles(p, dt, t);
    const lead = this.player;
    if (lead) {
      this.movePlayer(lead, dt);
      this.moveFollowers(lead, dt, t);
      this.updateFood(lead, dt, t);
      this.updateHunt(lead, dt, t);
    }

    // Camera travels with the player, keeping the chosen orbit angle.
    this.marker.visible = !!lead;
    if (lead) {
      this.checkEncounters(lead);
      const goal = lead.pos.clone();
      goal.y = Math.max(goal.y, 1.5);
      const delta = goal.sub(this.controls.target).multiplyScalar(Math.min(1, dt * 2.5));
      this.controls.target.add(delta);
      this.camera.position.add(delta);
      this.marker.position.copy(lead.pos);
      this.marker.position.y += (0.9 + Math.sin(t * 3) * 0.12) * lead.scale + 0.6;
      this.marker.rotation.y += dt * 2;
    }

    this.shake = Math.max(0, this.shake - dt * 0.12);
    this.stage.position.set(rand(-1, 1) * this.shake, rand(-1, 1) * this.shake, 0);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  moveLife(e, t) {
    if (e.sp.kind === 'plant') return;
    e.a = (e.a0 ??= e.a) + e.w * t;
    const x = e.cx + Math.cos(e.a) * e.r;
    const z = e.cz + Math.sin(e.a) * e.r;
    const ground = groundHeight(x, z);
    let y;
    if (e.sp.kind === 'crawler') y = ground;
    else if (e.sp.kind === 'walker') y = ground + Math.abs(Math.sin(t * 4 + e.phase)) * 0.05;
    else if (e.sp.kind === 'drifter') y = e.y + Math.sin(t * 0.7 + e.phase) * 0.6;
    else y = Math.max(e.y + Math.sin(t * 0.5 + e.phase) * 0.4, ground + 1);
    e.obj.position.set(x, y, z);
    const ahead = e.a + Math.sign(e.w) * 0.1;
    e.obj.lookAt(e.cx + Math.cos(ahead) * e.r, y, e.cz + Math.sin(ahead) * e.r);
    for (const w of e.obj.userData.wings ?? []) w.rotation.z = w.userData.side * Math.sin(t * 12 + e.phase) * 0.6;
  }

  /** Tell the game the first time the player gets close to each species. */
  checkEncounters(p) {
    if (!this.onEncounter) return;
    for (const e of this.life) {
      if (this.met.has(e.sp.id)) continue;
      const d = e.obj.position;
      // Flyers count as met when they pass overhead, unless you can fly up to them.
      const dy = e.sp.kind === 'flyer' && !p.flying ? 0 : d.y - p.pos.y;
      if (Math.hypot(d.x - p.pos.x, dy, d.z - p.pos.z) < 2.5 + (e.sp.reach ?? 1) * (e.sp.size ?? 1)) {
        this.met.add(e.sp.id);
        this.onEncounter(e.sp);
        return;
      }
    }
  }

  moveParticles(p, dt, t) {
    const arr = p.points.geometry.attributes.position.array;
    const vy = { plankton: 0.05, deepSnow: -0.15, pollen: 0.03, snow: -1.6, ash: -0.9, bubbles: 1.4, murk: 0.02 }[p.kind];
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += Math.sin(t * 0.5 + i) * dt * 0.15;
      arr[i + 1] += vy * dt;
      if (arr[i + 1] < -1) arr[i + 1] = 18;
      if (arr[i + 1] > 18) arr[i + 1] = -1;
    }
    p.points.geometry.attributes.position.needsUpdate = true;
  }

  /** The player's organism follows joystick/keyboard input. */
  movePlayer(c, dt) {
    const vertical = this.aquatic || c.flying;
    const { x, y, up } = this.input;
    const mag = Math.min(1, Math.hypot(x, y));
    const rise = vertical ? up : 0;
    if (mag > 0.05 || Math.abs(rise) > 0.05) {
      // Joystick directions are relative to where the camera is looking.
      const fwd = new THREE.Vector3();
      this.camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      const right = new THREE.Vector3().crossVectors(fwd, THREE.Object3D.DEFAULT_UP);
      const want = mag > 0.05
        ? fwd.multiplyScalar(y).addScaledVector(right, x).normalize()
        : new THREE.Vector3(c.dir.x, 0, c.dir.z).normalize().multiplyScalar(0.3);
      want.y = rise * 0.8;
      c.dir.lerp(want.normalize(), Math.min(1, dt * 6)).normalize();
      c.pos.addScaledVector(c.dir, c.speed * 1.6 * Math.max(mag, Math.abs(rise)) * dt);
      c.moving = 1;
    } else {
      c.moving = 0.3;
    }

    c.pos.x = Math.max(-BOUNDS, Math.min(BOUNDS, c.pos.x));
    c.pos.z = Math.max(-BOUNDS, Math.min(BOUNDS, c.pos.z));
    this.poseCreature(c, dt, vertical);
  }

  /** Kin drift toward their slot around the leader, moving and animating like it. */
  moveFollowers(lead, dt, t) {
    const vertical = this.aquatic || lead.flying;
    for (const f of this.followers) {
      const target = lead.pos.clone().add(f.offset);
      target.x += Math.sin(t * 0.7 + f.phase) * 0.3 * f.scale;
      target.z += Math.cos(t * 0.6 + f.phase) * 0.3 * f.scale;
      if (vertical) target.y += Math.sin(t * 0.9 + f.phase) * 0.2;
      const to = target.sub(f.pos);
      if (!vertical) to.y = 0;
      f.pos.addScaledVector(to, Math.min(1, dt * 2.2));
      const flat = new THREE.Vector3(to.x, vertical ? to.y : 0, to.z);
      const heading = flat.lengthSq() > 0.04 ? flat.normalize() : lead.dir;
      f.dir.lerp(heading, Math.min(1, dt * 4)).normalize();
      f.moving = Math.max(lead.moving, Math.min(1, to.length()));
      this.poseCreature(f, dt, vertical);
    }
  }

  /** Keep a creature at a valid height, then place, orient and animate its mesh. */
  poseCreature(c, dt, vertical) {
    const ground = groundHeight(c.pos.x, c.pos.z);
    if (!vertical) {
      c.pos.y = Math.max(ground, WATER_LEVEL) + c.legHeight * c.scale;
    } else {
      const floor = c.flying ? Math.max(ground, WATER_LEVEL) + 1.5 : ground + 0.8 * c.scale;
      c.pos.y = Math.max(floor, Math.min(14, c.pos.y));
    }

    c.grow = Math.min(1, c.grow + dt * 1.5);
    const bounce = c.grow < 1 ? 1 + Math.sin(c.grow * Math.PI) * 0.35 : 1;
    c.root.scale.setScalar(c.scale * Math.max(0.05, c.grow) * bounce);
    c.root.position.copy(c.pos);
    const look = new THREE.Vector3(c.dir.x, vertical ? Math.max(-0.6, Math.min(0.6, c.dir.y)) : 0, c.dir.z);
    // Cephalopods swim mantle-first, with their arms trailing behind, so they face away from where they go.
    if (look.lengthSq() > 1e-4) c.root.lookAt(c.pos.clone()[c.backward ? 'sub' : 'add'](look));

    c.anim += dt * (3 + c.speed) * c.moving;
    const w = c.anim + c.phase;
    if (c.cell) c.cell.scale.set(1 + Math.sin(w) * 0.06, 1 - Math.sin(w) * 0.06, 1 + Math.cos(w) * 0.05);
    for (const p of c.parts.swing) p.rotation.y = Math.sin(w * 1.6) * 0.45;
    for (const p of c.parts.flap) p.rotation.z = p.userData.side * (0.3 + Math.sin(w * 1.4) * 0.35);
    for (const p of c.parts.legs) p.rotation.x = Math.sin(w * 2 + p.userData.offset) * 0.6;
    for (const p of c.parts.wings) p.rotation.z = p.userData.side * Math.sin(w * 2.5) * 0.7;
    for (const p of c.parts.wingTips) p.rotation.z = Math.sin(w * 2.5 - 0.9) * 0.45; // outer wing trails the flap
    for (const p of c.parts.spin) p.rotation.z += dt * 8;
    for (const p of c.parts.flick) p.rotation.x = Math.sin(w * 1.6) * 0.3;
  }

  clear(group) {
    for (const child of [...group.children]) {
      group.remove(child);
      child.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) [].concat(o.material).forEach((m) => m.dispose());
      });
    }
  }
}

// ── Food items ──────────────────────────────────────────────────────────

const FOOD_COLORS = { nutrients: 0xfff1a0, plants: 0x5cc46a, meat: 0xc2453c };

/** A small, softly glowing item: nutrient specks, a plant clump (or berry bush on land), or a chunk of meat. */
function buildFood(type, aquatic) {
  const g = new THREE.Group();
  const glow = (color, k = 0.3) => mat(color, { emissive: color, emissiveIntensity: k });
  if (type === 'nutrients') {
    for (let i = 0; i < 5; i++) {
      const speck = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), glow(FOOD_COLORS.nutrients, 0.9));
      speck.position.set(rand(-0.2, 0.2), rand(-0.15, 0.15), rand(-0.2, 0.2));
      g.add(speck);
    }
  } else if (type === 'plants') {
    if (aquatic) {
      for (let i = 0; i < 4; i++) {
        const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), glow(FOOD_COLORS.plants));
        blob.position.set(rand(-0.15, 0.15), i * 0.12, rand(-0.15, 0.15));
        blob.scale.set(1, 0.6, 1);
        g.add(blob);
      }
    } else {
      g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), glow(0x4f9a3c, 0.2)));
      for (let i = 0; i < 5; i++) {
        const berry = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), glow(0xd63a4a, 0.5));
        const a = i * 1.26;
        berry.position.set(Math.cos(a) * 0.24, rand(0, 0.18), Math.sin(a) * 0.24);
        g.add(berry);
      }
    }
  } else {
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), glow(FOOD_COLORS.meat));
    chunk.scale.set(1.3, 0.8, 1);
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 5), glow(0xf0e6d0, 0.2));
    bone.rotation.z = Math.PI / 2.4;
    g.add(chunk, bone);
  }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

// ── Creature construction ───────────────────────────────────────────────

/** Build one individual. Its body plan is read straight from the species' tags. */
function buildCreature(g) {
  const tags = g.tags;
  const root = new THREE.Group();
  const parts = { swing: [], flap: [], legs: [], wings: [], wingTips: [], spin: [], flick: [] };
  const line = g.diet?.line;
  const color = new THREE.Color(line ? LINE_COLORS[line] : 0x9fd8c8);
  if (tags.has('camouflage')) color.lerp(new THREE.Color(0x556b2f), 0.4);
  if (tags.has('fur')) color.lerp(new THREE.Color(0x8b5a2b), 0.6);
  if (tags.has('feathers')) color.lerp(new THREE.Color(0xc9955a), 0.3);
  if (tags.has('deepSea')) color.lerp(new THREE.Color(0x553366), 0.35);
  if (tags.has('coldBlooded')) color.lerp(new THREE.Color(0x4a7a4a), 0.3);
  if (tags.has('amphibian')) color.lerp(new THREE.Color(0x5a9a4a), 0.4);
  if (tags.has('poisonSkin')) color.lerp(new THREE.Color(0xff6a10), 0.75);
  if (tags.has('cephalopod')) color.lerp(new THREE.Color(0xd9826a), 0.35);

  let scale = 0.55 + g.traits.size * 0.12;
  if (tags.has('giant')) scale *= 1.7;
  if (tags.has('swarm')) scale *= 0.45;

  if (g.era === 0) {
    // Single-celled stage.
    const cell = new THREE.Group();
    const membrane = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.6, 2),
      new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: 0.55, roughness: 0.2, flatShading: true }),
    );
    const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(color.clone().multiplyScalar(0.5)));
    nucleus.position.set(0.1, 0.05, -0.05);
    cell.add(membrane, nucleus);
    for (let i = 0; i < 4; i++) {
      const org = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), mat(line === 'herbivore' ? 0x2e8b2e : 0xeeeeaa));
      org.position.set(rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.3, 0.3));
      cell.add(org);
    }
    root.add(cell);
    if (line === 'carnivore' || tags.has('aerobic')) {
      const pivot = new THREE.Group();
      pivot.position.z = -0.55;
      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.04, 1.1, 4), mat(color));
      flag.rotation.x = -Math.PI / 2;
      flag.position.z = -0.5;
      pivot.add(flag);
      root.add(pivot);
      parts.swing.push(pivot);
    }
    return { root, parts, scale, legHeight: 0.6, cell };
  }

  const land = tags.has('terrestrial');
  const seaArthropod = tags.has('exoskeleton') && !land; // built like a crustacean, below
  const len = 1 + (tags.has('spine') ? 0.6 : 0) + (tags.has('fast') ? 0.3 : 0) + (tags.has('exoskeleton') ? 0.2 : 0);
  const bodyMat = mat(color);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), bodyMat);
  body.scale.set(0.8, 0.7, len);
  root.add(body);
  const front = len * 0.45;

  // Head, eyes and mouth.
  if (tags.has('intelligence')) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), bodyMat);
    dome.position.set(0, 0.22, front - 0.05);
    root.add(dome);
  }
  const eyeR = (tags.has('keenEyes') ? 0.13 : 0.09) * (tags.has('cephalopod') ? 1.4 : 1);
  const eyeY = tags.has('amphibian') ? 0.23 : 0.14; // frogs' eyes bulge from the top of the head
  for (const side of [-1, 1]) {
    if (tags.has('exoskeleton')) {
      // Compound eyes: dark, glossy domes made of many facets.
      const eye = new THREE.Mesh(
        new THREE.IcosahedronGeometry(eyeR * 1.4, 1),
        new THREE.MeshStandardMaterial({ color: 0x2b3340, emissive: 0x16202c, metalness: 0.5, roughness: 0.25, flatShading: true }),
      );
      eye.position.set(side * 0.27, 0.16, front - 0.1);
      eye.scale.set(0.8, 1, 1);
      root.add(eye);
      continue;
    }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 8, 6), mat(0xffffff, { flatShading: false }));
    eye.position.set(side * 0.26, eyeY, front - 0.08);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.5, 6, 4), mat(0x111111));
    pupil.position.set(side * eyeR * 0.5, 0, eyeR * 0.6);
    eye.add(pupil);
    root.add(eye);
  }
  if (line === 'carnivore' || line === 'omnivore') {
    const toothMat = mat(tags.has('venom') ? 0xb050ff : 0xffffff);
    const teeth = line === 'carnivore' ? 4 : 2;
    for (let i = 0; i < teeth; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 4), toothMat);
      tooth.position.set((i - (teeth - 1) / 2) * 0.08, -0.1, front + 0.02);
      tooth.rotation.x = Math.PI;
      root.add(tooth);
    }
  }
  if (line === 'herbivore' || line === 'omnivore') {
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mat(color.clone().lerp(new THREE.Color(0xffffff), 0.3)));
    snout.position.set(0, -0.05, front + 0.03);
    root.add(snout);
  }

  // Tail (feathered flyers and sea arthropods get a fan instead, below).
  let tailPivot = null;
  const cephalopod = tags.has('cephalopod');
  if (!seaArthropod && !cephalopod && (!tags.has('flight') || !tags.has('feathers'))) {
    const pivot = new THREE.Group();
    tailPivot = pivot;
    pivot.position.z = -len * 0.45;
    const big = tags.has('fast') ? 1.4 : 1;
    const tail = land
      ? new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.9, 5), bodyMat)
      : new THREE.Mesh(new THREE.ConeGeometry(0.32 * big, 0.6 * big, 4), bodyMat);
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = land ? -0.4 : -0.25 * big;
    if (!land) tail.scale.x = 0.25;
    pivot.add(tail);
    if (tags.has('venom')) {
      const sting = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 4), mat(0xb050ff));
      sting.rotation.x = -Math.PI / 2;
      sting.position.z = land ? -0.9 : -0.6;
      pivot.add(sting);
    }
    root.add(pivot);
    parts.swing.push(pivot);
  }

  // Armor.
  if (tags.has('shell') && !seaArthropod && !tags.has('cephalopod')) { // a cephalopod's shell is its coil, below
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      mat(tags.has('pressureArmor') ? 0x3c3c48 : 0xc9a66b),
    );
    shell.scale.set(0.85, 0.75, len * 0.95);
    shell.position.y = 0.04;
    root.add(shell);
  }
  if (tags.has('exoskeleton')) {
    const ringMat = mat(color.clone().multiplyScalar(0.55));
    if (land) {
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.05, 5, 12), ringMat);
        ring.position.z = (i - 1) * len * 0.25;
        root.add(ring);
      }
    } else {
      addSeaArthropod(root, parts, { len, front, color, line, tags });
    }
    for (const side of [-1, 1]) {
      // Arachnids have grasping pedipalps where insects have antennae; sea arthropods have long ones.
      const arachnid = tags.has('arachnid');
      const feelerLen = arachnid ? 0.35 : land ? 0.8 : 1.2;
      const feeler = new THREE.Mesh(new THREE.CylinderGeometry(arachnid ? 0.03 : 0.015, 0.012, feelerLen, 4), ringMat);
      feeler.position.set(side * 0.12, arachnid ? -0.05 : 0.3, front + (arachnid ? 0.15 : land ? 0.2 : 0.3));
      feeler.rotation.set(arachnid ? 1.3 : land ? 0.9 : 1.15, 0, side * -0.4);
      root.add(feeler);
    }
  }
  if (tags.has('pressureArmor') && !tags.has('shell') && !seaArthropod) {
    for (let i = 0; i < 4; i++) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.3), mat(0x3c3c48));
      plate.position.set(0, 0.32, (i - 1.5) * 0.3);
      root.add(plate);
    }
  }
  if (tags.has('spine') && !land) {
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 3), bodyMat);
    dorsal.scale.z = 2;
    dorsal.position.set(0, 0.4, 0);
    root.add(dorsal);
  }
  if (tags.has('spikes')) {
    const spikeMat = mat(0xe8e0c8);
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 4), spikeMat);
      spike.position.set(0, 0.38, (i - 1.5) * len * 0.18);
      root.add(spike);
    }
  }
  if (tags.has('poisonSkin')) {
    const spotMat = mat(0x1a1a1a);
    for (let i = 0; i < 9; i++) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 6, 4), spotMat);
      const z = (i / 8 - 0.5) * len * 0.75, a = ((i * 1.7) % 2.2) - 1.1;
      spot.position.set(Math.sin(a) * 0.36 * Math.sqrt(1 - (z / (len * 0.5)) ** 2), Math.cos(a) * 0.3, z);
      spot.scale.set(1, 0.4, 1);
      spot.lookAt(spot.position.clone().multiplyScalar(2));
      root.add(spot);
    }
  }
  if (tags.has('fur')) addFur(root, tailPivot && land ? tailPivot : null, { len, front, color });
  if (tags.has('feathers')) addFeathers(root, tags.has('flight') ? null : tailPivot, { len, front, color, flying: tags.has('flight') });
  if (tags.has('bioluminescence')) {
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x66ffee, emissive: 0x66ffee, emissiveIntensity: 3 });
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 4), mat(color));
    stalk.position.set(0, 0.45, front);
    stalk.rotation.x = 0.6;
    const lure = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), glowMat);
    lure.position.set(0, 0.7, front + 0.18);
    root.add(stalk, lure);
    for (let i = 0; i < 6; i++) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), glowMat);
      spot.position.set((i % 2 ? 1 : -1) * 0.38, -0.05, (Math.floor(i / 2) - 1) * len * 0.22);
      root.add(spot);
    }
  }

  // Locomotion: fins in water, legs on land, wings in the air.
  let legHeight = 0.35;
  if (cephalopod) addCephalopod(root, parts, { len, front, color, tags });
  if (tags.has('glider')) {
    // Long, wing-like fins for gliding over the waves.
    const finMat = mat(color.clone().lerp(new THREE.Color(0xdff4ff), 0.35), { side: THREE.DoubleSide });
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.3, 0.05, front * 0.25);
      pivot.userData.side = side;
      const s = new THREE.Shape();
      s.moveTo(0, -0.05);
      s.quadraticCurveTo(0.7, 0.05, 1.1, 0.35);
      s.quadraticCurveTo(0.5, 0.45, 0, 0.35);
      const fin = new THREE.Mesh(flatGeo(s), finMat);
      fin.scale.x = side;
      pivot.add(fin);
      root.add(pivot);
      parts.flap.push(pivot);
    }
  }
  if (!land) {
    for (const side of seaArthropod || cephalopod || tags.has('glider') ? [] : [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.35, -0.05, front * 0.3);
      pivot.userData.side = side;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.03, 0.25), bodyMat);
      fin.position.x = side * 0.22;
      pivot.add(fin);
      root.add(pivot);
      parts.flap.push(pivot);
    }
  } else {
    // Vertebrates walk on four upright legs; arthropods on six or eight thin, splayed ones.
    const legMat = mat(color.clone().multiplyScalar(0.7));
    const arthropod = tags.has('exoskeleton');
    const pairs = !arthropod ? 2 : tags.has('arachnid') ? 4 : 3;
    const legLen = arthropod ? 0.75 : 0.55;
    const splay = arthropod ? 0.75 : tags.has('amphibian') ? 0.55 : 0; // amphibians sprawl
    legHeight = 0.2 + legLen * Math.cos(splay);
    for (const side of [-1, 1]) {
      for (let k = 0; k < pairs; k++) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.3, -0.2, (k / (pairs - 1) - 0.5) * len * 0.5);
        pivot.rotation.z = side * splay;
        pivot.userData.offset = ((k + (side > 0 ? 1 : 0)) % 2) * Math.PI; // alternating gait
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(arthropod ? 0.035 : 0.07, arthropod ? 0.025 : 0.05, legLen, 5), legMat);
        leg.position.y = -legLen / 2;
        pivot.add(leg);
        root.add(pivot);
        // Flyers tuck their legs back; walkers swing them.
        if (tags.has('flight')) pivot.rotation.x = 1.2;
        else parts.legs.push(pivot);
      }
    }
  }
  if (tags.has('flight') && tags.has('insect')) {
    // Two pairs of veined membranes; butterfly-like scaled wings after metamorphosis.
    const scaled = tags.has('metamorphosis');
    for (const [z, length] of [[front * 0.3, 1.1], [front * -0.05, 0.85]]) {
      for (const side of [-1, 1]) {
        const shoulder = buildInsectWing(side, length, scaled ? color.clone().lerp(new THREE.Color(0xff9a1f), 0.6) : null);
        shoulder.position.set(side * 0.2, 0.3, z);
        root.add(shoulder);
        parts.wings.push(shoulder);
      }
    }
  } else if (tags.has('flight')) {
    const feathered = tags.has('feathers');
    for (const side of [-1, 1]) {
      const { shoulder, wrist } = buildWing(side, feathered, color);
      shoulder.position.set(side * 0.3, 0.15, front * 0.2);
      root.add(shoulder);
      parts.wings.push(shoulder);
      parts.wingTips.push(wrist);
    }
    if (feathered) {
      // Fanned tail feathers in place of the usual tail.
      const tailMat = mat(0xf2efe6, { side: THREE.DoubleSide });
      for (let i = 0; i < 5; i++) {
        const f = new THREE.Mesh(featherGeo(0.55, 0.08), tailMat);
        f.position.set(0, 0.05 + i * 0.003, -len * 0.4);
        f.rotation.y = (i - 2) * 0.22;
        root.add(f);
      }
    }
  }

  root.traverse((o) => { o.castShadow = true; });
  return { root, parts, scale, legHeight, backward: cephalopod };
}

// ── Cephalopods ─────────────────────────────────────────────────────────

/**
 * A cephalopod: eight arms reaching forward from the head (two long feeding tentacles
 * after Jet Propulsion, plus fins on the mantle), or a coiled, chambered ammonite shell.
 */
function addCephalopod(root, parts, { len, front, color, tags }) {
  const armMat = mat(color.clone().multiplyScalar(0.85));
  const suckerMat = mat(color.clone().lerp(new THREE.Color(0xffffff), 0.45));
  const jet = tags.has('jet');
  for (let i = 0; i < (jet ? 10 : 8); i++) {
    const long = jet && i >= 8; // the two feeding tentacles
    const a = long ? (i === 8 ? -0.5 : 0.5) : ((i + 0.5) / 8) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * 0.18, Math.sin(a) * 0.15 - 0.05, front - 0.02);
    pivot.rotation.set(-Math.sin(a) * 0.35, Math.cos(a) * 0.35, 0);
    const armLen = long ? 1.0 : 0.6;
    const arm = new THREE.Mesh(new THREE.ConeGeometry(0.06, armLen, 5), armMat);
    arm.rotation.x = Math.PI / 2;
    arm.position.z = armLen / 2;
    pivot.add(arm);
    if (long) {
      const club = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), suckerMat);
      club.scale.set(1, 0.6, 1.8);
      club.position.z = armLen * 0.85;
      pivot.add(club);
    }
    root.add(pivot);
    parts.flick.push(pivot);
  }
  if (jet) {
    // A pointed mantle with two fins at the back.
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 8), mat(color));
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -len * 0.5;
    root.add(tip);
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.1, 0, -len * 0.45);
      pivot.userData.side = side;
      const s = new THREE.Shape();
      s.moveTo(0, -0.15);
      s.quadraticCurveTo(0.45, 0.05, 0, 0.35);
      const fin = new THREE.Mesh(flatGeo(s), mat(color, { side: THREE.DoubleSide }));
      fin.scale.x = side;
      pivot.add(fin);
      root.add(pivot);
      parts.flap.push(pivot);
    }
  } else if (tags.has('coiledShell')) {
    // An ammonite's coil: chambers growing along a spiral, banded in cream and brown.
    const shell = new THREE.Group();
    const cream = mat(0xe8d9b5), brown = mat(0x9a6a3f);
    for (let i = 0; i < 22; i++) {
      const th = i * 0.45;
      const r = 0.06 * Math.exp(0.11 * th);
      const chamber = new THREE.Mesh(new THREE.SphereGeometry(0.05 + r * 0.55, 8, 6), i % 3 ? cream : brown);
      chamber.position.set(0, Math.sin(th) * r, -Math.cos(th) * r);
      shell.add(chamber);
    }
    // Big enough that the body seems to peek out of it, as an ammonite's did.
    shell.position.set(0, 0.05, -len * 0.25);
    shell.scale.setScalar(3);
    root.add(shell);
  }
}

// ── Coats ───────────────────────────────────────────────────────────────
// Fur and feathers are many small pieces, merged into one mesh per color to stay cheap
// when a whole herd or flock is on screen.

const UP = new THREE.Vector3(0, 1, 0);
const BODY = { rx: 0.4, ry: 0.35 }; // the body ellipsoid's half-width and half-height (half-length is len / 2)

/** Points in rows over the top and flanks of the body, with outward normals. */
function coatPoints(len, rows, perRow, spread) {
  const rz = len * 0.5;
  const out = [];
  for (let i = 0; i < rows; i++) {
    const z = rz * (0.8 - (1.65 * i) / (rows - 1));
    const s = Math.sqrt(1 - (z / rz) ** 2);
    for (let j = 0; j < perRow; j++) {
      const a = -spread + (2 * spread * (j + (i % 2) * 0.5)) / perRow;
      const pos = new THREE.Vector3(BODY.rx * s * Math.sin(a), BODY.ry * s * Math.cos(a), z);
      const normal = new THREE.Vector3(pos.x / BODY.rx ** 2, pos.y / BODY.ry ** 2, z / rz ** 2).normalize();
      out.push({ pos, normal, row: i });
    }
  }
  return out;
}

/** Place a copy of `geo` at `pos`, turned so its +y points along `dir`. */
function placed(geo, pos, dir, scale = 1) {
  const m = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()), new THREE.Vector3().setScalar(scale));
  return geo.clone().applyMatrix4(m);
}

/** One mesh from many placed pieces (which are then freed). Pieces may mix indexed and non-indexed shapes. */
function merged(pieces, material) {
  const flat = pieces.map((p) => (p.index ? p.toNonIndexed() : p));
  const mesh = new THREE.Mesh(mergeGeometries(flat), material);
  new Set([...pieces, ...flat]).forEach((p) => p.dispose());
  return mesh;
}

/** A shaggy two-tone coat swept backward, a ruff behind the head and a bushy tail. */
function addFur(root, tail, { len, front, color }) {
  // The coat: soft puffs, longer front to back, overlapping like a woolly fleece.
  const puff = new THREE.IcosahedronGeometry(0.1, 0);
  puff.scale(1, 0.55, 1.5);
  const back = new THREE.Vector3(0, 0, -1);
  const dark = [], light = [];
  for (const [i, { pos, normal }] of coatPoints(len, 12, 10, 2.2).entries()) {
    (i % 3 ? dark : light).push(placed(puff, pos, normal, rand(0.9, 1.25)));
  }
  puff.dispose();
  // Locks of hair for the ruff and the tail: flattened cones swept back.
  const tuft = new THREE.ConeGeometry(0.09, 0.17, 5);
  tuft.translate(0, 0.07, 0); // grow from the base
  tuft.scale(0.45, 1, 1);
  for (let k = 0; k < 11; k++) {
    const a = -2.3 + k * 0.46;
    const pos = new THREE.Vector3(Math.sin(a) * 0.36, Math.cos(a) * 0.31, front * 0.55);
    dark.push(placed(tuft, pos, new THREE.Vector3(Math.sin(a), Math.cos(a), -1.2), 1.5));
  }
  root.add(merged(dark, mat(color.clone().multiplyScalar(0.72))), merged(light, mat(color.clone().lerp(new THREE.Color(0xffffff), 0.15))));
  tuft.dispose();
  if (!tail) return;
  // Along the land tail (a cone from z = 0.05 to -0.85 in its pivot), ending in a brush.
  const brush = new THREE.ConeGeometry(0.07, 0.24, 4);
  brush.translate(0, 0.1, 0);
  const tailTufts = [];
  for (let t = 0; t < 6; t++) {
    const z = -0.1 - t * 0.13;
    const r = 0.14 * (0.85 + z) / 0.9;
    for (let k = 0; k < 4; k++) {
      const a = k * (Math.PI / 2) + t * 0.6;
      tailTufts.push(placed(brush, new THREE.Vector3(Math.sin(a) * r, Math.cos(a) * r, z), new THREE.Vector3(Math.sin(a), Math.cos(a), -1.2), 1.1));
    }
  }
  tailTufts.push(placed(brush, new THREE.Vector3(0, 0, -0.82), back, 1.6));
  tail.add(merged(tailTufts, mat(color.clone().multiplyScalar(0.72))));
  brush.dispose();
}

/** Overlapping contour feathers, a crest, folded wings and (on the ground) a tail fan. */
function addFeathers(root, tail, { len, front, color, flying }) {
  const ds = { side: THREE.DoubleSide };
  // Rounded contour feathers lying back along the body, overlapping like roof tiles, with
  // their tips lifted a little so the plumage looks soft.
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.13, 0.12, 0, 0.3);
  shape.quadraticCurveTo(-0.13, 0.12, 0, 0);
  const contour = flatGeo(shape);
  contour.rotateX(0.3);
  const rows = [[], []];
  for (const { pos, normal, row } of coatPoints(len, 11, 9, 1.95)) rows[row % 2].push(placed(contour, pos.clone().addScaledVector(normal, 0.01), normal));
  contour.dispose();
  root.add(merged(rows[0], mat(color.clone().multiplyScalar(0.92), ds)), merged(rows[1], mat(color.clone().lerp(new THREE.Color(0xffffff), 0.08), ds)));

  // A fan of crest feathers standing up on the head, sweeping back.
  const crestMat = mat(0xffc93c, ds);
  for (let k = 0; k < 4; k++) {
    const crest = new THREE.Mesh(featherGeo(0.32 - k * 0.04, 0.07), crestMat);
    crest.position.set(0, 0.3, front - 0.12 - k * 0.05);
    crest.rotation.set(1.25 - k * 0.22, 0, Math.PI / 2);
    root.add(crest);
  }
  if (flying) return; // flyers have real wings and a tail fan already

  // Folded wings: layered long feathers lying along each flank.
  const quill = mat(0xf2efe6, ds);
  const wingTip = mat(color.clone().multiplyScalar(0.55), ds);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const f = new THREE.Mesh(featherGeo(0.5 - k * 0.06, 0.08), k === 0 ? wingTip : quill);
      f.position.set(side * (0.37 - k * 0.01), 0.08 - k * 0.04, front * 0.25 - k * 0.04);
      f.rotation.set(0.12 + k * 0.08, 0, side * (Math.PI / 2 - 0.25));
      root.add(f);
    }
  }
  if (!tail) return;
  // Tail fan at the tip of the tail (which ends at z = -0.85 in its pivot).
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(featherGeo(0.5, 0.08), i % 2 ? quill : wingTip);
    f.position.set(0, 0.02 + i * 0.004, -0.55);
    f.rotation.y = (i - 2) * 0.24;
    tail.add(f);
  }
}

/**
 * Sea arthropods are built like crustaceans: overlapping back plates (a broad head shield
 * with a shell), paddle legs that beat in a wave, jointed walking legs, a flicking tail fan,
 * short antennules and, for carnivores, a pair of claws.
 */
function addSeaArthropod(root, parts, { len, front, color, line, tags }) {
  const half = len * 0.5;
  const armor = mat(tags.has('pressureArmor') ? 0x3c3c48 : color.clone().multiplyScalar(0.55));
  const limbMat = mat(color.clone().multiplyScalar(0.7));
  const dome = new THREE.SphereGeometry(0.5, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2);

  // Back plates, shrinking with the body's taper.
  for (let i = 0; i < 6; i++) {
    const z = half * 0.75 - (i / 5) * half * 1.55;
    const taper = Math.sqrt(Math.max(0.2, 1 - (z / half) ** 2));
    const plate = new THREE.Mesh(dome, armor);
    plate.scale.set(0.86 * taper, 0.8 * taper, len * 0.2);
    plate.position.z = z;
    root.add(plate);
  }
  if (tags.has('shell')) {
    // A broad head shield, like a trilobite's or a horseshoe crab's, stopping short of the eyes.
    const shield = new THREE.Mesh(dome, mat(tags.has('pressureArmor') ? 0x3c3c48 : 0xc9a66b));
    shield.scale.set(1.25, 0.9, len * 0.6);
    shield.position.set(0, -0.02, len * 0.05);
    root.add(shield);
  }

  // Paddle legs under the belly; a wave of strokes runs from front to back.
  for (let k = 0; k < 5; k++) {
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.18, -0.26, half * 0.35 - k * half * 0.3);
      pivot.rotation.z = side * 0.3;
      pivot.userData.offset = k * 0.8;
      const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 0.12), limbMat);
      paddle.position.y = -0.12;
      pivot.add(paddle);
      root.add(pivot);
      parts.legs.push(pivot);
    }
  }

  // Jointed walking legs, splayed out and bent down at the knee.
  const legGeo = new THREE.CylinderGeometry(0.03, 0.022, 0.32, 5);
  for (let k = 0; k < 3; k++) {
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.3, -0.12, half * 0.5 - k * half * 0.25);
      hip.rotation.set(0, side * (0.35 - k * 0.35), side * 1.0);
      const upper = new THREE.Mesh(legGeo, limbMat);
      upper.position.y = -0.16;
      const knee = new THREE.Group();
      knee.position.y = -0.32;
      knee.rotation.z = -side * 1.3;
      const lower = new THREE.Mesh(legGeo, limbMat);
      lower.position.y = -0.16;
      knee.add(lower);
      hip.add(upper, knee);
      root.add(hip);
    }
  }

  // Short antennules beside the long antennae.
  for (const side of [-1, 1]) {
    const antennule = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.01, 0.35, 4), armor);
    antennule.position.set(side * 0.07, 0.12, front + 0.12);
    antennule.rotation.set(1.2, 0, side * -0.6);
    root.add(antennule);
  }

  if (line === 'carnivore') {
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.28, -0.1, front - 0.1);
      arm.rotation.y = side * 0.35;
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.4, 5), limbMat);
      fore.rotation.x = Math.PI / 2;
      fore.position.z = 0.2;
      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), armor);
      palm.scale.set(0.8, 0.6, 1.4);
      palm.position.z = 0.45;
      arm.add(fore, palm);
      for (const jaw of [1, -1]) {
        const finger = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.24, 4), armor);
        finger.position.set(0, jaw * 0.035, 0.62);
        finger.rotation.x = Math.PI / 2 - jaw * 0.25; // slightly open pincer
        arm.add(finger);
      }
      root.add(arm);
    }
  }

  // Tail fan: a central telson between two pairs of paddles, flicking up and down.
  const fan = new THREE.Group();
  fan.position.z = -half * 0.92;
  fan.scale.setScalar(tags.has('fast') ? 1.4 : 1);
  const fanMat = mat(color.clone().multiplyScalar(0.55), { side: THREE.DoubleSide });
  const telson = new THREE.Shape();
  telson.moveTo(-0.07, 0);
  telson.lineTo(0.07, 0);
  telson.lineTo(0.04, 0.42);
  telson.lineTo(-0.04, 0.42);
  fan.add(new THREE.Mesh(flatGeo(telson), tags.has('venom') ? mat(0xb050ff, { side: THREE.DoubleSide }) : fanMat));
  const uropod = new THREE.Shape();
  uropod.moveTo(0, 0);
  uropod.quadraticCurveTo(0.22, 0.2, 0.08, 0.4);
  uropod.quadraticCurveTo(-0.02, 0.22, 0, 0);
  const uropodGeo = flatGeo(uropod);
  for (const side of [-1, 1]) {
    for (const spread of [0.15, 0.55]) {
      const paddle = new THREE.Mesh(uropodGeo, fanMat);
      paddle.scale.x = side;
      paddle.position.set(side * 0.05, 0.005, 0);
      paddle.rotation.y = -side * spread * 0.5;
      fan.add(paddle);
    }
  }
  root.add(fan);
  parts.flick.push(fan);
}

// ── Wings ───────────────────────────────────────────────────────────────
// Wing parts are modeled for the right side in the xz-plane (+x outward, -z back)
// and mirrored for the left. Each wing has a shoulder and a wrist joint so the
// outer half can trail behind the flap.

/** Flat geometry from a 2D shape whose +y points backward. */
function flatGeo(shape) {
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/** A flight feather pointing backward, with the narrow vane on the leading side. */
function featherGeo(length, width) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(width * 2.2, length * 0.45, 0, length);
  s.quadraticCurveTo(-width * 1.2, length * 0.4, 0, 0);
  return flatGeo(s);
}

/** A tapered bone between two points given in wing-shape coordinates. */
function bone(parent, material, [x1, y1], [x2, y2], r) {
  const a = new THREE.Vector3(x1, 0.012, -y1);
  const b = new THREE.Vector3(x2, 0.012, -y2);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r, a.distanceTo(b), 5), material);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  parent.add(m);
}

/** A single insect wing: a long membrane, clear and veined unless `scaleColor` is given. */
function buildInsectWing(side, length, scaleColor) {
  const shoulder = new THREE.Group();
  shoulder.userData.side = side;
  const half = new THREE.Group();
  half.scale.x = side;
  shoulder.add(half);
  const s = new THREE.Shape();
  s.moveTo(0, -0.03);
  s.quadraticCurveTo(length * 0.6, -0.12, length, 0.08);
  s.quadraticCurveTo(length * 0.9, 0.32, length * 0.45, 0.3);
  s.quadraticCurveTo(length * 0.15, 0.28, 0, 0.08);
  const membrane = scaleColor
    ? mat(scaleColor, { side: THREE.DoubleSide })
    : new THREE.MeshPhysicalMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.35, roughness: 0.1, side: THREE.DoubleSide });
  half.add(new THREE.Mesh(flatGeo(s), membrane));
  const veinMat = mat(scaleColor ? 0x2e2620 : 0x4a5560);
  for (const tip of [[length, 0.08], [length * 0.8, 0.28], [length * 0.45, 0.3]]) bone(half, veinMat, [0, 0.02], tip, 0.012);
  return shoulder;
}

function buildWing(side, feathered, color) {
  const shoulder = new THREE.Group();
  shoulder.userData.side = side;
  const half = new THREE.Group();
  half.scale.x = side;
  shoulder.add(half);
  const wrist = new THREE.Group();
  wrist.position.x = 0.7;
  half.add(wrist);
  const ds = { side: THREE.DoubleSide };

  if (feathered) {
    const covertMat = mat(color, ds);
    const quill = mat(0xf2efe6, ds);
    const tip = mat(0x2e2e36, ds);
    bone(half, covertMat, [0, -0.02], [0.72, -0.02], 0.05);
    bone(wrist, covertMat, [0, -0.02], [0.4, 0.02], 0.04);
    // Coverts: the short feathers layered over the arm and hand.
    const arm = new THREE.Shape();
    arm.moveTo(0, -0.06);
    arm.lineTo(0.72, -0.05);
    arm.quadraticCurveTo(0.74, 0.12, 0.7, 0.2);
    arm.quadraticCurveTo(0.35, 0.3, 0, 0.3);
    const armMesh = new THREE.Mesh(flatGeo(arm), covertMat);
    armMesh.position.y = 0.02;
    half.add(armMesh);
    const hand = new THREE.Shape();
    hand.moveTo(0, -0.05);
    hand.lineTo(0.42, 0);
    hand.quadraticCurveTo(0.3, 0.15, 0, 0.22);
    const handMesh = new THREE.Mesh(flatGeo(hand), covertMat);
    handMesh.position.y = 0.02;
    wrist.add(handMesh);
    // Secondaries along the arm, primaries fanning from the hand.
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(featherGeo(0.5, 0.07), quill);
      f.position.set(0.06 + i * 0.12, i * 0.002, 0.05);
      f.rotation.y = -i * 0.04;
      half.add(f);
    }
    const lengths = [0.55, 0.6, 0.66, 0.72, 0.8, 0.84, 0.78];
    lengths.forEach((l, i) => {
      const f = new THREE.Mesh(featherGeo(l, 0.075), i >= 4 ? tip : quill);
      f.position.set(0.04 + i * 0.055, i * 0.002, 0.02);
      f.rotation.y = -0.15 - i * 0.18;
      wrist.add(f);
    });
  } else {
    // Skin stretched over a long arm and fingers, like a bat or a pterosaur.
    const skin = mat(color.clone().multiplyScalar(0.75), ds);
    const boneMat = mat(color.clone().multiplyScalar(0.5));
    bone(half, boneMat, [0, -0.02], [0.7, -0.02], 0.045);
    const inner = new THREE.Shape();
    inner.moveTo(0, -0.02);
    inner.lineTo(0.7, -0.02);
    inner.lineTo(0.7, 0.45);
    inner.quadraticCurveTo(0.35, 0.36, 0, 0.6);
    half.add(new THREE.Mesh(flatGeo(inner), skin));
    const outer = new THREE.Shape();
    outer.moveTo(0, -0.02);
    outer.lineTo(0.9, 0.12);
    outer.quadraticCurveTo(0.68, 0.2, 0.62, 0.42);
    outer.quadraticCurveTo(0.32, 0.3, 0, 0.45);
    wrist.add(new THREE.Mesh(flatGeo(outer), skin));
    for (const tipPt of [[0.9, 0.12], [0.62, 0.42], [0.25, 0.42]]) bone(wrist, boneMat, [0, -0.02], tipPt, 0.03);
    const clawMat = mat(0xe8e0c8);
    for (let i = 0; i < 3; i++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.09, 4), clawMat);
      claw.position.set(0.02 + i * 0.03, 0.02, 0.06);
      claw.rotation.x = Math.PI / 2;
      wrist.add(claw);
    }
  }
  return { shoulder, wrist };
}
