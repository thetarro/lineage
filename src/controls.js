// Player movement input: an on-screen joystick (mouse/touch) plus WASD/arrow keys.
// `state` is read every frame by the world: x = right, y = forward, up = rise/sink.

const RADIUS = 48;

export class Joystick {
  constructor() {
    this.state = { x: 0, y: 0, up: 0 };
    this.stick = { x: 0, y: 0 };
    this.keys = new Set();
    this.buttonUp = 0;

    this.el = document.createElement('div');
    this.el.id = 'joystick';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="vertical">
        <button class="vbtn" data-dir="1" title="Rise (Space)">▲</button>
        <button class="vbtn" data-dir="-1" title="Sink (Shift)">▼</button>
      </div>
      <div class="stick-base"><div class="stick-knob"></div></div>`;
    document.body.appendChild(this.el);
    this.base = this.el.querySelector('.stick-base');
    this.knob = this.el.querySelector('.stick-knob');

    this.base.addEventListener('pointerdown', (e) => {
      this.base.setPointerCapture(e.pointerId);
      this.dragging = true;
      this.moveStick(e);
    });
    this.base.addEventListener('pointermove', (e) => this.dragging && this.moveStick(e));
    const release = () => {
      this.dragging = false;
      this.stick = { x: 0, y: 0 };
      this.knob.style.transform = '';
      this.update();
    };
    this.base.addEventListener('pointerup', release);
    this.base.addEventListener('pointercancel', release);

    for (const btn of this.el.querySelectorAll('.vbtn')) {
      const dir = Number(btn.dataset.dir);
      btn.addEventListener('pointerdown', (e) => { btn.setPointerCapture(e.pointerId); this.buttonUp = dir; this.update(); });
      const stop = () => { this.buttonUp = 0; this.update(); };
      btn.addEventListener('pointerup', stop);
      btn.addEventListener('pointercancel', stop);
    }

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      this.keys.add(e.code);
      if (e.code === 'Space') e.preventDefault();
      this.update();
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); this.update(); });
    window.addEventListener('blur', () => { this.keys.clear(); this.update(); });
  }

  moveStick(e) {
    const r = this.base.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) { dx *= RADIUS / len; dy *= RADIUS / len; }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    this.stick = { x: dx / RADIUS, y: -dy / RADIUS };
    this.update();
  }

  update() {
    const k = (...codes) => (codes.some((c) => this.keys.has(c)) ? 1 : 0);
    const kx = k('KeyD', 'ArrowRight') - k('KeyA', 'ArrowLeft');
    const ky = k('KeyW', 'ArrowUp') - k('KeyS', 'ArrowDown');
    const ku = k('Space', 'KeyE') - k('ShiftLeft', 'ShiftRight', 'KeyQ');
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    this.state.x = clamp(this.stick.x + kx);
    this.state.y = clamp(this.stick.y + ky);
    this.state.up = clamp(this.buttonUp + ku);
  }

  show(visible) { this.el.hidden = !visible; }

  /** Rise/sink buttons only make sense in water or in the air. */
  setVertical(enabled) { this.el.classList.toggle('flat', !enabled); }
}
