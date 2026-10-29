// Game flow: era intro → major fork → generations with minor mutations → extinction event.

import { World } from './world.js';
import * as G from './game.js';
import * as UI from './ui.js';
import { ERAS, GENERATIONS_PER_ERA } from './data.js';
import { Joystick } from './controls.js';
import { Sound } from './audio.js';

const world = new World(document.getElementById('scene'));
const joystick = new Joystick();
const sound = new Sound();
world.input = joystick.state;
let game;

// First time the player gets near another species: introduce it.
world.onEncounter = (sp) => {
  if (document.getElementById('hud').hidden) { world.met.delete(sp.id); return; }
  UI.toast(`<div class="toast-kicker">New species encountered</div><b>${sp.name}</b><p>${sp.fact}</p>`);
  UI.setLife(world.contemporaries, world.met);
  sound.discover();
};

// Browsers only allow audio after a user gesture.
const unlockAudio = () => { sound.start(); sound.setTheme(world.themeKey); };
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

const muteBtn = document.getElementById('mute');
const toggleMute = () => {
  sound.setMuted(!sound.muted);
  muteBtn.textContent = sound.muted ? '🔇' : '🔊';
};
muteBtn.addEventListener('click', toggleMute);
window.addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !(e.target instanceof HTMLInputElement)) toggleMute(); });

/** Rebuild scenery and match the music and controls to the habitat. */
function setHabitat() {
  world.setEnvironment(game);
  UI.setLife(world.contemporaries, world.met);
  sound.setTheme(world.themeKey);
  joystick.setVertical(world.aquatic || game.tags.has('flight'));
}

function titleScreen() {
  game = G.createGame();
  world.met.clear();
  setHabitat();
  world.setCreature(game);
  document.getElementById('hud').hidden = true;
  joystick.show(false);
  sound.duck(1);
  UI.showModal(`
    <div class="title">
      <h1>LINEAGE</h1>
      <p class="tagline">Every species goes extinct.<br>How long will yours last?</p>
      <label class="name-field">Name your species
        <span><input id="species-name" value="${game.name}" maxlength="40"><button id="reroll" title="Random name">🎲</button></span>
      </label>
      <button class="primary" id="start">Begin as a single cell</button>
      <p class="hint">Swim, crawl or walk with the joystick or WASD · meet the life of each era · Space/Shift to rise and sink<br>Drag to orbit · scroll to zoom · M to mute</p>
    </div>`, {
    buttons: {
      '#reroll': () => { document.getElementById('species-name').value = G.randomSpeciesName(); },
      '#start': () => {
        game.name = document.getElementById('species-name').value.trim() || game.name;
        UI.hideModal();
        UI.clearLog();
        joystick.show(true);
        startEra();
      },
    },
  });
}

function startEra() {
  const era = ERAS[game.era];
  setHabitat();
  world.setCreature(game);
  UI.renderHUD(game);
  UI.setActions('');
  const fork = G.forkFor(game);
  UI.showModal(`
    <div class="era-intro">
      <div class="era-label">Era ${game.era + 1} of ${ERAS.length}</div>
      <h1>${era.name}</h1>
      <div class="mya">${UI.fmtMya(era.mya)}</div>
      <p>${era.blurb}</p>
      <h3 class="fork-title">◆ ${fork.title}</h3>
    </div>
    ${UI.cardsHTML(fork.options, game)}`, {
    onPick: (id) => {
      const c = G.applyChoice(game, id, 'fork');
      UI.log(`<b>${UI.fmtMya(game.mya)}</b>: ${c.icon} Major evolution: <b>${c.name}</b>.`);
      setHabitat(); // habitat forks (land, deep sea, reef) change the scenery
      world.setCreature(game, { evolve: true });
      sound.evolve();
      UI.renderHUD(game);
      UI.banner(`${c.icon} ${c.name}`);
      livePhase();
    },
  });
}

