// Game state and simulation. Pure logic: no rendering, runnable in Node.

import {
  START, CHOICES, ERAS, EVENTS, DESCENDANTS, MIN_VIABLE_POPULATION, GENERATIONS_PER_ERA,
  TIER_EFFICIENCY, OMNIVORE_EFFICIENCY, PRESENT_DAY_MYA, PREDATION, PREDATION_SAFE, FORAGE_BITE, FORAGE_CAP, BITE_SHARE,
  DRY_SECONDS, SOAK_SECONDS, DRY_TICK, DRY_SHARE, ENERGY_SECONDS, ENERGY_BITE, ENERGY_SHARE, COMPETITION, RIVAL_FOLLOWS,
  RIVAL_HUNT_SHARE, STANDS,
} from './data.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const GENUS = ['Proto', 'Archae', 'Thalasso', 'Litho', 'Myxo', 'Cteno', 'Pelago', 'Zoo', 'Halo', 'Glauco'];
const GENUS_END = ['cellus', 'morpha', 'zoon', 'cystis', 'phyta', 'nema', 'derma'];
const EPITHET = ['primus', 'audax', 'minor', 'vorax', 'tenax', 'mirabilis', 'obscura', 'velox'];
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

export function randomSpeciesName(rng = Math.random) {
  return `${pick(GENUS, rng)}${pick(GENUS_END, rng)} ${pick(EPITHET, rng)}`;
}

/**
 * A new game, on Earth or on an alien `planet` (see planet.js). It comes with a rival lineage:
 * a second game played by chance (`rival: false` skips it).
 */
export function createGame({ name, rng = Math.random, rival = true, planet = null } = {}) {
  return {
    name: name || randomSpeciesName(rng),
    rng,
    planet,
    era: 0,
    generation: 0,
    mya: (planet?.eras ?? ERAS)[0].mya,
    population: START.population,
    peakPopulation: START.population,
    traits: { ...START.traits },
    meters: { ...START.meters },
    tags: new Set(START.tags),
    diet: null,
    foraged: 0, // food collected by hand this generation
    moisture: 100, // amphibians' skin, drying out on land in real time
    dryFor: 0, // seconds spent dried out since the last loss
    energy: 100, // warm-blooded species' energy, burned in real time on land
    hungryFor: 0, // seconds spent out of energy since the last loss
    rival: rival ? createGame({ rng, rival: false, planet }) : null,
    world: { shock: {}, oxygen: 1, wetness: 1 },
    history: [],
    status: 'alive', // alive | extinct | survived
    causeOfDeath: null,
  };
}

// ── Queries ────────────────────────────────────────────────────────────────

export const habitat = (g) => (g.tags.has('terrestrial') ? 'terrestrial' : 'aquatic');
export const dietLine = (g) => g.diet?.line ?? null;
/** Amphibians must keep returning to the water (a shelled egg frees reptiles from it). */
export const needsWater = (g) => g.tags.has('amphibian');
/** Warm-blooded species burn energy in real time and must keep eating. */
export const burnsEnergy = (g) => g.tags.has('warmBlooded');
/** The eras of the game's world: Earth's, or its alien planet's (same forks, its own extinctions). */
export const erasOf = (g) => g.planet?.eras ?? ERAS;
export const currentEra = (g) => erasOf(g)[g.era];
export function upcomingEvent(g) {
  const id = erasOf(g)[g.era]?.event;
  return id ? (g.planet?.events ?? EVENTS)[id] : null;
}

/** Share of the population lost to predators each generation: defense and size protect. */
export function predation(g) {
  if (g.era === 0) return 0;
  const protection = g.traits.defense + g.traits.size / 2;
  return PREDATION * clamp(1 - protection / PREDATION_SAFE, 0, 1);
}

export function carryingCapacity(g) {
  const swarm = g.tags.has('swarm') ? 1.8 : 1;
  return Math.round((10000 * (1 + g.traits.adaptability * 0.05) * swarm) / (0.6 + g.traits.size * 0.4));
}

