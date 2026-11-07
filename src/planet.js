// Alien worlds: a planet generated from a seed, with its own eras and mass extinctions.
// Pure logic, so it also runs in Node. The evolution tree stays Earth's: only the world changes.

import { ERAS, GENERATIONS_PER_ERA } from './data.js';
import { createGame, forkFor, applyChoice, rivalFork, simulateGeneration, minorOptions, upcomingEvent, resolveEvent, advanceEra } from './game.js';

// ── Seeded randomness ──────────────────────────────────────────────────────

/** A random generator that always gives the same numbers for the same seed text. */
export function seededRandom(seed) {
  let h = 2166136261; // FNV-1a hash of the text
  for (const ch of String(seed)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0; // mulberry32
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alikes (0/O, 1/I)

/** A short seed to share, like "7F3K". */
export function randomSeed(rng = Math.random) {
  return Array.from({ length: 4 }, () => SEED_CHARS[Math.floor(rng() * SEED_CHARS.length)]).join('');
}

/** Seeds are typed by people: ignore case and stray spaces. */
export const cleanSeed = (text) => String(text).toUpperCase().replace(/\s+/g, '');

// ── Words ──────────────────────────────────────────────────────────────────

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const fill = (text, words) => text.replace(/\{(\w+)\}/g, (_, k) => words[k]);

const SYLLABLES = ['or', 'u', 'va', 'ne', 'thal', 'ix', 'ka', 'ry', 'zen', 'mar', 'sel', 'dra', 'vy', 'kel', 'ar', 'is', 'eth', 'lu', 'qua', 'om', 'tes', 'ny'];
const SUNS = ['violet', 'crimson', 'pale', 'amber', 'blue-white', 'dying red', 'green-gold'];
const SEAS = ['amber', 'ink-dark', 'milky', 'copper', 'violet', 'jade', 'rust-red'];
const LANDS = ['glass dunes', 'fungal plains', 'basalt spires', 'crystal flats', 'black moss', 'salt mesas'];

// Era names and blurbs, by era: each era keeps Earth's forks (what life can become then).
const ERA_TEXTS = [
  [['The First Waters', 'A warm, {sea} ocean under a {sun} sun. Life is a single fragile cell.'],
    ['The {Sea} Shallows', 'Cells drift in the {sea} shallows of young {planet}.']],
  [['The Gathering', 'Cells band together into bodies, and bodies into predators.'],
    ['The Many-Celled Age', 'Life grows bodies. With bodies come hunters.']],
  [['The Age of Shapes', 'Life tries out every body it can build. Which will be yours?'],
    ['The Experiment', 'A burst of strange shapes fills the {sea} seas.']],
  [['The Wet Edge', 'Life creeps out over the {land}. The land waits, empty.'],
    ['The Tideline', 'Strange growths spread onto the {land}. The shore is open.']],
  [['The Spreading', 'Life fills every corner of {planet} it can reach.'],
    ['The Great Branching', 'Lineages split and split again across land and sea.']],
  [['The Inheritors', 'The survivors inherit a reshaped world.'],
    ['The Second Dawn', 'New masters rise over the {land}.']],
  [['The Long Noon', 'Under the {sun} sun, giants and minds rise. The last test approaches.'],
    ['The Age of Giants', 'The largest and cleverest life {planet} has known. One trial remains.']],
];

// ── Mass extinctions: a cause, and pressures drawn from it ───────────────────
//
// Each pressure is a modifier the rules already understand (see EVENTS in data.js), with
// `from`: the first era a lineage can have what it asks for, so no extinction rewards
// something nobody could have evolved yet.

const P = (from, value, label, mod) => ({ from, mod: { ...mod, value, label } });

const CAUSES = {
  flare: {
    icon: '☀️', look: 'greatOxidation',
    names: ['The {Sun} Flare', 'The Burning Sky'],
    warning: 'The {sun} sun flickers at noon, and strange lights ripple across the night sky.',
    desc: 'The star erupts. Searing radiation strips the surface bare.',
    pressures: [
      P(0, 0.15, 'Water shields from the radiation', { habitat: 'aquatic' }),
      P(3, -0.15, 'Exposed on land', { habitat: 'terrestrial' }),
      P(1, 0.15, 'Shells block the radiation', { tag: 'shell' }),
      P(2, 0.2, 'Shelter underground', { tag: 'burrower' }),
      P(4, 0.2, 'The deep is out of reach', { tag: 'deepSea' }),
      P(0, -0.15, 'Too big to hide', { trait: { name: 'size', min: 6 } }),
      P(0, 0.1, 'Breeds back fast', { trait: { name: 'reproduction', min: 7 } }),
      P(0, -0.1, 'Plants are scorched', { line: 'herbivore' }),
      P(5, 0.1, 'Fur shades the skin', { tag: 'fur' }),
    ],
    shock: { plants: 0.4, plankton: 0.5 },
  },
  impact: {
    icon: '☄️', look: 'meteor',
    names: ['The Falling Moon', 'The Moon-Shard'],
    warning: 'A shard of the broken moon grows brighter every night.',
    desc: 'A fragment of the moon strikes {planet}. Fire, then years of darkness.',
    pressures: [
      P(0, 0.15, 'Small body', { trait: { name: 'size', max: 3 } }),
      P(0, -0.2, 'Too big to hide or feed', { trait: { name: 'size', min: 6 } }),
      P(2, 0.15, 'Shelter underground', { tag: 'burrower' }),
      P(4, 0.2, 'The deep barely notices', { tag: 'deepSea' }),
      P(1, 0.15, 'Endless carrion', { tag: 'scavenger' }),
      P(1, 0.15, 'Endless decay', { tag: 'detritivore' }),
      P(0, -0.1, 'Plants die in the dark', { line: 'herbivore' }),
      P(0, 0.1, 'Needs little food', { trait: { name: 'metabolism', max: 3 } }),
    ],
    shock: { plants: 0.2, prey: 0.5, carrion: 2 },
  },
  winter: {
    icon: '🧊', look: 'iceAge', earlyLook: 'snowball',
    names: ['The Long Winter', 'The White Silence'],
    warning: '{Planet} drifts farther from its sun. Every winter is longer than the last.',
    desc: 'Ice spreads from the poles until the whole world is white.',
    pressures: [
      P(0, 0.25, 'Cold tolerance', { tag: 'coldTolerant' }),
      P(4, 0.15, 'Warm-blooded', { tag: 'warmBlooded' }),
      P(5, 0.2, 'Thick fur', { tag: 'fur' }),
      P(5, 0.15, 'Insulating feathers', { tag: 'feathers' }),
      P(4, -0.15, 'Too cold to move', { tag: 'coldBlooded', habitat: 'terrestrial' }),
      P(0, 0.08, 'Big bodies keep warm', { trait: { name: 'size', min: 5 } }),
      P(4, -0.15, 'Reefs freeze', { tag: 'reef' }),
      P(4, 0.15, 'The deep stays stable', { tag: 'deepSea' }),
      P(0, -0.08, 'Sunlight fades', { line: 'herbivore' }),
      P(3, -0.1, 'Moist skin freezes', { tag: 'amphibian' }),
    ],
    shock: { plants: 0.4, plankton: 0.6 },
    wetness: 0.6,
  },
  toxic: {
    icon: '🧪', look: 'oceanAnoxia',
    names: ['The {Sea} Bloom', 'The Poisoned Tide'],
    warning: 'Slicks of {sea} scum spread on the water. Fish float belly-up at dawn.',
    desc: 'A toxic bloom chokes the seas. The water itself turns to poison.',
    pressures: [
      P(3, 0.35, 'Escaped the poisoned seas', { habitat: 'terrestrial' }),
      P(1, 0.2, 'Better gills', { tag: 'gills', habitat: 'aquatic' }),
      P(0, 0.08, 'Small body, low oxygen need', { trait: { name: 'size', max: 3 } }),
      P(1, -0.15, 'Filters in the poison', { tag: 'filterFeeder' }),
      P(1, 0.1, 'Feeds on the dead', { tag: 'detritivore' }),
      P(4, -0.15, 'Reefs choke', { tag: 'reef' }),
      P(3, -0.12, 'Skin soaks up the poison', { tag: 'amphibian' }),
      P(0, 0.1, 'A tough, adaptable gut', { tag: 'generalistGut' }),
    ],
    shock: { plankton: 0.4, prey: 0.5, shellfish: 0.4 },
    oxygen: 0.4,
  },
  rift: {
    icon: '🌋', look: 'greatDying',
    names: ['The Burning Rift', 'The Ash Years'],
    warning: 'The ground splits open. Ash falls like snow over the {land}.',
    desc: 'The crust tears apart. Fire and ash poison the air and the seas.',
    pressures: [
      P(2, 0.15, 'Shelter underground', { tag: 'burrower' }),
      P(0, 0.12, 'Low metabolism', { trait: { name: 'metabolism', max: 3 } }),
      P(4, 0.12, 'The deep is buffered', { tag: 'deepSea' }),
      P(1, 0.12, 'Feasts on the dead', { tag: 'scavenger' }),
      P(4, 0.08, 'Tolerates heat', { tag: 'coldBlooded' }),
      P(1, -0.12, 'Acid seas eat shells', { tag: 'shell', habitat: 'aquatic' }),
      P(3, 0.12, 'Holds on to water', { tag: 'waterRetention' }),
      P(0, -0.12, 'Too big to feed', { trait: { name: 'size', min: 6 } }),
    ],
    shock: { plants: 0.4, prey: 0.5, carrion: 1.8 },
    oxygen: 0.6, wetness: 0.6,
  },
  spores: {
    icon: '🍄', look: 'oceanAnoxia',
    names: ['The Spore Plague', 'The Grey Rot'],
    warning: 'A grey dust settles on everything. Some animals stop moving, and sprout.',
    desc: 'A fungal plague sweeps the world, spreading fastest where life crowds together.',
    pressures: [
      P(6, -0.2, 'Swarms spread the spores', { tag: 'swarm' }),
      P(5, -0.12, 'Schools spread the spores', { tag: 'schooling' }),
      P(5, -0.12, 'The colony is infected', { tag: 'colony' }),
      P(3, -0.1, 'Living in groups spreads it', { tag: 'social' }),
      P(4, 0.12, 'Hide too thick for spores', { tag: 'thickHide' }),
      P(1, 0.12, 'Hard shells keep spores out', { tag: 'shell' }),
      P(2, 0.12, 'Armor keeps spores out', { tag: 'exoskeleton' }),
      P(0, 0.1, 'Breeds back fast', { trait: { name: 'reproduction', min: 7 } }),
      P(0, 0.1, 'A tough, adaptable gut', { tag: 'generalistGut' }),
    ],
    shock: { prey: 0.6, plants: 0.7 },
  },
  thinAir: {
    icon: '🫧', look: 'greatOxidation',
    names: ['The Thinning', 'The Breathless Age'],
    warning: 'The sky grows darker blue each year. Climbing a hill leaves you gasping.',
    desc: '{Planet} bleeds its air into space. Every breath counts.',
    pressures: [
      P(0, 0.12, 'Water holds what air is left', { habitat: 'aquatic' }),
      P(0, 0.1, 'Small bodies need less air', { trait: { name: 'size', max: 3 } }),
      P(0, 0.12, 'Low metabolism', { trait: { name: 'metabolism', max: 3 } }),
      P(0, -0.12, 'A hungry metabolism', { trait: { name: 'metabolism', min: 7 } }),
      P(1, 0.15, 'Better gills', { tag: 'gills' }),
      P(4, -0.1, 'Warm blood burns too much air', { tag: 'warmBlooded' }),
      P(6, -0.15, 'Wings fail in thin air', { tag: 'flight' }),
      P(0, -0.15, 'Too big to breathe', { trait: { name: 'size', min: 6 } }),
    ],
    shock: { prey: 0.6 },
    oxygen: 0.5,
  },
  drought: {
    icon: '🏜️', look: 'greatDying',
    names: ['The Long Drought', 'The Dust Age'],
    warning: 'The rains fail, year after year. The {land} crack and blow away.',
    desc: 'The water cycle breaks down. Lakes shrink to salt and the land turns to dust.',
    pressures: [
      P(0, 0.12, 'The sea never dries', { habitat: 'aquatic' }),
      P(3, 0.2, 'Holds on to water', { tag: 'waterRetention' }),
      P(3, -0.15, 'Needs water to breathe', { tag: 'amphibian' }),
      P(5, 0.15, 'Sleeps out the drought in mud', { tag: 'aestivation' }),
      P(2, 0.1, 'Shelter underground', { tag: 'burrower' }),
      P(4, 0.08, 'Cold blood needs little water', { tag: 'coldBlooded' }),
      P(0, 0.1, 'Needs little food', { trait: { name: 'metabolism', max: 3 } }),
      P(4, -0.1, 'Ponds dry up', { tag: 'tadpoles' }),
    ],
    shock: { plants: 0.4, fruit: 0.3 },
    wetness: 0.4,
  },
};

// Base survival before traits, by era: lineages are tougher or frailer at different stages,
// so each era gets its own range to keep every extinction a real threat but none a wall.
const BASE = [[0.08, 0.16], [0.22, 0.34], [0.3, 0.42], [0.25, 0.38], [0.18, 0.3], [0.15, 0.28], [0.12, 0.25]];

/** One mass extinction for an era: a cause, its strongest counters and threats, and a base rate. */
function makeEvent(cause, era, words, name, rng) {
  const c = CAUSES[cause];
  const shuffled = shuffle(c.pressures.filter((p) => p.from <= era), rng);
  const helps = shuffled.filter((p) => p.mod.value > 0).slice(0, 2 + Math.floor(rng() * 2));
  const hurts = shuffled.filter((p) => p.mod.value < 0).slice(0, 1 + Math.floor(rng() * 2));
  return {
    name, icon: c.icon, cause,
    look: era < 3 && c.earlyLook ? c.earlyLook : c.look,
    warning: fill(c.warning, words),
    desc: fill(c.desc, words),
    base: Math.round((BASE[era][0] + rng() * (BASE[era][1] - BASE[era][0])) * 100) / 100,
    mods: [...helps, ...hurts].map((p) => p.mod),
    shock: { ...c.shock },
    ...(c.oxygen ? { oxygen: c.oxygen } : {}),
    ...(c.wetness ? { wetness: c.wetness } : {}),
  };
}

// Era ages, as fractions of the planet's age at the start (Earth's own rhythm).
const ERA_AGE = [1, 0.605, 0.142, 0.11, 0.095, 0.066, 0.017];

/** The planet's name and colors come first from its seed, so they never change with rerolls. */
function planetWords(seed) {
  const words = seededRandom(seed);
  const syllables = 2 + Math.floor(words() * 2);
  return { words, name: cap(Array.from({ length: syllables }, () => pick(SYLLABLES, words)).join('')) };
}

/** Just the name of the planet a seed makes (cheap, for previews). */
export const planetName = (seed) => planetWords(seed).name;

/** A planet, without the fairness check: name, words, eras and one extinction per era. */
export function generatePlanet(seed, attempt = 0) {
  const { words, name } = planetWords(seed);
  const sun = pick(SUNS, words), sea = pick(SEAS, words), land = pick(LANDS, words);
  const w = { planet: name, Planet: name, sun, Sun: cap(sun), sea, Sea: cap(sea), land };

  const rng = seededRandom(`${seed}#${attempt}`);
  const age = Math.round(3000 + rng() * 2400);
  const used = {};
  let last = null;
  const events = {};
  const eras = ERAS.map((earth, i) => {
    const [title, blurb] = pick(ERA_TEXTS[i], rng);
    const mya = Math.max(1, Math.round(age * ERA_AGE[i] * (0.9 + rng() * 0.2)));
    // No cause twice in a row, nor more than twice in all.
    const causes = Object.keys(CAUSES).filter((k) => k !== last && (used[k] ?? 0) < 2);
    const cause = pick(causes, rng);
    used[cause] = (used[cause] ?? 0) + 1;
    last = cause;
    const id = `alien${i}`;
    events[id] = makeEvent(cause, i, w, fill(CAUSES[cause].names[used[cause] - 1], w), rng);
    return { ...earth, name: fill(title, w), blurb: fill(blurb, w), mya, event: id };
  });
  // Each extinction strikes near the end of its era, just before the next one opens.
  eras.forEach((e, i) => {
    const next = eras[i + 1]?.mya ?? 0;
    events[e.event].mya = Math.max(0.5, Math.round((next + (e.mya - next) * 0.12) * 10) / 10);
  });
  return { seed, attempt, name, sun, sea, land, eras, events };
}

// ── Fairness ───────────────────────────────────────────────────────────────

/** Play one full game with random choices on a planet. */
export function playRandomGame(planet, rng) {
  const g = createGame({ rng, planet });
  for (;;) {
    const id = pick(forkFor(g).options, rng);
    applyChoice(g, id, 'fork');
    rivalFork(g, id);
    while (g.generation < GENERATIONS_PER_ERA) {
      simulateGeneration(g);
      if (g.status === 'extinct') return g;
      applyChoice(g, pick(minorOptions(g), rng), 'minor');
    }
    if (upcomingEvent(g) && !resolveEvent(g).survived) return g;
    if (!advanceEra(g)) return g;
  }
}

/** Share of random games that reach the present day on this planet. */
export function survivalRate(planet, games = 200) {
  const rng = seededRandom(`${planet.seed}#${planet.attempt}#play`);
  let survived = 0;
  for (let i = 0; i < games; i++) if (playRandomGame(planet, rng).status === 'survived') survived++;
  return survived / games;
}

// Random play reaches today in about a quarter of games on Earth: alien worlds stay near that.
export const FAIR_SURVIVAL = [0.15, 0.4];

/** A planet hard but beatable: rerolls its history (never its name) until random play lands in FAIR_SURVIVAL. */
export function alienPlanet(seed) {
  let best = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const planet = generatePlanet(seed, attempt);
    const rate = survivalRate(planet);
    if (rate >= FAIR_SURVIVAL[0] && rate <= FAIR_SURVIVAL[1]) return { ...planet, survivalRate: rate };
    const miss = Math.min(Math.abs(rate - FAIR_SURVIVAL[0]), Math.abs(rate - FAIR_SURVIVAL[1]));
    if (!best || miss < best.miss) best = { planet: { ...planet, survivalRate: rate }, miss };
  }
  return best.planet;
}