function livePhase() {
  UI.setActions(`<button class="primary big" id="live">Live a generation ▸ <small>${game.generation + 1}/${GENERATIONS_PER_ERA}</small></button>`, {
    buttons: { '#live': liveGeneration },
  });
}

function liveGeneration() {
  const r = G.simulateGeneration(game);
  sound.generation();
  UI.renderHUD(game);
  const d = r.after.population - r.before.population;
  const food = r.after.food - r.before.food;
  UI.log(`Generation ${game.generation}: population ${UI.fmtPop(r.before.population)} → <b>${UI.fmtPop(r.after.population)}</b>
    <span class="${d >= 0 ? 'good' : 'bad'}">(${d >= 0 ? '+' : '-'}${UI.fmtPop(Math.abs(d))})</span>,
    food ${food >= 0 ? '+' : ''}${Math.round(food)}.`);
  if (game.status === 'extinct') return ending();
  mutationPhase();
}

function mutationPhase() {
  const options = G.minorOptions(game);
  UI.setActions(`<div class="actions-title">🧬 A mutation appears. Choose one:</div>${UI.cardsHTML(options, game, 'small')}`, {
    onPick: (id) => {
      const c = G.applyChoice(game, id, 'minor');
      UI.log(`${c.icon} Mutation: <b>${c.name}</b>.`);
      world.setCreature(game, { evolve: true });
      sound.evolve();
      UI.renderHUD(game);
      if (game.generation < GENERATIONS_PER_ERA) livePhase();
      else eventPhase();
    },
  });
}

function eventPhase() {
  const ev = G.upcomingEvent(game);
  if (!ev) {
    UI.log('A quiet age passes. No catastrophe this time.');
    return nextEra();
  }
  UI.setActions('<button class="primary big danger" id="face">⚠ Face what is coming</button>', {
    buttons: {
      '#face': async () => {
        UI.setActions('');
        UI.hideWarning();
        UI.banner(`${ev.icon} ${ev.name}`, 3200);
        sound.extinction(ERAS[game.era].event);
        await world.playEvent(ERAS[game.era].event);
        const r = G.resolveEvent(game);
        UI.renderHUD(game);
        UI.log(`${ev.icon} <b>${ev.name}</b>: ${Math.round(r.survival * 100)}% survived.`);
        if (r.survived) sound.survived();
        else sound.wipedOut();
        UI.showModal(UI.eventResultHTML(r), {
          buttons: {
            '#continue': () => {
              UI.hideModal();
              if (r.survived) { sound.duck(1, 3); nextEra(); } else ending();
            },
          },
        });
      },
    },
  });
}

function nextEra() {
  if (G.advanceEra(game)) startEra();
  else ending();
}

function ending() {
  UI.setActions('');
  UI.renderHUD(game);
  const won = game.status === 'survived';
  joystick.show(false);
  if (won) sound.win();
  else sound.lose();
  UI.showModal(`
    <div class="ending ${won ? 'won' : 'dead'}">
      <div class="event-icon">${won ? '🏆' : '🦴'}</div>
      <h1>${won ? 'You reached the present day' : 'Extinct'}</h1>
      <h3 class="species-name">${game.name}</h3>
      <p>${won ? 'Your lineage survived every catastrophe Earth could throw at it.' : `Cause: <b>${game.causeOfDeath}</b>, ${UI.fmtMya(game.mya)}.`}</p>
      <div class="stats">
        <div><b>${Math.round(G.lifespanMyr(game)).toLocaleString()}</b><span>million years</span></div>
        <div><b>${UI.fmtPop(game.peakPopulation)}</b><span>peak population</span></div>
        <div><b>${game.history.filter((h) => h.kind === 'event' && h.survived).length}</b><span>extinctions survived</span></div>
      </div>
      <h3>Your lineage</h3>
      ${UI.timelineHTML(game)}
      <button class="primary" id="again">Evolve again</button>
    </div>`, { wide: true, buttons: { '#again': titleScreen } });
}

titleScreen();
