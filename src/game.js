// Game state and simulation. Pure logic: no rendering, runnable in Node.

import {
  START, CHOICES, ERAS, EVENTS, MIN_VIABLE_POPULATION, GENERATIONS_PER_ERA,
  TIER_EFFICIENCY, OMNIVORE_EFFICIENCY, PRESENT_DAY_MYA,
} from './data.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const GENUS = ['Proto', 'Archae', 'Thalasso', 'Litho', 'Myxo', 'Cteno', 'Pelago', 'Zoo', 'Halo', 'Glauco'];
const GENUS_END = ['cellus', 'morpha', 'zoon', 'cystis', 'phyta', 'nema', 'derma'];
const EPITHET = ['primus', 'audax', 'minor', 'vorax', 'tenax', 'mirabilis', 'obscura', 'velox'];
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

export function randomSpeciesName(rng = Math.random) {
  return `${pick(GENUS, rng)}${pick(GENUS_END, rng)} ${pick(EPITHET, rng)}`;
}

export function createGame({ name, rng = Math.random } = {}) {
  return {
    name: name || randomSpeciesName(rng),
    rng,
    era: 0,
    generation: 0,
    mya: ERAS[0].mya,
    population: START.population,
    peakPopulation: START.population,
    traits: { ...START.traits },
    meters: { ...START.meters },
    tags: new Set(START.tags),
    diet: null,
    world: { shock: {}, oxygen: 1, wetness: 1 },
    history: [],
    status: 'alive', // alive | extinct | survived
    causeOfDeath: null,
  };
}

// ── Queries ────────────────────────────────────────────────────────────────

export const habitat = (g) => (g.tags.has('terrestrial') ? 'terrestrial' : 'aquatic');
export const dietLine = (g) => g.diet?.line ?? null;
export const currentEra = (g) => ERAS[g.era];
export const upcomingEvent = (g) => (ERAS[g.era]?.event ? EVENTS[ERAS[g.era].event] : null);

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
  return ERAS[g.era].forks.find((f) => meetsRequirements(g, f.requires)) ?? null;
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
    return {
      plankton: 1, plants: e === 0 ? 0.8 : 1, prey: 0.6 + 0.08 * e, carrion: 0.5,
      detritus: 0.8, shellfish: e >= 1 ? 0.8 : 0, insects: 0, seeds: 0, fruit: 0, nectar: 0,
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

// ── Actions ────────────────────────────────────────────────────────────────

export function applyChoice(g, id, kind) {
  const c = CHOICES[id];
  for (const [k, v] of Object.entries(c.traits ?? {})) g.traits[k] = clamp(g.traits[k] + v, 1, 10);
  for (const t of c.removeTags ?? []) g.tags.delete(t);
  for (const t of c.tags ?? []) g.tags.add(t);
  g.tags.add(id);
  if (c.removeTags?.includes('aquatic')) leaveWater(g);
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

/** Live one generation: food/water/oxygen meters update, population grows or shrinks. */
export function simulateGeneration(g) {
  const t = g.traits;
  const before = { ...g.meters, population: g.population };
  const availability = dietAvailability(g);

  const hunting = dietLine(g) === 'carnivore' ? t.speed * 1.5 : 0;
  const income = dietEfficiency(g) * availability * (24 + t.size * 4) + hunting + t.adaptability * 0.8;
  const drain = 4 + t.metabolism * 2.5 + t.size * 2.5;
  g.meters.food = clamp(g.meters.food + income - drain, 0, 100);

  if (habitat(g) === 'aquatic') {
    g.meters.water = 100;
    const target = clamp(g.world.oxygen * 85 + (g.tags.has('gills') ? 15 : 0) - t.size, 0, 100);
    g.meters.oxygen += (target - g.meters.oxygen) * 0.6;
  } else {
    const gain = g.world.wetness * 20 + (g.tags.has('waterRetention') ? 10 : 0) + t.adaptability;
    g.meters.water = clamp(g.meters.water + gain - (8 + t.metabolism * 1.5), 0, 100);
    g.meters.oxygen += (90 - g.meters.oxygen) * 0.6;
  }

  const health = Math.min(g.meters.food, g.meters.water, g.meters.oxygen) / 100;
  let growth = t.reproduction * 0.05 * (health - 0.4) * 2.5;
  if (health < 0.15) growth -= 0.25;
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
  const era = ERAS[g.era];
  const nextMya = ERAS[g.era + 1]?.mya ?? PRESENT_DAY_MYA;
  g.mya = era.mya - ((era.mya - nextMya) * g.generation) / (GENERATIONS_PER_ERA + 1);

  if (g.population < MIN_VIABLE_POPULATION) {
    g.status = 'extinct';
    g.causeOfDeath = starvationCause(g);
  }
  return { before, after: { ...g.meters, population: g.population }, income, drain, availability, health };
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

/** Resolve the era's extinction event. */
export function resolveEvent(g) {
  const ev = upcomingEvent(g);
  const breakdown = eventBreakdown(g, ev);
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
  g.history.push({ era: g.era, mya: ev.mya, kind: 'event', id: ERAS[g.era].event, name: ev.name, icon: ev.icon, survival, survived });
  if (!survived) {
    g.status = 'extinct';
    g.causeOfDeath = ev.name;
  }
  return { event: ev, breakdown, fed, survival, before, after: g.population, survived };
}

export function advanceEra(g) {
  g.era += 1;
  g.generation = 0;
  if (g.era >= ERAS.length) {
    g.status = 'survived';
    g.mya = PRESENT_DAY_MYA;
    return false;
  }
  g.mya = ERAS[g.era].mya;
  return true;
}

export function lifespanMyr(g) {
  return ERAS[0].mya - g.mya;
}
