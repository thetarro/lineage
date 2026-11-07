// Alien bestiary: the species met on each alien planet, remembered across games in this browser.
// Like the encyclopedia, undiscovered species show as locked silhouettes; species an extinction
// wiped out are marked as fossils, so they can only be met before it strikes.

import { showModal, fmtMya, esc } from './ui.js';
import { buildAlien } from './fauna.js';
import { snapshot } from './snapshot.js';
import { alienPlanet } from './planet.js';

const STORE = 'lineage.bestiary'; // { [seed]: { name, sky, sea, total, found: [speciesId] } }

export function loadBestiary() {
  try {
    const b = JSON.parse(localStorage.getItem(STORE) ?? '{}');
    return b && typeof b === 'object' ? b : {};
  } catch {
    return {};
  }
}

function storeBestiary(b) {
  try {
    localStorage.setItem(STORE, JSON.stringify(b));
  } catch {
    // Storage blocked (private mode, previews): discoveries last for this session only.
  }
}

/** Record meeting a species on a planet; returns whether it is a new entry. */
export function discoverAlien(planet, id) {
  const b = loadBestiary();
  const p = (b[planet.seed] ??= { found: [] });
  Object.assign(p, { name: planet.name, sky: planet.colors.sky, sea: planet.colors.sea, total: Object.keys(planet.species).length });
  if (p.found.includes(id)) return false;
  p.found.push(id);
  storeBestiary(b);
  return true;
}

/** Species discovered on every alien planet together. */
export const bestiaryCount = () => Object.values(loadBestiary()).reduce((n, p) => n + p.found.length, 0);

// ── Thumbnails ────────────────────────────────────────────────────────────

const thumbs = new Map();

function thumbnail(planet, sp, locked) {
  const key = `${planet.seed}:${sp.id}:${locked}`;
  if (!thumbs.has(key)) thumbs.set(key, snapshot(buildAlien(sp), { silhouette: locked }));
  return thumbs.get(key);
}

