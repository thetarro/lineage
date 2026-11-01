// Game rules: forks, mutations, diets, extinction events and whole games.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import { CHOICES, ERAS, EVENTS, GENERATIONS_PER_ERA } from '../src/data.js';

/** A game after taking these choices, advancing one era per choice like the fork phase. */
function lineage(ids) {
  const g = G.createGame();
  for (const id of ids) {
    G.applyChoice(g, id, 'fork');
    G.advanceEra(g);
  }
  return g;
}

/** A game with these choices applied in the current era (no era advance). */
function withChoices(ids, era = 0) {
  const g = G.createGame();
  for (const id of ids) G.applyChoice(g, id, 'fork');
  g.era = era;
  return g;
}

const modLabels = (g, event) => G.eventBreakdown(g, EVENTS[event]).map((l) => l.label);

// ── Forks ──────────────────────────────────────────────────────────────────

/** Every complete lineage of fork choices, era by era. */
function allLineages() {
  const out = [];
  const walk = (ids) => {
    const g = lineage(ids);
    if (g.era >= ERAS.length) return out.push(ids);
    const fork = G.forkFor(g);
    assert.ok(fork, `no fork offered after ${ids.join(' > ') || 'the start'}`);
    for (const id of fork.options) walk([...ids, id]);
  };
  walk([]);
  return out;
}

test('every lineage is offered a fork in every era', () => {
  assert.ok(allLineages().length > 0);
});

test('every fork option can actually be reached', () => {
  const taken = new Set(allLineages().flat());
  for (const era of ERAS) for (const f of era.forks) for (const id of f.options) assert.ok(taken.has(id), `fork option "${id}" is unreachable`);
});

test('arthropods on land get their own branch; vertebrates keep theirs', () => {
  const insect = lineage(['omnivore', 'shell', 'exoskeleton', 'goLand']);
  assert.deepEqual(G.forkFor(insect).options, ['insectWings', 'arachnid']);
  const vertebrate = lineage(['omnivore', 'shell', 'spine', 'goLand']);
  assert.deepEqual(G.forkFor(vertebrate).options, ['coldBlooded', 'warmBlooded']);
  const seaArthropod = lineage(['omnivore', 'shell', 'exoskeleton', 'stayWater']);
  assert.deepEqual(G.forkFor(seaArthropod).options, ['deepSea', 'reef']);
  assert.deepEqual(G.forkFor(lineage(['omnivore', 'shell', 'exoskeleton', 'goLand', 'insectWings'])).options, ['metamorphosis', 'colony']);
  assert.deepEqual(G.forkFor(lineage(['omnivore', 'shell', 'exoskeleton', 'goLand', 'arachnid'])).options, ['silk', 'trapdoor']);
  assert.deepEqual(G.forkFor(lineage(['omnivore', 'shell', 'exoskeleton', 'goLand', 'arachnid', 'silk'])).options, ['swarm', 'diapause']);
});

// ── Minor mutations ────────────────────────────────────────────────────────

test('mutation offers are three distinct, eligible, non-fork choices', () => {
  for (let i = 0; i < 300; i++) {
    const g = lineage(['carnivore', 'omnivore', 'herbivore'].slice(i % 3, i % 3 + 1));
    g.era = i % ERAS.length;
    const options = G.minorOptions(g);
    assert.equal(options.length, 3);
    assert.equal(new Set(options).size, 3);
    for (const id of options) {
      assert.ok(G.meetsRequirements(g, CHOICES[id].requires), `${id} offered without meeting its requirements`);
      assert.ok(!ERAS.some((e) => e.forks.some((f) => f.options.includes(id))), `fork option ${id} offered as a mutation`);
    }
  }
});

test('Aerobic Respiration is offered every generation before the Great Oxidation until taken', () => {
  for (const line of ['carnivore', 'omnivore', 'herbivore']) {
    for (let i = 0; i < 50; i++) {
      const g = withChoices([line]);
      for (let gen = 0; gen < GENERATIONS_PER_ERA; gen++) {
        const options = G.minorOptions(g);
        assert.ok(options.includes('aerobic'), `not offered to a ${line} in generation ${gen + 1}`);
        G.applyChoice(g, options.find((id) => id !== 'aerobic'), 'minor');
      }
    }
  }
  const taken = withChoices(['carnivore', 'aerobic']);
  assert.ok(!G.minorOptions(taken).includes('aerobic'), 'offered again after being taken');
  assert.ok(modLabels(taken, 'greatOxidation').includes('Aerobic respiration'));
});

test('Thick Hide is never offered to arthropods', () => {
  const g = lineage(['carnivore', 'shell', 'exoskeleton', 'goLand', 'arachnid']);
  assert.ok(!G.meetsRequirements(g, CHOICES.thickHide.requires));
});

// ── Diets on land ──────────────────────────────────────────────────────────

