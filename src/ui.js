// DOM overlay: HUD panels, choice cards, modals and the event log.

import { CHOICES, ERAS, TRAIT_NAMES, GENERATIONS_PER_ERA, STANDS } from './data.js';
import { carryingCapacity, upcomingEvent, habitat, needsWater, burnsEnergy, competition, eventOutlook, canHuntRival, standCost } from './game.js';

const $ = (id) => document.getElementById(id);

/** Escape text (like a typed species name) for use inside HTML. */
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const fmtPop = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);
export const fmtMya = (m) => (m <= 0 ? 'Present day' : m < 10 ? `${m.toFixed(1)} million years ago` : `${Math.round(m).toLocaleString()} million years ago`);
const pct = (v) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;
const shortMya = (m) => (m <= 0 ? 'Today' : m < 10 ? `${m.toFixed(1)} Mya` : `${Math.round(m).toLocaleString()} Mya`);

// Species sharing the current era, and which ones the player has met.
let life = { species: [], met: new Set() };

function lifeHTML() {
  if (!life.species.length) return '';
  const chips = life.species.map((sp) => (life.met.has(sp.id)
    ? `<span class="life met" title="${sp.fact}">✓ ${sp.name}</span>`
    : `<span class="life" title="Get close to discover it">${sp.name}</span>`)).join('');
  return `<div class="life-title">Living alongside you · ${life.species.filter((sp) => life.met.has(sp.id)).length}/${life.species.length} met</div>
    <div class="life-list">${chips}</div>`;
}

export function setLife(species, met) {
  life = { species, met };
  const el = $('life');
  if (el) el.innerHTML = lifeHTML();
}

function bar(label, value, max, cls = '') {
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  const low = w < 25 ? ' low' : '';
  return `<div class="meter ${cls}${low}"><span class="meter-label">${label}</span>
    <div class="meter-track"><div class="meter-fill" style="width:${w}%"></div></div>
    <span class="meter-value">${Math.round(value)}</span></div>`;
}

export function renderHUD(g) {
  $('hud').hidden = false;
  const era = ERAS[Math.min(g.era, ERAS.length - 1)];
  $('era-panel').innerHTML = `
    <div class="era-label">Era ${Math.min(g.era + 1, ERAS.length)} / ${ERAS.length}</div>
    <h2>${era.name}</h2>
    <div class="mya">${fmtMya(g.mya)} · Generation ${g.generation}/${GENERATIONS_PER_ERA}</div>
    <div class="meter pop"><span class="meter-label">👥 Population</span>
      <div class="meter-track"><div class="meter-fill" style="width:${Math.min(100, (g.population / carryingCapacity(g)) * 100)}%"></div></div>
      <span class="meter-value">${fmtPop(g.population)}</span></div>
    ${bar('🍖 Food', g.meters.food, 100, 'food')}
    ${bar('💧 Water', g.meters.water, 100, 'water')}
    ${bar('🫁 Oxygen', g.meters.oxygen, 100, 'oxygen')}
    ${needsWater(g) ? `<div id="moisture" title="Your skin dries out on land. Go back into a lake to wet it.">${bar('🐸 Skin', g.moisture, 100, 'moisture')}</div>` : ''}
    ${burnsEnergy(g) ? `<div id="energy" title="Warm blood burns energy. Reach food to refill it.">${bar('🔥 Energy', g.energy, 100, 'energy')}</div>` : ''}
    <div id="life">${lifeHTML()}</div>`;

  const diet = g.diet
    ? `${CHOICES[g.diet.line].icon} ${CHOICES[g.diet.line].name}${g.diet.name !== CHOICES[g.diet.line].name ? ` → ${g.diet.name}` : ''} <span class="tier">Tier ${g.diet.tier}</span>`
    : '—';
  const traits = Object.entries(TRAIT_NAMES)
    .map(([k, name]) => `<div class="trait"><span>${name}</span><div class="pips">${'<i class="on"></i>'.repeat(g.traits[k])}${'<i></i>'.repeat(10 - g.traits[k])}</div></div>`)
    .join('');
  const chips = g.history.filter((h) => h.kind !== 'event').map((h) => `<span class="chip" title="${h.name}">${h.icon} ${h.name}</span>`).join('');
  $('species-panel').innerHTML = `
    <h3 class="species-name">${esc(g.name)}</h3>
    <div class="habitat">${habitat(g) === 'aquatic' ? '🌊 Aquatic' : '🌍 Terrestrial'}</div>
    <div class="diet">${diet}</div>
    <div class="traits">${traits}</div>
    <div class="chips">${chips}</div>
    ${rivalHTML(g)}`;

  const ev = upcomingEvent(g);
  const warn = $('warning');
  const past = g.history.some((h) => h.kind === 'event' && h.era === g.era); // already faced this era's disaster
  warn.hidden = !ev || past || g.status !== 'alive';
  if (ev) warn.innerHTML = `<b>⚠ Signs of change:</b> ${ev.warning}`;
}

