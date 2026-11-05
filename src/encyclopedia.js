// Prehistory encyclopedia: every species the player has met, remembered across games.
// Undiscovered species show as locked silhouettes. Thumbnails are rendered from the
// same low-poly builders the world uses.

import { SPECIES, speciesByEra } from './fauna.js';
import { whereToFind } from './species.js';
import { ERAS } from './data.js';
import { showModal, fmtMya } from './ui.js';
import { ENTRIES } from './encyclopedia-entries.js';
import { snapshot } from './snapshot.js';

// ── Discoveries (kept across games in this browser) ──────────────────────

const STORE = 'lineage.discovered';

export function loadDiscovered() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORE) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function saveDiscovered(set) {
  try {
    localStorage.setItem(STORE, JSON.stringify([...set]));
  } catch {
    // Storage blocked (private mode, previews): discoveries last for this session only.
  }
}

/** Species that appear in the game, in era order, with the era each first appears in. */
function catalog() {
  return speciesByEra().flatMap((ids, era) => ids.map((id) => ({ sp: SPECIES[id], era })));
}

/** How many of the game's species this browser has discovered. */
export function progress(discovered) {
  const all = catalog();
  return { found: all.filter(({ sp }) => discovered.has(sp.id)).length, total: all.length };
}

/** Where to look for a species not discovered yet. */
function whereHint(id) {
  const habitats = new Set(whereToFind(id).map((w) => w.habitat));
  if (habitats.size > 1) return '🌊 🌍 Sea and land';
  return habitats.has('land') ? '🌍 On land' : SPECIES[id].shallow ? '🌊 In shallow seas' : '🌊 In the sea';
}

// ── Thumbnails ────────────────────────────────────────────────────────────

const thumbs = new Map();

/** A transparent PNG of the species' model; undiscovered ones as a flat silhouette. */
function thumbnail(sp, locked) {
  const key = `${sp.id}:${locked}`;
  if (!thumbs.has(key)) thumbs.set(key, snapshot(sp.build(), { silhouette: locked }));
  return thumbs.get(key);
}

/** Fill thumbnails a few per frame so the page opens instantly. */
function fillThumbnails(root) {
  const imgs = [...root.querySelectorAll('img[data-thumb]')];
  const step = () => {
    if (!root.isConnected) return;
    for (const img of imgs.splice(0, 6)) img.src = thumbnail(SPECIES[img.dataset.thumb], img.dataset.locked === '1');
    if (imgs.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ── Pages ─────────────────────────────────────────────────────────────────

function listHTML(discovered) {
  const all = catalog();
  const { found, total } = progress(discovered);
  const sections = ERAS.map((era, i) => {
    const tiles = all.filter((s) => s.era === i).map(({ sp }) => (discovered.has(sp.id)
      ? `<button class="codex-tile" data-id="${sp.id}"><img data-thumb="${sp.id}" data-locked="0" alt=""><span>${sp.name}</span></button>`
      : `<div class="codex-tile locked" title="Not discovered yet"><img data-thumb="${sp.id}" data-locked="1" alt=""><span>???</span><small class="codex-where">${whereHint(sp.id)}</small></div>`)).join('');
    return tiles && `<h3 class="codex-era">${era.name} <span>${fmtMya(era.mya)}</span></h3><div class="codex-grid">${tiles}</div>`;
  }).join('');
  return `
    <div class="codex">
      <div class="codex-head">
        <button class="codex-back" id="codex-close">← Back</button>
        <h2>📖 Prehistory Encyclopedia</h2>
        <span class="codex-count">${found} / ${total} discovered</span>
      </div>
      <p class="codex-hint">Get close to a species while playing to discover it. Undiscovered species are listed under the era they first appear in.</p>
      ${sections}
    </div>`;
}

function entryHTML(sp) {
  const e = ENTRIES[sp.id];
  return `
    <div class="codex codex-entry">
      <div class="codex-head">
        <button class="codex-back" id="codex-list">← All species</button>
      </div>
      <img class="codex-hero" data-thumb="${sp.id}" data-locked="0" alt="${sp.name}">
      <h2>${sp.name}</h2>
      <dl class="codex-stats">
        <div><dt>🕰️ Lived</dt><dd>${e.lived}</dd></div>
        <div><dt>📏 Size</dt><dd>${e.size}</dd></div>
        <div><dt>🍽️ Diet</dt><dd>${e.diet}</dd></div>
      </dl>
      <h3>Facts</h3>
      <ul class="codex-facts">${[sp.fact, ...e.facts].map((f) => `<li>${f}</li>`).join('')}</ul>
    </div>`;
}

/** Open the encyclopedia over the title screen; `onClose` returns to it. */
export function openEncyclopedia(discovered, onClose) {
  const showList = () => {
    showModal(listHTML(discovered), { wide: true, buttons: { '#codex-close': onClose } });
    const root = document.querySelector('#modal-content .codex');
    root.querySelectorAll('.codex-tile[data-id]').forEach((el) => el.addEventListener('click', () => showEntry(el.dataset.id)));
    fillThumbnails(root);
  };
  const showEntry = (id) => {
    showModal(entryHTML(SPECIES[id]), { wide: true, buttons: { '#codex-list': showList } });
    fillThumbnails(document.querySelector('#modal-content .codex'));
  };
  showList();
}