test('going ashore cancels sea diets and drops plankton', () => {
  const cases = [
    [['carnivore', 'filterFeeder'], 'Carnivore', { prey: 1 }],
    [['carnivore', 'piscivore'], 'Carnivore', { prey: 1 }],
    [['herbivore', 'kelpGrazer'], 'Herbivore', { plants: 1 }],
    [['omnivore', 'algaeGrazer'], 'Omnivore', { prey: 0.3, detritus: 0.3 }],
    [['omnivore'], 'Omnivore', { prey: 0.3, detritus: 0.3 }],
  ];
  for (const [ids, name, sources] of cases) {
    const g = withChoices([...ids, 'goLand'], 3);
    assert.equal(g.diet.name, name, ids.join(' > '));
    assert.deepEqual(g.diet.sources, sources, ids.join(' > '));
    assert.ok(G.dietAvailability(g) > 0, `${ids.join(' > ')} finds no food on land`);
  }
  const detritivore = withChoices(['omnivore', 'detritivore', 'goLand'], 3);
  assert.equal(detritivore.diet.name, 'Detritivore', 'land-safe diets are kept');
  assert.ok(!('plankton' in detritivore.diet.sources));
});

test('staying in the sea keeps sea diets', () => {
  const g = withChoices(['carnivore', 'filterFeeder', 'stayWater'], 3);
  assert.equal(g.diet.name, 'Filter Feeder');
  assert.deepEqual(g.diet.sources, { plankton: 1 });
});

test('adopting a diet never changes the shared choice data', () => {
  const before = JSON.stringify(CHOICES);
  for (const ids of [['omnivore', 'filterFeeder', 'goLand'], ['carnivore', 'piscivore', 'goLand'], ['herbivore', 'goLand']]) withChoices(ids, 3);
  assert.equal(JSON.stringify(CHOICES), before);
});

// ── Extinction events ──────────────────────────────────────────────────────

test('sea-only modifiers do not apply on land', () => {
  const land = withChoices(['carnivore', 'filterFeeder', 'betterGills', 'piscivore', 'molluscivore', 'goLand'], 3);
  for (const label of ['Better gills', 'Fish die off', 'Shellfish die off']) assert.ok(!modLabels(land, 'oceanAnoxia').includes(label), label);
  assert.ok(!modLabels(land, 'iceAge').includes('Cold seas teem with plankton'));

  const sea = withChoices(['carnivore', 'filterFeeder', 'betterGills', 'stayWater'], 3);
  assert.ok(modLabels(sea, 'oceanAnoxia').includes('Better gills'));
  assert.ok(modLabels(sea, 'iceAge').includes('Cold seas teem with plankton'));
});

test('arthropod traits count in their extinction events', () => {
  const insect = lineage(['carnivore', 'shell', 'exoskeleton', 'goLand', 'insectWings', 'metamorphosis', 'diapause']);
  assert.ok(modLabels(insect, 'greatDying').includes('The only mass extinction of insects'));
  assert.ok(modLabels(insect, 'meteor').includes('Pupae wait out the dark'));
  assert.ok(modLabels(insect, 'iceAge').includes('Cold-blooded in the cold'));
  assert.ok(modLabels(insect, 'iceAge').includes('Sleeps through the winters'));
  const spider = lineage(['carnivore', 'shell', 'exoskeleton', 'goLand', 'arachnid', 'silk']);
  assert.ok(modLabels(spider, 'meteor').includes('Webs catch whatever still moves'));
});

// ── Whole games ────────────────────────────────────────────────────────────

/** Play a full game with random choices; returns the finished game. */
function playRandom(rng) {
  const g = G.createGame({ rng });
  const pick = (ids) => ids[Math.floor(rng() * ids.length)];
  for (;;) {
    G.applyChoice(g, pick(G.forkFor(g).options), 'fork');
    while (g.generation < GENERATIONS_PER_ERA) {
      G.simulateGeneration(g);
      if (g.status === 'extinct') return g;
      G.applyChoice(g, pick(G.minorOptions(g)), 'minor');
    }
    if (G.upcomingEvent(g) && !G.resolveEvent(g).survived) return g;
    if (!G.advanceEra(g)) return g;
  }
}

/** A small seeded random generator, so failures can be reproduced. */
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('random games always finish cleanly, and some reach the present day', () => {
  let survived = 0;
  for (let seed = 1; seed <= 500; seed++) {
    const g = playRandom(mulberry32(seed));
    assert.ok(['extinct', 'survived'].includes(g.status), `seed ${seed}: game ended as "${g.status}"`);
    for (const v of Object.values(g.meters)) assert.ok(Number.isFinite(v), `seed ${seed}: meter is ${v}`);
    assert.ok(Number.isFinite(g.population) && g.population >= 0, `seed ${seed}: population ${g.population}`);
    if (g.status === 'extinct') assert.ok(g.causeOfDeath, `seed ${seed}: extinct without a cause`);
    else survived++;
  }
  assert.ok(survived > 0, 'no random game survived to the present day');
});