/** The rival lineage: who it is, and how much of your food it takes. */
function rivalHTML(g) {
  const r = g.rival;
  if (!r) return '';
  const taken = Math.round(competition(g, r) * 100);
  const status = r.status !== 'alive' ? '<span class="good">Extinct</span>'
    : habitat(r) !== habitat(g) ? `Lives ${habitat(r) === 'aquatic' ? 'in the sea' : 'on land'}, out of your way`
      : taken ? `<span class="bad">Takes ${taken}% of your food</span>` : 'Eats different food';
  const icons = r.history.filter((h) => h.kind === 'fork').map((h) => h.icon).join(' ');
  const prey = canHuntRival(g) ? '<div class="rival-status good">🍖 Bigger than it: you can hunt it</div>' : '';
  return `<div class="rival" title="Another lineage evolving alongside yours. Where your diets overlap, it eats your food.">
    <div class="rival-name">⚔️ Rival: <i>${esc(r.name)}</i></div>
    <div class="rival-status">${icons ? `${icons} · ` : ''}${status}</div>${prey}</div>`;
}

/** Live update of a real-time meter (amphibians' Skin, warm-blooded Energy), without rebuilding the HUD every frame. */
export function setMeter(id, value) {
  const el = $(id)?.firstElementChild;
  if (!el) return;
  el.querySelector('.meter-fill').style.width = `${value}%`;
  el.querySelector('.meter-value').textContent = Math.round(value);
  el.classList.toggle('low', value < 25);
}

export function hideWarning() { $('warning').hidden = true; }

export function log(html) {
  const el = document.createElement('div');
  el.className = 'log-entry';
  el.innerHTML = html;
  $('log').prepend(el);
  while ($('log').children.length > 30) $('log').lastChild.remove();
}

export function clearLog() { $('log').innerHTML = ''; }

function effectChips(id, g) {
  const c = CHOICES[id];
  const out = [];
  for (const [k, v] of Object.entries(c.traits ?? {})) {
    // A higher metabolism is a cost, so it reads as "bad".
    const good = k === 'metabolism' ? v < 0 : v > 0;
    out.push(`<span class="fx ${good ? 'good' : 'bad'}">${v > 0 ? '+' : ''}${v} ${TRAIT_NAMES[k]}</span>`);
  }
  if (c.diet) {
    out.push(`<span class="fx diet">Diet · Tier ${c.diet.tier}</span>`);
    if (g.diet?.line === 'omnivore' && c.diet.line !== 'omnivore') out.push('<span class="fx lean">Omnivore lean</span>');
  }
  if (c.removeTags?.includes('aquatic')) out.push('<span class="fx diet">Leaves the water</span>');
  // Flag what clearly helps or hurts against the extinction foreshadowed this era, without numbers.
  const outlook = eventOutlook(g, id);
  if (Math.abs(outlook) >= 0.05) {
    const ev = upcomingEvent(g);
    out.push(`<span class="fx ${outlook > 0 ? 'good' : 'bad'} omen">${ev.icon} ${outlook > 0 ? 'Helps' : 'Hurts'} vs ${ev.name}</span>`);
  }
  return out.join('');
}

export function cardsHTML(ids, g, size = '') {
  return `<div class="cards ${size}">${ids.map((id) => {
    const c = CHOICES[id];
    return `<button class="card" data-id="${id}">
      <div class="card-icon">${c.icon}</div>
      <div class="card-name">${c.name}</div>
      <div class="card-desc">${c.desc}</div>
      <div class="card-fx">${effectChips(id, g)}</div>
    </button>`;
  }).join('')}</div>`;
}

function bindCards(root, onPick) {
  root.querySelectorAll('.card').forEach((el) => el.addEventListener('click', () => onPick(el.dataset.id), { once: true }));
}

export function showModal(html, { onPick, buttons = {}, wide = false } = {}) {
  $('modal-content').innerHTML = html;
  $('modal-content').classList.toggle('wide', wide);
  $('modal').hidden = false;
  if (onPick) bindCards($('modal-content'), (id) => { hideModal(); onPick(id); });
  for (const [sel, fn] of Object.entries(buttons)) $('modal-content').querySelector(sel)?.addEventListener('click', fn);
}

export function hideModal() { $('modal').hidden = true; }

export function setActions(html, { onPick, buttons = {} } = {}) {
  const a = $('actions');
  a.innerHTML = html;
  if (onPick) bindCards(a, (id) => { a.innerHTML = ''; onPick(id); });
  for (const [sel, fn] of Object.entries(buttons)) a.querySelector(sel)?.addEventListener('click', fn, { once: true });
}

export function banner(html, ms = 2600) {
  const el = $('banner');
  el.innerHTML = html;
  el.classList.remove('show');
  void el.offsetWidth; // restart the CSS animation
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), ms);
}

