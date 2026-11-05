// Game rules: forks, mutations, diets, extinction events and whole games.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {
  CHOICES, ERAS, EVENTS, GENERATIONS_PER_ERA, FORAGE_CAP, MIN_VIABLE_POPULATION, DRY_SECONDS, SOAK_SECONDS, DRY_TICK, ENERGY_SECONDS, ENERGY_BITE,
} from '../src/data.js';

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

test('Body Plans ends with the End-Ordovician extinction, where cold tolerance helps', () => {
  const g = lineage(['carnivore', 'shell']);
  assert.equal(G.currentEra(g).name, 'Body Plans');
  assert.equal(G.upcomingEvent(g).name, 'The Ordovician Freeze');
  const cold = withChoices(['carnivore', 'coldTolerance'], 2);
  assert.ok(modLabels(cold, 'ordovicianIce').includes('Cold tolerance'));
});

test('reef lineages lose their reefs but can swim to new waters', () => {
  const reef = lineage(['carnivore', 'speed', 'spine', 'stayWater', 'reef']);
  const labels = modLabels(reef, 'greatDying');
  assert.ok(labels.includes('Reefs collapse') && labels.includes('Reef dwellers swim to new waters'));
  const net = G.eventBreakdown(reef, EVENTS.greatDying).filter((l) => l.label.startsWith('Reef')).reduce((sum, l) => sum + l.value, 0);
  assert.ok(net > 0, 'reef modifiers should no longer be a net penalty');
  assert.ok(modLabels(lineage(['carnivore', 'speed', 'spine', 'stayWater', 'reef', 'schooling']), 'meteor').includes('Safety in numbers'));
  assert.ok(modLabels(lineage(['carnivore', 'speed', 'spine', 'stayWater', 'reef', 'symbiosis']), 'meteor').includes('Partners share what food is left'));
});

// ── Predators ──────────────────────────────────────────────────────────────

test('predators only appear once life has bodies', () => {
  const cell = G.createGame();
  assert.equal(G.predation(cell), 0);
  assert.equal(G.simulateGeneration(cell).eaten, 0);
});

test('defense and size protect against predators, down to nothing', () => {
  const g = lineage(['carnivore']);
  const at = (defense, size) => { g.traits.defense = defense; g.traits.size = size; return G.predation(g); };
  assert.ok(at(1, 1) > at(4, 1), 'more defense should mean fewer losses');
  assert.ok(at(4, 1) > at(4, 5), 'a bigger body should mean fewer losses');
  assert.equal(at(8, 1), 0, 'a well-armored species should be safe');
  assert.equal(at(10, 10), 0);
});

test('a well-defended species outgrows an undefended one', () => {
  const grow = (defense) => {
    const g = lineage(['herbivore']);
    g.traits.defense = defense;
    const r = G.simulateGeneration(g);
    return { pop: g.population, eaten: r.eaten };
  };
  const weak = grow(1), strong = grow(9);
  assert.ok(weak.eaten > 0 && strong.eaten === 0);
  assert.ok(strong.pop > weak.pop);
});

// ── New branches ───────────────────────────────────────────────────────────

test('cephalopods choose a shell or a jet instead of a shore, and stay in the sea', () => {
  const g = lineage(['carnivore', 'shell', 'tentacles']);
  assert.deepEqual(G.forkFor(g).options, ['coiledShell', 'jetPropulsion']);
  G.applyChoice(g, 'coiledShell', 'fork');
  G.advanceEra(g);
  assert.equal(G.habitat(g), 'aquatic');
  assert.deepEqual(G.forkFor(g).options, ['deepSea', 'reef']);
  assert.ok(modLabels(lineage(['carnivore', 'shell', 'tentacles', 'coiledShell', 'deepSea']), 'meteor').includes('Ammonites vanish with the dinosaurs'));
});

test('vertebrates can settle the water\'s edge; a shelled egg makes them reptiles', () => {
  assert.deepEqual(G.forkFor(lineage(['herbivore', 'shell', 'spine'])).options, ['stayWater', 'amphibian', 'goLand']);
  assert.deepEqual(G.forkFor(lineage(['herbivore', 'shell', 'exoskeleton'])).options, ['stayWater', 'goLand']);
  const frog = lineage(['herbivore', 'shell', 'spine', 'amphibian']);
  assert.equal(G.habitat(frog), 'terrestrial');
  assert.deepEqual(G.forkFor(frog).options, ['tadpoles', 'shelledEgg']);
  assert.deepEqual(G.forkFor(lineage(['herbivore', 'shell', 'spine', 'amphibian', 'tadpoles'])).options, ['poisonSkin', 'aestivation']);
  assert.deepEqual(G.forkFor(lineage(['herbivore', 'shell', 'spine', 'amphibian', 'tadpoles', 'poisonSkin'])).options, ['giant', 'swarm']);
  const reptile = lineage(['herbivore', 'shell', 'spine', 'amphibian', 'shelledEgg']);
  assert.ok(reptile.tags.has('coldBlooded') && !reptile.tags.has('amphibian'));
  assert.deepEqual(G.forkFor(reptile).options, ['eggs', 'liveBirth']);
});