export function meetsRequirements(g, req) {
  if (!req) return true;
  if (req.habitat && habitat(g) !== req.habitat) return false;
  if (req.minEra !== undefined && g.era < req.minEra) return false;
  if (req.maxEra !== undefined && g.era > req.maxEra) return false;
  if (req.tags && !req.tags.every((t) => g.tags.has(t))) return false;
  if (req.anyTags && !req.anyTags.some((t) => g.tags.has(t))) return false;
  if (req.notTags && req.notTags.some((t) => g.tags.has(t))) return false;
  if (req.trait && !Object.entries(req.trait).every(([k, v]) => g.traits[k] >= v)) return false;
  if (req.line) {
    const line = dietLine(g);
    // Omnivores may lean into carnivore/herbivore specializations.
    if (!req.line.includes(line) && line !== 'omnivore') return false;
  }
  return true;
}

export function forkFor(g) {
  return erasOf(g)[g.era].forks.find((f) => meetsRequirements(g, f.requires)) ?? null;
}

/**
 * Three random minor mutations: guaranteed ones first, then at least one diet
 * specialization when available.
 */
export function minorOptions(g, count = 3) {
  const majorIds = new Set(ERAS.flatMap((e) => e.forks.flatMap((f) => f.options)));
  const eligible = Object.keys(CHOICES).filter(
    (id) => !majorIds.has(id) && !g.tags.has(id) && meetsRequirements(g, CHOICES[id].requires),
  );
  const isGuaranteed = (id) => CHOICES[id].guaranteed && meetsRequirements(g, CHOICES[id].guaranteed);
  const picks = eligible.filter(isGuaranteed).slice(0, count);
  const rest = eligible.filter((id) => !picks.includes(id));
  const diets = shuffle(rest.filter((id) => CHOICES[id].diet), g.rng);
  const others = shuffle(rest.filter((id) => !CHOICES[id].diet), g.rng);
  if (diets.length && picks.length < count) picks.push(diets.shift());
  for (const id of shuffle([...others, ...diets], g.rng)) {
    if (picks.length >= count) break;
    picks.push(id);
  }
  return picks;
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Food web ───────────────────────────────────────────────────────────────

export function foodBaseline(g) {
  const e = g.era;
  if (habitat(g) === 'aquatic') {
    const reef = g.tags.has('reef') ? 1.3 : 1; // the crowded reefs teem with food
    return {
      plankton: reef, plants: (e === 0 ? 0.8 : 1) * reef, prey: (0.6 + 0.08 * e) * reef, carrion: 0.5,
      detritus: 0.8, shellfish: (e >= 1 ? 0.8 : 0) * reef, insects: 0, seeds: 0, fruit: 0, nectar: 0,
    };
  }
  return {
    plankton: 0, plants: 1, prey: 0.5 + 0.1 * (e - 3), carrion: 0.6, detritus: 0.6, shellfish: 0.2,
    insects: 1, seeds: e >= 4 ? 0.9 : 0.4, fruit: e >= 5 ? 1 : 0, nectar: e >= 5 ? 0.9 : 0,
  };
}

export function foodAbundance(g) {
  const base = foodBaseline(g);
  const out = {};
  for (const k of Object.keys(base)) out[k] = base[k] * (g.world.shock[k] ?? 1);
  return out;
}

function dietEfficiency(g) {
  if (!g.diet) return 0.7;
  return g.diet.line === 'omnivore' ? OMNIVORE_EFFICIENCY + (g.diet.tier - 1) * 0.1 : TIER_EFFICIENCY[g.diet.tier];
}

/** How much food the current diet can find, 0..~1.5 */
export function dietAvailability(g) {
  if (!g.diet) return 0.8;
  const ab = foodAbundance(g);
  const sources = g.diet.sources;
  const total = Object.values(sources).reduce((a, b) => a + b, 0);
  return Object.entries(sources).reduce((sum, [k, w]) => sum + (ab[k] ?? 0) * w, 0) / total;
}

/** How much two diets draw on the same food, 0..1. */
export function dietOverlap(a, b) {
  if (!a || !b) return 0;
  const shares = (d) => {
    const total = Object.values(d.sources).reduce((x, y) => x + y, 0);
    return (k) => (d.sources[k] ?? 0) / total;
  };
  const sa = shares(a), sb = shares(b);
  return Object.keys(a.sources).reduce((sum, k) => sum + Math.min(sa(k), sb(k)), 0);
}

/** Share of `g`'s food income that `other` takes: only in the same habitat, mostly by diet overlap, then by numbers. */
export function competition(g, other) {
  if (!other || other.status !== 'alive' || habitat(g) !== habitat(other)) return 0;
  const numbers = clamp(other.population / carryingCapacity(other), 0, 1);
  return COMPETITION * dietOverlap(g.diet, other.diet) * (0.5 + 0.5 * numbers);
}

// ── Actions ────────────────────────────────────────────────────────────────

export function applyChoice(g, id, kind) {
  const c = CHOICES[id];
  for (const [k, v] of Object.entries(c.traits ?? {})) g.traits[k] = clamp(g.traits[k] + v, 1, 10);
  for (const t of c.removeTags ?? []) g.tags.delete(t);
  for (const t of c.tags ?? []) g.tags.add(t);
  g.tags.add(id);
  if (c.removeTags?.includes('aquatic')) leaveWater(g);
  if (id === 'amphibian') g.moisture = 100;
  if (id === 'warmBlooded') g.energy = 100;
  if (c.diet) adoptDiet(g, c);
  g.history.push({ era: g.era, mya: g.mya, kind, id, name: c.name, icon: c.icon });
  return c;
}

// Sea diets (choices that require the water) stop working on land.
const isSeaDiet = (c) => c.requires?.habitat === 'aquatic';

function adoptDiet(g, c) {
  const prev = g.diet;
  if (!prev) {
    g.diet = { ...c.diet, name: c.name, sources: { ...c.diet.sources }, sea: isSeaDiet(c) };
    return;
  }
  if (prev.line === 'omnivore') {
    // Generalists blend new food sources in rather than replacing them.
    const sources = { ...prev.sources };
    for (const k of Object.keys(sources)) sources[k] *= 0.5;
    for (const [k, w] of Object.entries(c.diet.sources)) sources[k] = (sources[k] ?? 0) + w * 0.5;
    const lean = c.diet.line !== 'omnivore';
    const tier = Math.max(1, Math.max(prev.tier, c.diet.tier) - (lean ? 1 : 0));
    g.diet = { line: 'omnivore', tier, sources, name: c.name, sea: prev.sea || isSeaDiet(c) };
    return;
  }
  g.diet = { ...c.diet, name: c.name, sources: { ...c.diet.sources }, sea: isSeaDiet(c) };
}

/** Going ashore cancels sea food: a sea diet falls back to the line's basic diet, and plankton is dropped. */
function leaveWater(g) {
  if (!g.diet) return;
  if (g.diet.sea) {
    const base = CHOICES[g.diet.line];
    g.diet = { ...base.diet, name: base.name, sea: false };
  }
  g.diet.sources = Object.fromEntries(Object.entries(g.diet.sources).filter(([k]) => k !== 'plankton'));
}

/**
 * Live one generation: food/water/oxygen meters update, population grows or shrinks.
 * The rival lives its generation too, and picks a mutation of its own.
 */
export function simulateGeneration(g) {
  const r = liveGeneration(g, g.rival);
  const rival = g.rival;
  if (rival?.status === 'alive') {
    liveGeneration(rival, g);
    const options = minorOptions(rival);
    if (rival.status !== 'alive') r.rivalExtinct = true;
    else if (options.length) applyChoice(rival, pick(options, g.rng), 'minor');
  }
  return r;
}

function liveGeneration(g, rival) {
  const t = g.traits;
  const before = { ...g.meters, population: g.population };
  const availability = dietAvailability(g);

  const hunting = dietLine(g) === 'carnivore' ? t.speed * 1.5 : 0;
  const competed = competition(g, rival);
  const income = (dietEfficiency(g) * availability * (24 + t.size * 4) + hunting + t.adaptability * 0.8) * (1 - competed);
  const drain = 4 + t.metabolism * 2.5 + t.size * 2.5;
  g.meters.food = clamp(g.meters.food + income - drain, 0, 100);

  if (habitat(g) === 'aquatic') {
    g.meters.water = 100;
    const target = clamp(g.world.oxygen * 85 + (g.tags.has('gills') ? 15 : 0) - t.size, 0, 100);
    g.meters.oxygen += (target - g.meters.oxygen) * 0.6;
  } else {
    const moist = (g.tags.has('waterRetention') ? 10 : 0) + (g.tags.has('amphibian') ? 12 : 0); // amphibians stay near water
    const gain = g.world.wetness * 20 + moist + t.adaptability;
    g.meters.water = clamp(g.meters.water + gain - (8 + t.metabolism * 1.5), 0, 100);
    g.meters.oxygen += (90 - g.meters.oxygen) * 0.6;
  }

  const health = Math.min(g.meters.food, g.meters.water, g.meters.oxygen) / 100;
  let growth = t.reproduction * 0.05 * (health - 0.4) * 2.5;
  if (health < 0.15) growth -= 0.25;
  // Breeding makes up for an average predator toll, so poorly protected species fall behind
  // and well-protected ones come out ahead.
  const eaten = Math.round(g.population * predation(g));
  if (g.era > 0) growth += PREDATION / 2 - predation(g);
  let pop = g.population * (1 + growth);
  const cap = carryingCapacity(g);
  if (pop > cap) pop = cap + (pop - cap) * 0.3;
  g.population = Math.round(pop);
  g.peakPopulation = Math.max(g.peakPopulation, g.population);

  // The world slowly heals from past disasters.
  for (const k of Object.keys(g.world.shock)) g.world.shock[k] += (1 - g.world.shock[k]) * 0.4;
  g.world.oxygen += (1 - g.world.oxygen) * 0.4;
  g.world.wetness += (1 - g.world.wetness) * 0.4;

  g.generation += 1;
  g.foraged = 0;
  const era = erasOf(g)[g.era];
  const nextMya = erasOf(g)[g.era + 1]?.mya ?? PRESENT_DAY_MYA;
  g.mya = era.mya - ((era.mya - nextMya) * g.generation) / (GENERATIONS_PER_ERA + 1);

  if (g.population < MIN_VIABLE_POPULATION) {
    g.status = 'extinct';
    g.causeOfDeath = starvationCause(g);
  }
  return { before, after: { ...g.meters, population: g.population }, income, drain, availability, health, eaten, competition: competed };
}

/** The player reached a food item. Returns the food gained (0 once full for this generation). */
export function forage(g) {
  if (g.status !== 'alive') return 0;
  if (burnsEnergy(g)) g.energy = Math.min(100, g.energy + ENERGY_BITE); // every bite warms, even when well fed
  const gain = Math.min(FORAGE_BITE, FORAGE_CAP - g.foraged, 100 - g.meters.food);
  if (gain <= 0) return 0;
  g.meters.food += gain;
  g.foraged += gain;
  return gain;
}

/** A hunting predator caught the player. Defense and size limit the losses; it never ends the game. */
export function predatorAttack(g) {
  const share = predation(g) * BITE_SHARE;
  const lost = Math.max(0, Math.min(Math.round(g.population * share), g.population - MIN_VIABLE_POPULATION));
  g.population -= lost;
  return { lost, blocked: share === 0 };
}

/**
 * Real time passing for an amphibian, on land or in a lake: the skin dries out or soaks up
 * water again. Once dried out it costs population now and then, but never ends the game.
 */
export function skinMoisture(g, dt, inWater) {
  if (!needsWater(g) || g.status !== 'alive') return { lost: 0 };
  if (inWater) {
    g.moisture = Math.min(100, g.moisture + (100 * dt) / SOAK_SECONDS);
    g.dryFor = 0;
    return { lost: 0 };
  }
  const seconds = DRY_SECONDS * (g.tags.has('waterRetention') ? 1.5 : 1);
  g.moisture = Math.max(0, g.moisture - (100 * dt) / seconds);
  if (g.moisture > 0) return { lost: 0 };
  g.dryFor += dt;
  if (g.dryFor < DRY_TICK) return { lost: 0 };
  g.dryFor -= DRY_TICK;
  const lost = Math.max(0, Math.min(Math.round(g.population * DRY_SHARE), g.population - MIN_VIABLE_POPULATION));
  g.population -= lost;
  return { lost };
}

/**
 * Real time passing for a warm-blooded species on land: its energy burns away. Run out, and it
 * costs population now and then (refilled by reaching food), but never ends the game.
 */
export function bodyHeat(g, dt) {
  if (!burnsEnergy(g) || g.status !== 'alive') return { lost: 0 };
  g.energy = Math.max(0, g.energy - (100 * dt) / ENERGY_SECONDS);
  if (g.energy > 0) {
    g.hungryFor = 0;
    return { lost: 0 };
  }
  g.hungryFor += dt;
  if (g.hungryFor < DRY_TICK) return { lost: 0 };
  g.hungryFor -= DRY_TICK;
  const lost = Math.max(0, Math.min(Math.round(g.population * ENERGY_SHARE), g.population - MIN_VIABLE_POPULATION));
  g.population -= lost;
  return { lost };
}

/** Carnivores bigger than their rival can hunt its members where they meet them. */
export function canHuntRival(g) {
  const r = g.rival;
  return r?.status === 'alive' && habitat(r) === habitat(g) && dietLine(g) === 'carnivore' && g.traits.size > r.traits.size;
}

/** The player caught a member of the rival lineage: the rival's numbers fall (perhaps for good), and it is a meal. */
export function huntRival(g) {
  const r = g.rival;
  const lost = Math.round(r.population * RIVAL_HUNT_SHARE);
  r.population -= lost;
  if (r.population < MIN_VIABLE_POPULATION) {
    r.status = 'extinct';
    r.causeOfDeath = `Hunted by ${g.name}`;
  }
  return { lost, food: forage(g), extinct: r.status === 'extinct' };
}

/** The share of the population a last stand costs at once (burrowers dig in cheaply). */
export const standCost = (g, stand) => (g.tags.has('burrower') ? STANDS[stand].burrowerCost : STANDS[stand].cost) ?? 0;

/** The rival takes its fork for the era: the player's own choice, often, when it is on offer. */
export function rivalFork(g, playerChoice) {
  const rival = g.rival;
  if (rival?.status !== 'alive') return null;
  const options = forkFor(rival)?.options ?? [];
  if (!options.length) return null;
  const id = options.includes(playerChoice) && g.rng() < RIVAL_FOLLOWS ? playerChoice : pick(options, g.rng);
  return applyChoice(rival, id, 'fork');
}

function starvationCause(g) {
  const m = g.meters;
  const worst = Object.entries(m).sort((a, b) => a[1] - b[1])[0][0];
  return { food: 'Starvation', water: 'Drought', oxygen: 'Suffocation' }[worst];
}

export function eventBreakdown(g, ev) {
  const lines = [{ label: 'Baseline survival', value: ev.base }];
  for (const m of ev.mods) {
    if (m.tag && !g.tags.has(m.tag)) continue;
    if (m.habitat && habitat(g) !== m.habitat) continue;
    if (m.line && dietLine(g) !== m.line) continue;
    if (m.trait) {
      const v = g.traits[m.trait.name];
      if (m.trait.min !== undefined && v < m.trait.min) continue;
      if (m.trait.max !== undefined && v > m.trait.max) continue;
    }
    lines.push({ label: m.label, value: m.value });
  }
  lines.push({ label: 'Adaptability', value: g.traits.adaptability * 0.015 });
  return lines;
}

/**
 * How a choice would change the odds against this era's coming extinction (before feeding),
 * or 0 when none is coming. Previews the choice on a copy of the game.
 */
export function eventOutlook(g, id) {
  const ev = upcomingEvent(g);
  if (!ev || g.history.some((h) => h.kind === 'event' && h.era === g.era)) return 0;
  const odds = (x) => eventBreakdown(x, ev).reduce((sum, l) => sum + l.value, 0);
  const preview = {
    ...g, traits: { ...g.traits }, tags: new Set(g.tags), history: [],
    diet: g.diet && { ...g.diet, sources: { ...g.diet.sources } },
  };
  applyChoice(preview, id, 'preview');
  return odds(preview) - odds(g);
}

/** Resolve the era's extinction event, after the player's last stand (see STANDS). */
export function resolveEvent(g, stand = 'endure') {
  const ev = upcomingEvent(g);
  const s = STANDS[stand];
  const unprepared = g.population;
  g.population = Math.round(g.population * (1 - standCost(g, stand)) * (1 + (s.growth ?? 0)));
  if (s.food) g.meters.food = clamp(g.meters.food + s.food, 0, 100);
  g.peakPopulation = Math.max(g.peakPopulation, g.population);
  const breakdown = eventBreakdown(g, ev);
  if (s.survival) breakdown.push({ label: s.name, value: s.survival });
  const raw = breakdown.reduce((s, l) => s + l.value, 0);
  const health = Math.min(g.meters.food, g.meters.water, g.meters.oxygen) / 100;
  const fed = 0.5 + 0.5 * health;
  const noise = (g.rng() - 0.5) * 0.06;
  const survival = clamp((raw + noise) * fed, 0.01, 0.95);

  const before = g.population;
  g.population = Math.round(g.population * survival);
  for (const [k, v] of Object.entries(ev.shock ?? {})) g.world.shock[k] = v;
  if (ev.oxygen) g.world.oxygen = ev.oxygen;
  if (ev.wetness) g.world.wetness = ev.wetness;
  g.mya = ev.mya;

  const survived = g.population >= MIN_VIABLE_POPULATION;
  g.history.push({ era: g.era, mya: ev.mya, kind: 'event', id: erasOf(g)[g.era].event, name: ev.name, icon: ev.icon, survival, survived });
  if (!survived) {
    g.status = 'extinct';
    g.causeOfDeath = ev.name;
  }
  const rival = g.rival?.status === 'alive' && upcomingEvent(g.rival) ? { name: g.rival.name, survived: resolveEvent(g.rival).survived } : null;
  return { event: ev, breakdown, fed, survival, unprepared, before, after: g.population, survived, rival, stand };
}

export function advanceEra(g) {
  if (g.rival?.status === 'alive') advanceEra(g.rival);
  g.era += 1;
  g.generation = 0;
  g.moisture = 100; // each era starts fresh from the water
  g.dryFor = 0;
  g.energy = 100;
  g.hungryFor = 0;
  if (g.era >= erasOf(g).length) {
    g.status = 'survived';
    g.mya = PRESENT_DAY_MYA;
    return false;
  }
  g.mya = erasOf(g)[g.era].mya;
  return true;
}

/**
 * The living group this lineage resembles (for the ending screen). On an alien planet, what it
 * became there, with its closest Earth counterpart in `earth`.
 */
export function descendants(g) {
  const earth = DESCENDANTS.find((d) => meetsRequirements(g, d.requires));
  return g.planet ? { ...alienDescendant(g), icon: earth.icon, earth } : earth;
}

function alienDescendant(g) {
  const t = g.tags, p = g.planet, w = p.words;
  const has = (...tags) => tags.find((x) => t.has(x));
  const body = {
    cephalopod: 'Tentacled', insect: 'Six-legged', arachnid: 'Eight-legged', exoskeleton: 'Armored', fur: 'Furred', feathers: 'Feathered',
    amphibian: 'Soft-skinned', shell: 'Shelled', spine: 'Backboned',
  }[has('cephalopod', 'insect', 'arachnid', 'exoskeleton', 'fur', 'feathers', 'amphibian', 'shell', 'spine')] ?? 'Soft-bodied';
  const form = {
    intelligence: 'thinkers', flight: 'flyers', glider: 'gliders', giant: 'giants', swarm: 'swarms', colony: 'hive-builders', silk: 'web-weavers',
  }[has('intelligence', 'giant', 'swarm', 'glider', 'colony', 'silk', 'flight')] ?? { carnivore: 'hunters', herbivore: 'grazers', omnivore: 'foragers' }[dietLine(g)] ?? 'drifters';
  const where = t.has('terrestrial') ? `the ${w.land}` : t.has('deepSea') ? `the black depths of its ${w.sea} seas` : t.has('reef') ? `its bright ${w.sea} reefs` : `its ${w.sea} seas`;
  const doing = {
    thinkers: `They build, and wonder at the ${w.sun} sun, across ${where}.`,
    flyers: `Their flocks darken the ${w.sun} sky over ${where}.`,
    gliders: `They leap from ${where} and sail through the air on wide fins.`,
    giants: `The largest living things on ${p.name}, slow and unbothered, roam ${where}.`,
    swarms: `Countless billions of them ripple through ${where}.`,
  }[form] ?? `They have spread through ${where}, under ${p.name}'s ${w.sun} sun.`;
  return { name: `${body} ${form} of ${p.name}`, fact: doing };
}

/** How many mass extinctions the lineage has lived through. */
export const extinctionsSurvived = (g) => g.history.filter((h) => h.kind === 'event' && h.survived).length;

export function lifespanMyr(g) {
  return erasOf(g)[0].mya - g.mya;
}