export function toast(html, ms = 6000) {
  const el = $('toast');
  el.innerHTML = html;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), ms);
}

/** The player's decisions as a left-to-right timeline: one column per era, disasters between them. */
export function timelineHTML(g) {
  const cols = [];
  const node = (cls, icon) => `<div class="tl-axis"><div class="tl-node ${cls}"><span>${icon}</span></div></div>`;
  for (let e = 0; e <= Math.min(g.era, ERAS.length - 1); e++) {
    const items = g.history.filter((h) => h.era === e);
    const fork = items.find((h) => h.kind === 'fork');
    const minors = items.filter((h) => h.kind === 'minor');
    const ev = items.find((h) => h.kind === 'event');
    cols.push(`<div class="tl-col tl-era">
      <div class="tl-head"><span>Era ${e + 1}</span><b>${ERAS[e].name}</b><em>${shortMya(ERAS[e].mya)}</em></div>
      ${node('major', fork?.icon ?? '·')}
      <div class="tl-name">${fork?.name ?? ''}</div>
      <div class="tl-minors">${minors.map((m) => `<span class="chip">${m.icon} ${m.name}</span>`).join('')}</div>
    </div>`);
    if (ev) {
      cols.push(`<div class="tl-col tl-event ${ev.survived ? 'survived' : 'died'}">
        <div class="tl-head"><em>${shortMya(ev.mya)}</em></div>
        ${node('event', ev.icon)}
        <div class="tl-name">${ev.name}</div>
        <div class="tl-pct">${Math.round(ev.survival * 100)}% survived</div>
      </div>`);
    }
  }
  const won = g.status === 'survived';
  cols.push(`<div class="tl-col tl-event ${won ? 'survived' : 'died'}">
    <div class="tl-head"><em>${won ? 'Today' : shortMya(g.mya)}</em></div>
    ${node('end', won ? '🏆' : '🦴')}
    <div class="tl-name">${won ? 'Present day' : 'Extinct'}</div>
    <div class="tl-pct">${won ? 'Still alive' : g.causeOfDeath}</div>
  </div>`);
  return `<div class="tl"><div class="tl-track">${cols.join('')}</div></div>`;
}

/** The last stand before a mass extinction strikes: one desperate choice. */
export function standHTML(g, ev) {
  const cards = Object.entries(STANDS).map(([id, s]) => {
    const fx = [];
    if (s.survival) fx.push(`<span class="fx good">+${Math.round(s.survival * 100)}% survival</span>`);
    const cost = standCost(g, id);
    if (cost) fx.push(`<span class="fx bad">-${Math.round(cost * 100)}% population now${g.tags.has('burrower') ? ' (burrower)' : ''}</span>`);
    if (s.growth) fx.push(`<span class="fx good">+${Math.round(s.growth * 100)}% population now</span>`);
    if (s.food) fx.push(`<span class="fx bad">${s.food} Food</span>`);
    return `<button class="card" data-id="${id}">
      <div class="card-icon">${s.icon}</div>
      <div class="card-name">${s.name}</div>
      <div class="card-desc">${s.desc}</div>
      <div class="card-fx">${fx.join('')}</div>
    </button>`;
  }).join('');
  return `
    <div class="stand">
      <div class="event-icon">${ev.icon}</div>
      <h2>${ev.name} is coming</h2>
      <p>${ev.warning} There is time for one last decision.</p>
    </div>
    <div class="cards">${cards}</div>`;
}

export function eventResultHTML(r) {
  const rows = r.breakdown.map((l) => `<tr><td>${l.label}</td><td class="${l.value >= 0 ? 'good' : 'bad'}">${pct(l.value)}</td></tr>`).join('');
  return `
    <div class="event-head ${r.survived ? '' : 'dead'}">
      <div class="event-icon">${r.event.icon}</div>
      <h2>${r.event.name}</h2>
      <p>${r.event.desc}</p>
    </div>
    <table class="breakdown">${rows}
      <tr><td>Well-fed population</td><td>×${r.fed.toFixed(2)}</td></tr>
      <tr class="total"><td>Survival</td><td>${Math.round(r.survival * 100)}%</td></tr>
    </table>
    ${r.before !== r.unprepared ? `<p class="stand-result">${STANDS[r.stand].icon} ${STANDS[r.stand].name}: population ${fmtPop(r.unprepared)} → ${fmtPop(r.before)} before it struck.</p>` : ''}
    <p class="pop-change">Population ${fmtPop(r.before)} → <b>${fmtPop(r.after)}</b></p>
    ${r.rival ? `<p class="rival-fate">⚔️ Your rival <i>${esc(r.rival.name)}</i> ${r.rival.survived ? 'made it through too.' : 'did not survive.'}</p>` : ''}
    <p class="verdict ${r.survived ? 'good' : 'bad'}">${r.survived ? 'Your species endures.' : 'Too few remain. Your species is gone.'}</p>
    <button class="primary" id="continue">Continue</button>`;
}
