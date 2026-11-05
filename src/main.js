// Game flow: era intro → major fork → generations with minor mutations → extinction event.

import { World } from './world.js';
import * as G from './game.js';
import * as UI from './ui.js';
import { ERAS, GENERATIONS_PER_ERA, FORAGE_CAP } from './data.js';
import { Joystick } from './controls.js';
import { Sound } from './audio.js';
import { VERSION } from './version.js';
import { openEncyclopedia, loadDiscovered, saveDiscovered, progress } from './encyclopedia.js';
import { openGallery, loadRuns, runRecord, saveRun } from './gallery.js';

const world = new World(document.getElementById('scene'));
const joystick = new Joystick();
const sound = new Sound();
world.input = joystick.state;
let game;
const discovered = loadDiscovered(); // species met in any game, for the encyclopedia

// First time the player gets near another species: introduce it.
world.onEncounter = (sp) => {
  if (document.getElementById('hud').hidden) { world.met.delete(sp.id); return; }
  const first = !discovered.has(sp.id);
  discovered.add(sp.id);
  saveDiscovered(discovered);
  UI.toast(`<div class="toast-kicker">${first ? 'New species encountered · added to the encyclopedia' : 'New species encountered'}</div><b>${sp.name}</b><p>${sp.fact}</p>`);
  UI.setLife(world.contemporaries, world.met);
  sound.discover();
};

// Food the player reaches tops up the Food meter, up to a limit per generation.
let fullNotice = null; // the generation we last said "well fed" in
world.onEat = () => {
  const gain = G.forage(game); // also refuels warm-blooded species
  UI.setMeter('energy', game.energy);
  if (gain) {
    UI.renderHUD(game);
    sound.eat();
  } else if (fullNotice !== `${game.era}:${game.generation}`) {
    fullNotice = `${game.era}:${game.generation}`;
    UI.toast(`<div class="toast-kicker">Well fed</div>Your kin have eaten their fill (+${FORAGE_CAP} food per generation at most). Live a generation to forage again.`, 4000);
  }
};

// Predators of the era now and then hunt the player: outrun them, or trust your armor.
world.onHuntStart = (sp) => {
  const tip = world.perks.burrow ? 'Keep still to dig in!'
    : game.tags.has('flight') && !world.aquatic ? 'Fly up, out of its reach!'
      : `${world.aquatic ? 'Swim' : 'Run'} away!`;
  UI.toast(`<div class="toast-kicker">⚠ A predator is hunting you</div><b>${sp.name}</b>. ${tip}`, 4000);
  sound.danger();
};
world.onBite = (sp) => {
  const r = G.predatorAttack(game);
  UI.renderHUD(game);
  if (r.blocked) {
    UI.toast(`🛡️ Your defenses held: <b>${sp.name}</b> gave up.`, 3500);
    UI.log(`🛡️ Attacked by <b>${sp.name}</b>, but your defenses held.`);
    sound.blocked();
  } else {
    UI.toast(`<div class="toast-kicker">Caught</div><b>${sp.name}</b> took ${UI.fmtPop(r.lost)} of your kind.`, 3500);
    UI.log(`🩸 Caught by <b>${sp.name}</b>: <span class="bad">-${UI.fmtPop(r.lost)}</span>.`);
    sound.bite();
  }
};
world.onHuntEnd = (sp, how) => {
  const msg = {
    hid: `🕳️ You dug in, and <b>${sp.name}</b> lost your trail.`,
    flew: `🪽 <b>${sp.name}</b> cannot reach you in the air, and gives up.`,
  }[how] ?? `💨 You escaped from <b>${sp.name}</b>.`;
  UI.toast(msg, 3000);
  UI.log(msg);
};

// Cold-blooded species slow down in the chill of night on land.
world.onNightfall = () => {
  if (world.perks.cold) UI.toast('🌙 Night falls. Your cold blood slows you down until the sun rises.', 3500);
};
world.onSunrise = () => {
  if (world.perks.cold) UI.toast('☀️ The sun is up: you warm up and speed up again.', 3000);
};

// Amphibians must keep going back to the water: their skin dries out on land.
let skinWarned = false;
world.onLand = (dt, inWater) => {
  if (G.needsWater(game)) keepSkinWet(dt, inWater);
  if (G.burnsEnergy(game)) burnEnergy(dt);
};

