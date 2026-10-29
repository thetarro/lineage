// 3D rendering: habitat dioramas, procedural creatures and extinction effects.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LINE_COLORS } from './data.js';
import { SPECIES, lifeFor } from './fauna.js';

const WATER_LEVEL = -0.4; // land-mode lakes and shoreline
const BOUNDS = 26; // how far the player can roam from the center

const groundHeight = (x, z) =>
  Math.sin(x * 0.18) * 0.7 + Math.cos(z * 0.22) * 0.6 + Math.sin((x + z) * 0.08) * 1.0;

const rand = (a, b) => a + Math.random() * (b - a);

const THEMES = {
  primordial: { bg: 0x1f3b30, near: 6, far: 38, floor: 0x3b3a2a, hemi: 0.9, sun: 0.8, water: true },
  ocean: { bg: 0x0d4a6e, near: 10, far: 55, floor: 0xc2b280, hemi: 1.0, sun: 1.3, water: true },
  deep: { bg: 0x030c1a, near: 4, far: 30, floor: 0x1b2230, hemi: 0.75, sun: 0.35, water: true },
  reef: { bg: 0x1a8fb5, near: 14, far: 65, floor: 0xe8d8a8, hemi: 1.1, sun: 1.6, water: true },
  land: { bg: 0x9fd3f0, near: 30, far: 90, floor: 0x6a9a48, hemi: 1.1, sun: 2.2, water: false },
};

const EVENT_LOOKS = {
  greatOxidation: { bg: 0x8a3e16, near: 4, far: 30, particles: 'bubbles', color: 0xff9a50 },
  snowball: { bg: 0xd8ecf6, near: 4, far: 28, particles: 'snow', color: 0xffffff, ice: true },
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    this.sun.shadow.mapSize.set(2048, 2048);
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
    this.life = []; // other species: { obj, sp, ...motion }
    this.met = new Set(); // species ids the player has encountered
    this.onEncounter = null;
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
    const ventMat = mat(0x2a2a30);
    const glow = new THREE.MeshBasicMaterial({ color: 0xff7a30 });
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
        const light = new THREE.PointLight(0xff7a30, 30, 14);
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
    for (const e of this.life) this.moveLife(e, t);
    for (const p of this.particles) this.moveParticles(p, dt, t);
    const lead = this.player;
    if (lead) this.movePlayer(lead, dt);

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
      if (e.obj.position.distanceTo(p.pos) < 2.5 + (e.sp.reach ?? 1) * (e.sp.size ?? 1)) {
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
    if (look.lengthSq() > 1e-4) c.root.lookAt(c.pos.clone().add(look));

    c.anim += dt * (3 + c.speed) * c.moving;
    const w = c.anim + c.phase;
    if (c.cell) c.cell.scale.set(1 + Math.sin(w) * 0.06, 1 - Math.sin(w) * 0.06, 1 + Math.cos(w) * 0.05);
    for (const p of c.parts.swing) p.rotation.y = Math.sin(w * 1.6) * 0.45;
    for (const p of c.parts.flap) p.rotation.z = p.userData.side * (0.3 + Math.sin(w * 1.4) * 0.35);
    for (const p of c.parts.legs) p.rotation.x = Math.sin(w * 2 + p.userData.offset) * 0.6;
    for (const p of c.parts.wings) p.rotation.z = p.userData.side * Math.sin(w * 2.5) * 0.7;
    for (const p of c.parts.spin) p.rotation.z += dt * 8;
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

// ── Creature construction ───────────────────────────────────────────────

/** Build one individual. Its body plan is read straight from the species' tags. */
function buildCreature(g) {
  const tags = g.tags;
  const root = new THREE.Group();
  const parts = { swing: [], flap: [], legs: [], wings: [], spin: [] };
  const line = g.diet?.line;
  const color = new THREE.Color(line ? LINE_COLORS[line] : 0x9fd8c8);
  if (tags.has('camouflage')) color.lerp(new THREE.Color(0x556b2f), 0.4);
  if (tags.has('fur')) color.lerp(new THREE.Color(0x8b5a2b), 0.6);
  if (tags.has('deepSea')) color.lerp(new THREE.Color(0x553366), 0.35);
  if (tags.has('coldBlooded')) color.lerp(new THREE.Color(0x4a7a4a), 0.3);

  let scale = 0.55 + g.traits.size * 0.12;
  if (tags.has('giant')) scale *= 1.7;
  if (tags.has('swarm')) scale *= 0.7;

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
  const eyeR = tags.has('keenEyes') ? 0.13 : 0.09;
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 8, 6), mat(0xffffff, { flatShading: false }));
    eye.position.set(side * 0.26, 0.14, front - 0.08);
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

  // Tail.
  if (!tags.has('flight')) {
    const pivot = new THREE.Group();
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
  if (tags.has('shell')) {
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
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.05, 5, 12), ringMat);
      ring.position.z = (i - 1) * len * 0.25;
      root.add(ring);
    }
    for (const side of [-1, 1]) {
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4), ringMat);
      antenna.position.set(side * 0.12, 0.3, front + 0.2);
      antenna.rotation.set(0.9, 0, side * -0.4);
      root.add(antenna);
    }
  }
  if (tags.has('pressureArmor') && !tags.has('shell')) {
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
  if (tags.has('fur')) {
    const tuftMat = mat(0x6b4423);
    for (let i = 0; i < 8; i++) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), tuftMat);
      tuft.position.set(rand(-0.2, 0.2), 0.33, rand(-len * 0.35, len * 0.3));
      tuft.rotation.set(rand(-0.4, 0.4), 0, rand(-0.4, 0.4));
      root.add(tuft);
    }
  }
  if (tags.has('feathers')) {
    const crestMat = mat(0xffc93c);
    for (let i = 0; i < 3; i++) {
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 3), crestMat);
      crest.position.set(0, 0.36, front - 0.15 - i * 0.1);
      crest.rotation.x = -0.5;
      root.add(crest);
    }
  }
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
  if (!land) {
    for (const side of [-1, 1]) {
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
    const legMat = mat(color.clone().multiplyScalar(0.7));
    const legLen = 0.55;
    legHeight = 0.2 + legLen;
    let i = 0;
    for (const side of [-1, 1]) {
      for (const end of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.3, -0.2, end * len * 0.25);
        pivot.userData.offset = (i++ % 2) * Math.PI;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, legLen, 5), legMat);
        leg.position.y = -legLen / 2;
        pivot.add(leg);
        root.add(pivot);
        parts.legs.push(pivot);
      }
    }
  }
  if (tags.has('flight')) {
    const wingMat = mat(tags.has('feathers') ? 0xf2efe6 : color.clone().multiplyScalar(0.6), { side: THREE.DoubleSide });
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.3, 0.15, 0);
      pivot.userData.side = side;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 0.6), wingMat);
      wing.position.x = side * 0.75;
      pivot.add(wing);
      root.add(pivot);
      parts.wings.push(pivot);
    }
  }

  root.traverse((o) => { o.castShadow = true; });
  return { root, parts, scale, legHeight };
}
