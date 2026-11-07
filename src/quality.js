// Graphics quality: presets, the player's choice, and an automatic step down when frames drop.
//
//   ?quality=low|medium|high   forces a preset for this visit (the browser tests use low)
//   ?stats                     shows the frame-rate overlay (or press F3)

export const PRESETS = {
  // Plain rendering at a low resolution: for phones and slow machines.
  low: { label: 'Low', pixelRatio: 1, shadows: 1024, softShadows: false, post: false, bloom: false, ao: false, msaa: 0 },
  // Post-processing with bloom and anti-aliasing, without ambient occlusion.
  medium: { label: 'Medium', pixelRatio: 1.5, shadows: 2048, softShadows: true, post: true, bloom: true, ao: false, msaa: 4 },
  // Everything: ambient occlusion, bloom and full resolution.
  high: { label: 'High', pixelRatio: 2, shadows: 2048, softShadows: true, post: true, bloom: true, ao: true, msaa: 4 },
};
export const TIERS = ['low', 'medium', 'high'];

const STORE = 'lineage.quality'; // 'auto' or a preset name

function stored() {
  try {
    return localStorage.getItem(STORE) ?? 'auto';
  } catch {
    return 'auto';
  }
}

/** The preset to start with: the URL's, else the player's, else a guess from the device. */
export function initialQuality() {
  const forced = new URLSearchParams(location.search).get('quality');
  if (PRESETS[forced]) return { tier: forced, auto: false };
  const choice = stored();
  if (PRESETS[choice]) return { tier: choice, auto: false };
  const phone = matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 600;
  return { tier: phone ? 'low' : 'high', auto: true };
}

/** Remember the player's choice: 'auto' or a preset name. */
export function saveQuality(choice) {
  try {
    localStorage.setItem(STORE, choice);
  } catch {
    // Storage blocked: the choice lasts for this visit.
  }
}

/**
 * Watches the frame rate. In auto mode, if it stays below `minFps` for a few seconds, it asks
 * to step down one preset (never up again during the visit, to avoid flickering between them).
 */
export class FrameMonitor {
  constructor({ minFps = 40, seconds = 4, onTooSlow } = {}) {
    Object.assign(this, { minFps, seconds, onTooSlow });
    this.frames = 0;
    this.elapsed = 0;
    this.slowFor = 0;
    this.fps = 60;
  }

  /** Call once per frame with the real time since the last frame. */
  tick(dt) {
    this.frames++;
    this.elapsed += dt;
    if (this.elapsed < 1) return;
    this.fps = this.frames / this.elapsed;
    this.slowFor = this.fps < this.minFps ? this.slowFor + this.elapsed : 0;
    this.frames = 0;
    this.elapsed = 0;
    if (this.slowFor >= this.seconds) {
      this.slowFor = 0;
      this.onTooSlow?.();
    }
  }
}

/** The development overlay: frame rate, draw calls, triangles and preset. */
export class StatsOverlay {
  constructor() {
    this.el = Object.assign(document.createElement('div'), { id: 'stats' });
    this.el.hidden = !new URLSearchParams(location.search).has('stats');
    document.body.append(this.el);
    window.addEventListener('keydown', (e) => { if (e.code === 'F3') { e.preventDefault(); this.el.hidden = !this.el.hidden; } });
    this.last = 0;
  }

  update(t, { fps, calls, triangles, tier, auto }) {
    if (this.el.hidden || t - this.last < 0.5) return;
    this.last = t;
    this.el.textContent = `${Math.round(fps)} fps · ${calls} calls · ${(triangles / 1000).toFixed(1)}k tris · ${PRESETS[tier].label}${auto ? ' (auto)' : ''}`;
  }
}