function keepSkinWet(dt, inWater) {
  const before = game.moisture;
  const r = G.skinMoisture(game, dt, inWater);
  UI.setMeter('moisture', game.moisture);
  if (before >= 50 && game.moisture < 50) {
    skinWarned = true;
    UI.toast('💧 Warning! Humidity level less than 50%!', 4000);
    sound.danger();
  } else if (before >= 30 && game.moisture < 30) {
    skinWarned = true;
    UI.toast('<div class="toast-kicker">💧 Your skin is drying out</div>Get back into the water before it is too late.', 4000);
    sound.danger();
  } else if (before > 0 && game.moisture === 0) {
    UI.toast('<div class="toast-kicker">☀️ Dried out</div>Your kind are dying on land. Find a lake, now!', 4000);
  } else if (skinWarned && inWater && game.moisture === 100) {
    skinWarned = false;
    UI.toast('💦 Back in the water: your skin is wet again.', 2500);
  }
  if (r.lost) {
    UI.renderHUD(game);
    UI.log(`☀️ Dried out on land: <span class="bad">-${UI.fmtPop(r.lost)}</span>.`);
    sound.bite();
  }
}

// Warm-blooded species burn energy as they roam, and must keep reaching food.
function burnEnergy(dt) {
  const before = game.energy;
  const r = G.bodyHeat(game, dt);
  UI.setMeter('energy', game.energy);
  if (before >= 30 && game.energy < 30) {
    UI.toast('<div class="toast-kicker">🔥 Running low on energy</div>Warm blood burns fast. Find food!', 4000);
    sound.danger();
  } else if (before > 0 && game.energy === 0) {
    UI.toast('<div class="toast-kicker">🥶 Out of energy</div>Your kind are weakening. Eat something, now!', 4000);
  }
  if (r.lost) {
    UI.renderHUD(game);
    UI.log(`🥶 Out of energy: <span class="bad">-${UI.fmtPop(r.lost)}</span>.`);
    sound.bite();
  }
}

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
  showRival();
}

/** The rival roams the world when it shares the player's habitat. */
function showRival() {
  const rival = game.rival;
  const here = rival?.status === 'alive' && G.habitat(rival) === G.habitat(game);
  world.setRival(rival, { here, eats: G.competition(game, rival) > 0 });
}

function titleScreen() {
  game = G.createGame();
  world.met.clear();
  setHabitat();
  world.setCreature(game);
  document.getElementById('hud').hidden = true;
  world.active = false;
  joystick.show(false);
  sound.duck(1);
  titleModal();
}

