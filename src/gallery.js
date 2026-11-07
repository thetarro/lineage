// Past lineages: every finished game, remembered in this browser, with records to beat.

import { showModal, timelineHTML, fmtPop, esc } from './ui.js';
import { lifespanMyr, extinctionsSurvived, descendants, createGame, applyChoice } from './game.js';
import { CHOICES } from './data.js';

const STORE = 'lineage.runs';
const MAX_RUNS = 50;

export function loadRuns() {
  try {
    const runs = JSON.parse(localStorage.getItem(STORE) ?? '[]');
    return Array.isArray(runs) ? runs : [];
  } catch {
    return [];
  }
}

function storeRuns(runs) {
  try {
    localStorage.setItem(STORE, JSON.stringify(runs));
  } catch {
    // Storage blocked (private mode, previews): the gallery lasts for this session only.
  }
}

/** What to remember about a finished game: enough to show its timeline again. */
export function runRecord(g, date = Date.now()) {
  const d = descendants(g);
  return {
    name: g.name, date, won: g.status === 'survived',
    lifespan: Math.round(lifespanMyr(g)), peak: g.peakPopulation, survived: extinctionsSurvived(g),
    // The fields timelineHTML reads.
    history: g.history.map(({ era, mya, kind, name, icon, survival, survived }) => ({ era, mya, kind, name, icon, survival, survived })),
    era: g.era, status: g.status, mya: g.mya, causeOfDeath: g.causeOfDeath,
    descendant: { icon: d.icon, name: d.name },
    // Alien worlds: enough to name the planet and draw its eras on the timeline.
    planet: g.planet && { seed: g.planet.seed, name: g.planet.name, eras: g.planet.eras.map(({ name, mya }) => ({ name, mya })) },
    // What it looked like at the end, for its portrait: the fields the creature builder reads.
    look: { tags: [...g.tags], line: g.diet?.line ?? null, size: g.traits.size, era: g.era },
  };
}

const CHOICE_BY_NAME = Object.fromEntries(Object.entries(CHOICES).map(([id, c]) => [c.name, id]));

/** What a run's species looked like. Runs saved before 1.9.2 have no `look`: replay their choices to rebuild it. */
export function runLook(run) {
  if (run.look) return run.look;
  const g = createGame({ name: run.name, rival: false });
  for (const h of run.history) {
    const id = h.kind !== 'event' && CHOICE_BY_NAME[h.name];
    if (id) applyChoice(g, id, h.kind);
  }
  return { tags: [...g.tags], line: g.diet?.line ?? null, size: g.traits.size, era: run.era };
}

/** Best runs so far. Each record is a run, or null when there are none. */
export function records(runs) {
  const best = (score) => runs.reduce((a, r) => (!a || score(r) > score(a) ? r : a), null);
  return {
    played: runs.length,
    won: runs.filter((r) => r.won).length,
    longest: best((r) => r.lifespan),
    mostSurvived: best((r) => r.survived),
    largest: best((r) => r.peak),
  };
}

/** Save a finished game; returns the records it broke (as labels) to celebrate on the ending screen. */
export function saveRun(run) {
  const before = loadRuns();
  const old = records(before);
  const broken = [];
  if (before.length) {
    if (run.lifespan > old.longest.lifespan) broken.push('longest-lived lineage');
    if (run.survived > old.mostSurvived.survived) broken.push('most extinctions survived');
    if (run.peak > old.largest.peak) broken.push('largest population');
  }
  storeRuns([run, ...before].slice(0, MAX_RUNS));
  return broken;
}

// ── Pages ─────────────────────────────────────────────────────────────────

const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function recordCard(label, run, value) {
  return `<div class="record"><span>${label}</span>${run ? `<b>${value}</b><em>${esc(run.name)}</em>` : '<b>—</b>'}</div>`;
}

function listHTML(runs) {
  const r = records(runs);
  const rows = runs.map((run, i) => `
    <button class="run" data-i="${i}">
      <span class="run-icon">${run.won ? '🏆' : '🦴'}</span>
      <span class="run-main"><b>${esc(run.name)}</b><small>${run.planet ? `🪐 ${esc(run.planet.name)} · ` : ''}${run.won ? `Today: ${run.descendant.icon} ${run.descendant.name}` : `Extinct: ${run.causeOfDeath}`}</small></span>
      <span class="run-stats"><span><b>${run.lifespan.toLocaleString()}</b> Myr</span><small>${fmtDate(run.date)}</small></span>
    </button>`).join('');
  return `
    <div class="codex gallery">
      <div class="codex-head">
        <button class="codex-back" id="gallery-close">← Back</button>
        <h2>🏛️ Past lineages</h2>
        <span class="codex-count">${r.won} / ${r.played} reached today</span>
      </div>
      <div class="records">
        ${recordCard('Longest-lived', r.longest, `${r.longest?.lifespan.toLocaleString()} Myr`)}
        ${recordCard('Most extinctions survived', r.mostSurvived, r.mostSurvived?.survived)}
        ${recordCard('Largest population', r.largest, r.largest && fmtPop(r.largest.peak))}
      </div>
      ${rows ? `<div class="runs">${rows}</div>` : '<p class="codex-hint">No lineages yet. Every game you finish will appear here.</p>'}
    </div>`;
}

function runHTML(run) {
  return `
    <div class="codex gallery">
      <div class="codex-head">
        <button class="codex-back" id="gallery-list">← All lineages</button>
        <h2>${run.won ? '🏆' : '🦴'} <i>${esc(run.name)}</i></h2>
      </div>
      <img class="codex-hero run-portrait" alt="${esc(run.name)}">
      <div class="stats">
        <div><b>${run.lifespan.toLocaleString()}</b><span>million years</span></div>
        <div><b>${fmtPop(run.peak)}</b><span>peak population</span></div>
        <div><b>${run.survived}</b><span>extinctions survived</span></div>
      </div>
      <p class="codex-hint">${run.planet ? `Played on the alien world 🪐 <b>${esc(run.planet.name)}</b> (seed ${esc(run.planet.seed)}). ` : ''}${run.won ? `${run.planet ? 'Its descendants today are' : 'Its descendants today resemble'} ${run.descendant.icon} <b>${run.descendant.name}</b>.` : `Extinct: ${run.causeOfDeath}.`} Played ${fmtDate(run.date)}.</p>
      ${timelineHTML(run)}
    </div>`;
}

/** Open the gallery over the title screen; `onClose` returns to it. */
export function openGallery(onClose) {
  const runs = loadRuns();
  const showList = () => {
    showModal(listHTML(runs), { wide: true, buttons: { '#gallery-close': onClose } });
    document.querySelectorAll('#modal-content .run').forEach((el) => el.addEventListener('click', () => showRun(runs[+el.dataset.i])));
  };
  const showRun = (run) => {
    showModal(runHTML(run), { wide: true, buttons: { '#gallery-list': showList } });
    const img = document.querySelector('#modal-content .run-portrait');
    // Loaded on demand: the 3D code only runs in the browser, and the rest of this module also runs in Node.
    import('./world.js').then(({ creaturePortrait }) => { img.src = creaturePortrait(runLook(run)); });
  };
  showList();
}