test('amphibians keep moist near water', () => {
  const water = (ids) => { const g = lineage(ids); g.meters.water = 50; G.simulateGeneration(g); return g.meters.water; };
  assert.ok(water(['herbivore', 'shell', 'spine', 'amphibian']) > water(['herbivore', 'shell', 'spine', 'goLand']));
});

test('every sea lineage can end as a glider', () => {
  for (const ids of [['omnivore', 'shell', 'spine', 'stayWater', 'reef', 'schooling'], ['omnivore', 'shell', 'tentacles', 'jetPropulsion', 'deepSea', 'bioluminescence']]) {
    assert.ok(G.forkFor(lineage(ids)).options.includes('glide'), ids.join(' > '));
  }
});

// ── Your lineage today ─────────────────────────────────────────────────────

test('every lineage that reaches the present day resembles a specific living group', () => {
  const generic = ['Fish', 'Land vertebrates'];
  const walk = (ids) => {
    const g = lineage(ids);
    if (g.status === 'survived') {
      const d = G.descendants(g);
      assert.ok(d && !generic.includes(d.name), `${ids.join(' > ')} only matches "${d?.name}"`);
      return;
    }
    for (const o of G.forkFor(g).options) walk([...ids, o]);
  };
  walk([]);
});

test('lineages that die early still get a sensible "might have been"', () => {
  assert.equal(G.descendants(G.createGame()).name, 'Sponges and jellyfish');
  assert.equal(G.descendants(lineage(['carnivore', 'shell', 'exoskeleton'])).name, 'Horseshoe crabs');
});

// ── Foraging and hunts ─────────────────────────────────────────────────────

test('foraging tops up food, up to a limit per generation', () => {
  const g = lineage(['herbivore']);
  g.meters.food = 40;
  let total = 0;
  for (let i = 0; i < 20; i++) total += G.forage(g);
  assert.equal(total, FORAGE_CAP);
  assert.equal(G.forage(g), 0, 'nothing more until the next generation');
  G.simulateGeneration(g);
  g.meters.food = 40;
  assert.ok(G.forage(g) > 0, 'a new generation can forage again');
  g.meters.food = 100;
  assert.equal(G.forage(g), 0, 'a full meter cannot go higher');
});

test('a predator catching the player costs population, unless defenses hold', () => {
  const weak = lineage(['carnivore', 'speed']);
  const before = weak.population;
  const bite = G.predatorAttack(weak);
  assert.ok(bite.lost > 0 && !bite.blocked);
  assert.equal(weak.population, before - bite.lost);

  const armored = lineage(['carnivore', 'shell']);
  armored.traits.defense = 9;
  assert.deepEqual(G.predatorAttack(armored), { lost: 0, blocked: true });

  const tiny = lineage(['carnivore', 'speed']);
  tiny.population = MIN_VIABLE_POPULATION + 10;
  G.predatorAttack(tiny);
  assert.ok(tiny.population >= MIN_VIABLE_POPULATION, 'a bite never ends the game by itself');
});

test('amphibians dry out on land and must go back to the water', () => {
  const g = lineage(['carnivore', 'shell', 'spine', 'amphibian']);
  assert.ok(G.needsWater(g));
  const before = g.population;
  G.skinMoisture(g, DRY_SECONDS / 2, false);
  assert.ok(Math.abs(g.moisture - 50) < 1e-9, 'half dry after half the time');
  assert.equal(g.population, before, 'no losses while the skin is still wet');
  G.skinMoisture(g, DRY_SECONDS, false);
  assert.equal(g.moisture, 0);
  const dry = g.population;
  const r = G.skinMoisture(g, DRY_TICK, false);
  assert.ok(r.lost > 0 && g.population === dry - r.lost, 'dried out costs population');
  G.skinMoisture(g, SOAK_SECONDS, true);
  assert.equal(g.moisture, 100, 'a lake wets the skin again');
  assert.equal(G.skinMoisture(g, DRY_TICK, false).lost, 0);

  g.population = MIN_VIABLE_POPULATION + 5;
  g.moisture = 0;
  for (let i = 0; i < 10; i++) G.skinMoisture(g, DRY_TICK, false);
  assert.ok(g.population >= MIN_VIABLE_POPULATION, 'drying never ends the game by itself');

  const retains = withChoices(['amphibian', 'waterRetention']);
  G.skinMoisture(retains, DRY_SECONDS, false);
  assert.ok(retains.moisture > 0, 'Water Retention slows drying');

  const reptile = withChoices(['amphibian', 'shelledEgg']);
  assert.ok(!G.needsWater(reptile));
  G.skinMoisture(reptile, DRY_SECONDS * 2, false);
  assert.equal(reptile.moisture, 100, 'a shelled egg frees reptiles from the water');
});