/** The title card itself; also where the encyclopedia returns to, keeping the typed name. */
function titleModal() {
  const { found, total } = progress(discovered);
  UI.showModal(`
    <div class="title">
      <h1>LINEAGE</h1>
      <p class="tagline">Every species goes extinct.<br>How long will yours last?</p>
      <label class="name-field">Name your species
        <span><input id="species-name" value="${UI.esc(game.name)}" maxlength="40"><button id="reroll" title="Random name">🎲</button></span>
      </label>
      <div class="title-buttons">
        <button class="primary" id="start">Begin as a single cell</button>
        <button class="secondary" id="codex">📖 Encyclopedia <small>${found}/${total}</small></button>
        <button class="secondary" id="gallery">🏛️ Past lineages <small>${loadRuns().length}</small></button>
      </div>
      <p class="hint">
        <span class="desktop">Swim, crawl or walk with the joystick or WASD · meet the life of each era · Space/Shift to rise and sink<br>Drag to orbit · scroll to zoom · M to mute</span>
        <span class="touch">Move with the joystick · ▲▼ to rise and sink · meet the life of each era<br>Drag to orbit · pinch to zoom</span>
      </p>
      <p class="version">v${VERSION}</p>
    </div>`, {
    buttons: {
      '#reroll': () => { document.getElementById('species-name').value = G.randomSpeciesName(); },
      '#codex': () => {
        game.name = document.getElementById('species-name').value.trim() || game.name;
        openEncyclopedia(discovered, titleModal);
      },
      '#gallery': () => {
        game.name = document.getElementById('species-name').value.trim() || game.name;
        openGallery(titleModal);
      },
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
  world.active = false;
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
      ${game.era === 0 && game.rival ? `<p class="rival-intro">⚔️ Another lineage, <i>${UI.esc(game.rival.name)}</i>, evolves alongside yours. Where your diets overlap, it eats your food: get there first!</p>` : ''}
      <h3 class="fork-title">◆ ${fork.title}</h3>
    </div>
    ${UI.cardsHTML(fork.options, game)}`, {
    onPick: (id) => {
      const prevDiet = game.diet?.name;
      const c = G.applyChoice(game, id, 'fork');
      UI.log(`<b>${UI.fmtMya(game.mya)}</b>: ${c.icon} Major evolution: <b>${c.name}</b>.`);
      if (!c.diet && game.diet?.name !== prevDiet) UI.log(`🍽️ <b>${prevDiet}</b> is no use on land. Your diet falls back to <b>${game.diet.name}</b>.`);
      const rc = G.rivalFork(game, id);
      if (rc) UI.log(`⚔️ Your rival <i>${UI.esc(game.rival.name)}</i> evolves: ${rc.icon} <b>${rc.name}</b>${rc === c ? ', like you' : ''}.`);
      setHabitat(); // habitat forks (land, deep sea, reef) change the scenery
      world.setCreature(game, { evolve: true });
      sound.evolve();
      UI.renderHUD(game);
      UI.banner(`${c.icon} ${c.name}`);
      if (id === 'warmBlooded') {
        UI.toast('<div class="toast-kicker">🔥 Warm blood burns energy</div>Your Energy meter drains as you roam. Reach food to refill it.', 7000);
        UI.log('🔥 Warm blood burns energy: keep reaching food before the <b>Energy</b> meter runs out.');
      }
      if (id === 'coldBlooded') {
        UI.toast('<div class="toast-kicker">🌙 Cold blood</div>You need little food, but the chill of night slows you down until sunrise.', 7000);
      }
      if (id === 'amphibian') {
        UI.toast('<div class="toast-kicker">🐸 Keep your skin wet</div>Your skin dries out on land. Go back into a lake before the Skin meter runs dry.', 7000);
        UI.log('🐸 Your skin dries out on land: go back into a lake before the <b>Skin</b> meter runs dry.');
      }
      world.active = true;
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
    food ${food >= 0 ? '+' : ''}${Math.round(food)}.${r.eaten ? ` Predators took ${UI.fmtPop(r.eaten)}.` : ''}${r.competition >= 0.01 ? ` Your rival took ${Math.round(r.competition * 100)}% of your food.` : ''}`);
  if (r.rivalExtinct) rivalGone(game.rival.causeOfDeath);
  if (game.status === 'extinct') return ending();
  mutationPhase();
}

function rivalGone(cause) {
  UI.toast(`<div class="toast-kicker">⚔️ Your rival is gone</div><i>${UI.esc(game.rival.name)}</i> has gone extinct (${cause}). Its food is yours now.`, 5000);
  UI.log(`⚔️ Your rival <i>${UI.esc(game.rival.name)}</i> has gone extinct: ${cause}.`);
  showRival();
}

function mutationPhase() {
  const options = G.minorOptions(game);
  world.huntsPaused = true;
  UI.setActions(`<div class="actions-title">🧬 A mutation appears. Choose one:</div>${UI.cardsHTML(options, game, 'small')}`, {
    onPick: (id) => {
      world.huntsPaused = false;
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
        world.active = false;
        UI.setActions('');
        UI.hideWarning();
        UI.banner(`${ev.icon} ${ev.name}`, 3200);
        sound.extinction(ERAS[game.era].event);
        await world.playEvent(ERAS[game.era].event);
        const r = G.resolveEvent(game);
        UI.renderHUD(game);
        UI.log(`${ev.icon} <b>${ev.name}</b>: ${Math.round(r.survival * 100)}% survived.`);
        if (r.rival && !r.rival.survived) UI.log(`⚔️ Your rival <i>${UI.esc(r.rival.name)}</i> did not survive it.`);
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
  world.active = false;
  UI.setActions('');
  UI.renderHUD(game);
  const won = game.status === 'survived';
  const today = G.descendants(game);
  const broken = saveRun(runRecord(game));
  joystick.show(false);
  if (won) sound.win();
  else sound.lose();
  UI.showModal(`
    <div class="ending ${won ? 'won' : 'dead'}">
      <div class="event-icon">${won ? '🏆' : '🦴'}</div>
      <h1>${won ? 'You reached the present day' : 'Extinct'}</h1>
      <h3 class="species-name">${UI.esc(game.name)}</h3>
      <p>${won ? 'Your lineage survived every catastrophe Earth could throw at it.' : `Cause: <b>${game.causeOfDeath}</b>, ${UI.fmtMya(game.mya)}.`}</p>
      <div class="epilogue">
        <div class="epilogue-icon">${today.icon}</div>
        <div>
          <div class="epilogue-kicker">${won ? 'Your lineage today' : 'Had it survived, its descendants might have been'}</div>
          <b>${today.name}</b>
          <p>${today.fact}</p>
        </div>
      </div>
      ${rivalFate()}
      ${broken.length ? `<p class="new-record">🏅 New record: ${broken.join(', ')}!</p>` : ''}
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

/** How the rival fared, for the ending screen. */
function rivalFate() {
  const r = game.rival;
  if (!r) return '';
  const fate = r.status === 'extinct' ? `went extinct: ${r.causeOfDeath}, ${UI.fmtMya(r.mya)}`
    : r.status === 'survived' ? 'also reached the present day' : 'outlived you';
  return `<p class="rival-fate">⚔️ Your rival <i>${UI.esc(r.name)}</i> ${fate}.</p>`;
}

titleScreen();