/** Fill thumbnails a few per frame so the page opens instantly. */
function fillThumbnails(root, planet) {
  const imgs = [...root.querySelectorAll('img[data-thumb]')];
  const step = () => {
    if (!root.isConnected) return;
    for (const img of imgs.splice(0, 6)) img.src = thumbnail(planet, planet.species[img.dataset.thumb], img.dataset.locked === '1');
    if (imgs.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
const where = (sp) => (sp.habitat === 'land' ? '🌍 On land' : '🌊 In the sea');

// ── Pages ─────────────────────────────────────────────────────────────────

function planetsHTML(b) {
  const tiles = Object.entries(b).map(([seed, p]) => `
    <button class="planet-tile" data-seed="${esc(seed)}">
      <span class="planet-swatch" style="background: linear-gradient(160deg, ${hex(p.sky)}, ${hex(p.sea)})"></span>
      <span class="planet-tile-main"><b>🪐 ${esc(p.name)}</b><small>Seed ${esc(seed)}</small></span>
      <span class="planet-tile-count">${p.found.length} / ${p.total}</span>
    </button>`).join('');
  return `
    <div class="codex bestiary">
      <div class="codex-head">
        <button class="codex-back" id="bestiary-close">← Back</button>
        <h2>🛸 Alien bestiary</h2>
        <span class="codex-count">${bestiaryCount()} discovered</span>
      </div>
      ${tiles ? `<div class="planet-list">${tiles}</div>` : '<p class="codex-hint">No alien worlds yet. Choose 🪐 Alien world on the title screen, and get close to the life you meet there.</p>'}
    </div>`;
}

function planetHTML(planet, found) {
  const sections = planet.eras.map((era, i) => {
    const tiles = Object.values(planet.species).filter((sp) => sp.eras[0] === i).map((sp) => {
      const fossil = sp.wipedOutBy ? `<small class="fossil" title="Wiped out by ${esc(sp.wipedOutBy)}">🦴 Fossil</small>` : '';
      return found.has(sp.id)
        ? `<button class="codex-tile" data-id="${sp.id}"><img data-thumb="${sp.id}" data-locked="0" alt=""><span>${esc(sp.name)}</span>${fossil}</button>`
        : `<div class="codex-tile locked" title="Not discovered yet"><img data-thumb="${sp.id}" data-locked="1" alt=""><span>???</span><small class="codex-where">${where(sp)}</small></div>`;
    }).join('');
    return tiles && `<h3 class="codex-era">${esc(era.name)} <span>${fmtMya(era.mya)}</span></h3><div class="codex-grid">${tiles}</div>`;
  }).join('');
  return `
    <div class="codex bestiary">
      <div class="codex-head">
        <button class="codex-back" id="bestiary-planets">← All planets</button>
        <h2>🪐 ${esc(planet.name)}</h2>
        <span class="codex-count">${found.size} / ${Object.keys(planet.species).length} discovered</span>
      </div>
      <p class="codex-hint">Seed ${esc(planet.seed)} · ${/^[aeiou]/.test(planet.sun) ? 'an' : 'a'} ${esc(planet.sun)} sun over ${esc(planet.sea)} seas and ${esc(planet.land)}. Species marked 🦴 died out in an extinction: meet them before it strikes.</p>
      ${sections}
    </div>`;
}

function entryHTML(planet, sp) {
  const first = planet.eras[sp.eras[0]].name, last = planet.eras[sp.eras.at(-1)].name;
  const lived = sp.wipedOutBy ? (first === last ? first : `${first} → ${last}`) : `${first} → today`;
  return `
    <div class="codex codex-entry">
      <div class="codex-head">
        <button class="codex-back" id="bestiary-list">← ${esc(planet.name)}</button>
      </div>
      <img class="codex-hero" data-thumb="${sp.id}" data-locked="0" alt="${esc(sp.name)}">
      <h2>${esc(sp.name)}</h2>
      <p class="codex-hint">${esc(sp.title)}</p>
      <dl class="codex-stats">
        <div><dt>🕰️ Lived</dt><dd>${esc(lived)}</dd></div>
        <div><dt>📏 Size</dt><dd>${esc(sp.sizeText)}</dd></div>
        <div><dt>🍽️ Diet</dt><dd>${esc(sp.diet)}</dd></div>
        ${sp.predator ? `<div><dt>⚠️ Danger</dt><dd>Hunts you ${sp.habitat === 'land' ? 'on land' : 'at sea'}</dd></div>` : ''}
      </dl>
      ${sp.wipedOutBy ? `<p class="fossil-note">🦴 Wiped out by ${esc(sp.wipedOutBy)}.</p>` : ''}
      <h3>Facts</h3>
      <ul class="codex-facts">${sp.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    </div>`;
}

/** Open the bestiary over the title screen; `onClose` returns to it. */
export function openBestiary(onClose) {
  const showPlanets = () => {
    showModal(planetsHTML(loadBestiary()), { wide: true, buttons: { '#bestiary-close': onClose } });
    document.querySelectorAll('#modal-content .planet-tile').forEach((el) => el.addEventListener('click', () => showPlanet(alienPlanet(el.dataset.seed))));
  };
  const showPlanet = (planet) => {
    const found = new Set(loadBestiary()[planet.seed]?.found ?? []);
    showModal(planetHTML(planet, found), { wide: true, buttons: { '#bestiary-planets': showPlanets } });
    const root = document.querySelector('#modal-content .codex');
    root.querySelectorAll('.codex-tile[data-id]').forEach((el) => el.addEventListener('click', () => showEntry(planet, el.dataset.id)));
    fillThumbnails(root, planet);
  };
  const showEntry = (planet, id) => {
    showModal(entryHTML(planet, planet.species[id]), { wide: true, buttons: { '#bestiary-list': () => showPlanet(planet) } });
    fillThumbnails(document.querySelector('#modal-content .codex'), planet);
  };
  showPlanets();
}