test('warm-blooded species burn energy on land and refill it with food; it costs population, never the game', () => {
  const g = lineage(['omnivore', 'shell', 'spine', 'goLand', 'warmBlooded']);
  assert.ok(G.burnsEnergy(g));
  assert.equal(g.energy, 100);
  G.bodyHeat(g, ENERGY_SECONDS / 2);
  assert.equal(g.energy, 50);
  G.forage(g);
  assert.equal(g.energy, 50 + ENERGY_BITE, 'each food item refuels');
  g.population = MIN_VIABLE_POPULATION + 100;
  for (let i = 0; i < 100; i++) G.bodyHeat(g, DRY_TICK);
  assert.equal(g.population, MIN_VIABLE_POPULATION, 'out of energy, the population falls to the viable minimum');
  assert.equal(g.status, 'alive');

  const cold = lineage(['omnivore', 'shell', 'spine', 'goLand', 'coldBlooded']);
  G.bodyHeat(cold, ENERGY_SECONDS * 2);
  assert.equal(cold.energy, 100, 'cold-blooded species do not burn energy');
});

// ── Extinction outlook on the cards ───────────────────────────────────────

test('cards can tell what helps or hurts against the coming extinction', () => {
  const g = withChoices(['omnivore'], 2); // the Ordovician Freeze is coming
  assert.ok(G.eventOutlook(g, 'coldTolerance') > 0.2);
  assert.ok(G.eventOutlook(g, 'filterFeeder') < 0);
  assert.ok(Math.abs(G.eventOutlook(g, 'fastBreeding')) < 0.05);
  assert.ok(!g.tags.has('coldTolerance'), 'previewing a choice does not take it');
  G.resolveEvent(g);
  assert.equal(G.eventOutlook(g, 'coldTolerance'), 0, 'nothing more to say once the extinction is past');
});

// ── The rival lineage ─────────────────────────────────────────────────────

test('a rival lineage evolves in step with the player', () => {
  const g = G.createGame({ rng: mulberry32(7) });
  assert.ok(g.rival && !g.rival.rival, 'the rival has no rival of its own');
  G.applyChoice(g, 'omnivore', 'fork');
  assert.ok(G.rivalFork(g, 'omnivore'));
  assert.ok(g.rival.diet, 'the rival takes a diet too');
  G.simulateGeneration(g);
  assert.equal(g.rival.generation, 1);
  assert.equal(g.rival.history.filter((h) => h.kind === 'minor').length, 1, 'and a mutation every generation');
  G.advanceEra(g);
  assert.equal(g.rival.era, g.era);
});

test('the rival takes food only where diets overlap, in the same habitat, while it lives', () => {
  const g = withChoices(['herbivore']);
  G.applyChoice(g.rival, 'herbivore', 'fork');
  const taken = G.competition(g, g.rival);
  assert.ok(taken > 0);

  const alone = withChoices(['herbivore']);
  alone.rival = null;
  const r = G.simulateGeneration(g);
  assert.equal(r.competition, taken);
  assert.ok(Math.abs(r.income - G.simulateGeneration(alone).income * (1 - taken)) < 1e-9, 'it cuts food income');

  const apart = withChoices(['herbivore']);
  G.applyChoice(apart.rival, 'carnivore', 'fork');
  assert.equal(G.competition(apart, apart.rival), 0, 'no shared food, no competition');
  const ashore = withChoices(['herbivore']);
  G.applyChoice(ashore.rival, 'herbivore', 'fork');
  G.applyChoice(ashore.rival, 'goLand', 'fork');
  assert.equal(G.competition(ashore, ashore.rival), 0, 'no competition across habitats');
  g.rival.status = 'extinct';
  assert.equal(G.competition(g, g.rival), 0, 'an extinct rival takes nothing');
});

test('the rival faces the same extinctions', () => {
  const g = withChoices(['omnivore'], 2);
  G.applyChoice(g.rival, 'omnivore', 'fork');
  g.rival.era = 2;
  const r = G.resolveEvent(g);
  assert.equal(r.rival.name, g.rival.name);
  assert.equal(r.rival.survived, g.rival.status === 'alive');
  assert.equal(g.rival.history.at(-1).kind, 'event');
});

// ── Whole games ────────────────────────────────────────────────────────────

/** Play a full game with random choices; returns the finished game. */
function playRandom(rng) {
  const g = G.createGame({ rng });
  const pick = (ids) => ids[Math.floor(rng() * ids.length)];
  for (;;) {
    const id = pick(G.forkFor(g).options);
    G.applyChoice(g, id, 'fork');
    G.rivalFork(g, id);
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
