// Static game content: eras, choices (forks, diets, minor mutations) and extinction events.

export const TRAIT_NAMES = {
  size: 'Size',
  speed: 'Speed',
  defense: 'Defense',
  metabolism: 'Metabolism',
  reproduction: 'Reproduction',
  adaptability: 'Adaptability',
};

export const START = {
  population: 2000,
  traits: { size: 1, speed: 2, defense: 1, metabolism: 3, reproduction: 6, adaptability: 3 },
  meters: { food: 60, water: 100, oxygen: 80 },
  tags: ['aquatic'],
};

export const MIN_VIABLE_POPULATION = 500;
export const GENERATIONS_PER_ERA = 2;

export const LINE_COLORS = { carnivore: 0xd9534f, omnivore: 0xe0a030, herbivore: 0x5cb85c };

// Food efficiency by diet specialization tier (generalist -> hyper-specialist).
export const TIER_EFFICIENCY = { 1: 0.85, 2: 1.0, 3: 1.2 };
export const OMNIVORE_EFFICIENCY = 0.75;

// ---------------------------------------------------------------------------
// Choices. `requires` fields: tags (all), anyTags, notTags, habitat, minEra,
// maxEra, line (diet lines allowed; omnivores may "lean" into other lines),
// trait {name: minValue}. `guaranteed` (same fields) always puts an eligible
// minor mutation among the offers while its conditions hold.
// ---------------------------------------------------------------------------

export const CHOICES = {
  // ── Era 1 fork: diet line ────────────────────────────────────────────────
  carnivore: {
    name: 'Carnivore', icon: '🥩',
    desc: 'Engulf other cells. Rich meals, but you live and die with your prey.',
    traits: { speed: 1, metabolism: 1 }, tags: ['carnivore'],
    diet: { line: 'carnivore', tier: 1, sources: { prey: 1 } },
  },
  omnivore: {
    name: 'Omnivore', icon: '🍽️',
    desc: 'Eat whatever drifts by. Rarely thriving, rarely starving.',
    traits: { adaptability: 2 }, tags: ['omnivore'],
    diet: { line: 'omnivore', tier: 1, sources: { plankton: 0.4, prey: 0.3, detritus: 0.3 } },
  },
  herbivore: {
    name: 'Herbivore', icon: '🌿',
    desc: 'Graze on sunlit algae mats. Plentiful food, until the light fails.',
    traits: { reproduction: 1, metabolism: -1 }, tags: ['herbivore'],
    diet: { line: 'herbivore', tier: 1, sources: { plants: 1 } },
  },

  // ── Major forks ──────────────────────────────────────────────────────────
  shell: {
    name: 'Shell', icon: '🐚', desc: 'Grow a hard mineral shell. Slow but safe.',
    traits: { defense: 3, speed: -1 }, tags: ['shell'],
  },
  speed: {
    name: 'Speed', icon: '⚡', desc: 'Develop a powerful tail. Outrun danger, chase down food.',
    traits: { speed: 3, metabolism: 1, defense: -1 }, tags: ['fast'],
  },
  exoskeleton: {
    name: 'Exoskeleton', icon: '🦐', desc: 'Armor on the outside. Jointed limbs, tough plates.',
    traits: { defense: 2, size: 1 }, tags: ['exoskeleton'],
  },
  spine: {
    name: 'Spine', icon: '🦴', desc: 'A flexible backbone. Room to grow big and fast.',
    traits: { size: 2, speed: 1, metabolism: 1 }, tags: ['spine'],
  },
  stayWater: {
    name: 'Stay in the Water', icon: '🌊', desc: 'The sea is home. Oxygen and water stay your concerns, not your enemies.',
    traits: { reproduction: 1 }, tags: [],
  },
  goLand: {
    name: 'Go to Land', icon: '🌍', desc: 'Crawl onto the empty shore. Untouched food, but water becomes precious.',
    traits: { adaptability: 2, metabolism: 1 }, tags: ['terrestrial'], removeTags: ['aquatic'],
  },
  deepSea: {
    name: 'Deep Sea', icon: '🌑', desc: 'Descend into the dark. Stable, cold, and sheltered from the surface.',
    traits: { metabolism: -1, speed: -1, adaptability: 1 }, tags: ['deepSea'],
  },
  reef: {
    name: 'Reef', icon: '🪸', desc: 'Settle the bright, crowded reefs. Abundant, but fragile.',
    traits: { reproduction: 2 }, tags: ['reef'],
  },
  coldBlooded: {
    name: 'Cold-blooded', icon: '🦎', desc: 'Let the sun warm you. Needs very little food.',
    traits: { metabolism: -2, speed: -1 }, tags: ['coldBlooded'],
  },
  warmBlooded: {
    name: 'Warm-blooded', icon: '🔥', desc: 'Burn food to stay warm. Active day and night, but always hungry.',
    traits: { metabolism: 2, speed: 2, adaptability: 1 }, tags: ['warmBlooded'],
  },
  bioluminescence: {
    name: 'Bioluminescence', icon: '✨', desc: 'Glow in the abyss to lure prey and confuse predators.',
    traits: { defense: 1, adaptability: 1 }, tags: ['bioluminescence'],
  },
  pressureArmor: {
    name: 'Pressure Armor', icon: '🛡️', desc: 'Dense plates that shrug off crushing depths.',
    traits: { defense: 3, size: 1, speed: -1 }, tags: ['pressureArmor'],
  },
  schooling: {
    name: 'Schooling', icon: '🐟', desc: 'Move as one great swirling mass.',
    traits: { defense: 2, reproduction: 1 }, tags: ['schooling'],
  },
  symbiosis: {
    name: 'Symbiosis', icon: '🤝', desc: 'Partner with other reef species for food and shelter.',
    traits: { adaptability: 2, metabolism: -1 }, tags: ['symbiosis'],
  },
  eggs: {
    name: 'Eggs', icon: '🥚', desc: 'Lay many hard-shelled eggs on land.',
    traits: { reproduction: 3 }, tags: ['eggs'],
  },
  liveBirth: {
    name: 'Live Birth', icon: '🍼', desc: 'Fewer young, carried safely inside.',
    traits: { reproduction: -1, adaptability: 2, defense: 1 }, tags: ['liveBirth'],
  },
  fur: {
    name: 'Fur', icon: '🧶', desc: 'A thick insulating coat.',
    traits: { defense: 1, adaptability: 1 }, tags: ['fur'],
  },
  feathers: {
    name: 'Feathers', icon: '🪶', desc: 'Light, warm, and maybe one day... flight.',
    traits: { speed: 1, adaptability: 1 }, tags: ['feathers'],
  },
  // Arthropods on land take these forks instead of the vertebrate ones.
  insectWings: {
    name: 'Wings', icon: '🪰', desc: 'Flaps of cuticle become the first wings on Earth. The sky is empty.',
    traits: { speed: 2, size: -1 }, tags: ['insect', 'flight'],
  },
  arachnid: {
    name: 'Eight Legs', icon: '🕷️', desc: 'Become an arachnid: venom, silk and patience.',
    traits: { defense: 2, metabolism: -1 }, tags: ['arachnid'],
  },
  metamorphosis: {
    name: 'Metamorphosis', icon: '🦋', desc: 'Larvae eat and grow, adults breed and spread. Two lives in one.',
    traits: { adaptability: 2, reproduction: 1 }, tags: ['metamorphosis'],
  },
  colony: {
    name: 'Colony', icon: '🐜', desc: 'Live in a nest of thousands, with a queen and workers who share every task.',
    traits: { defense: 2, reproduction: 2, adaptability: -1 }, tags: ['colony', 'social'],
  },
  silk: {
    name: 'Silk Webs', icon: '🕸️', desc: 'Spin traps that catch food while you wait.',
    traits: { metabolism: -1, adaptability: 2 }, tags: ['silk'],
  },
  trapdoor: {
    name: 'Trapdoor Burrow', icon: '🚪', desc: 'Line a burrow with silk and ambush whatever walks past.',
    traits: { defense: 2, speed: -1 }, tags: ['burrower'],
  },
  diapause: {
    name: 'Diapause', icon: '💤', desc: 'Pause your life as a frost-proof egg or pupa and sleep through the worst years.',
    traits: { adaptability: 2, metabolism: -1, speed: -1 }, tags: ['diapause'],
  },
  giant: {
    name: 'Giant', icon: '🐋', desc: 'Grow enormous. Nothing can eat you, but you eat a lot.',
    traits: { size: 5, metabolism: 2, defense: 2, reproduction: -2 }, tags: ['giant'],
  },
  swarm: {
    name: 'Swarm', icon: '🦠', desc: 'Stay small and become countless.',
    traits: { size: -1, reproduction: 4, defense: -1 }, tags: ['swarm'],
  },
  flight: {
    name: 'Flight', icon: '🦅', desc: 'Take to the skies.',
    traits: { speed: 3, size: -1 }, tags: ['flight'],
  },
  intelligence: {
    name: 'Intelligence', icon: '🧠', desc: 'A large brain. Solve problems instead of evolving around them.',
    traits: { adaptability: 4, reproduction: -1, metabolism: 1 }, tags: ['intelligence'],
  },

  // ── Diet specializations (minor) ─────────────────────────────────────────
  filterFeeder: {
    name: 'Filter Feeder', icon: '🫧', desc: 'Strain clouds of plankton from the water.',
    requires: { line: ['carnivore'], habitat: 'aquatic', minEra: 1 },
    diet: { line: 'carnivore', tier: 2, sources: { plankton: 1 } },
  },
  microHunter: {
    name: 'Micro-hunter', icon: '🎯', desc: 'Actively chase tiny animals.',
    requires: { line: ['carnivore'], habitat: 'aquatic', minEra: 1 }, traits: { speed: 1 },
    diet: { line: 'carnivore', tier: 2, sources: { prey: 1 } },
  },
  scavenger: {
    name: 'Scavenger', icon: '🦴', desc: 'Feed on the dead. Disasters are a feast.',
    requires: { line: ['omnivore'], minEra: 1 },
    diet: { line: 'omnivore', tier: 2, sources: { carrion: 1 } },
  },
  detritivore: {
    name: 'Detritivore', icon: '🍂', desc: 'Eat decaying matter from the seafloor.',
    requires: { line: ['omnivore'], minEra: 1 }, traits: { metabolism: -1 },
    diet: { line: 'omnivore', tier: 2, sources: { detritus: 1 } },
  },
  algaeGrazer: {
    name: 'Algae Grazer', icon: '🟢', desc: 'Specialize in scraping algae mats.',
    requires: { line: ['herbivore'], habitat: 'aquatic', minEra: 1 },
    diet: { line: 'herbivore', tier: 2, sources: { plants: 1 } },
  },
  piscivore: {
    name: 'Piscivore', icon: '🐟', desc: 'Hunt the new fish swimming the seas.',
    requires: { line: ['carnivore'], habitat: 'aquatic', minEra: 2 }, traits: { speed: 1 },
    diet: { line: 'carnivore', tier: 2, sources: { prey: 1 } },
  },
  molluscivore: {
    name: 'Molluscivore', icon: '🦪', desc: 'Crack open shelled creatures.',
    requires: { line: ['carnivore'], habitat: 'aquatic', minEra: 2 }, traits: { defense: 1 },
    diet: { line: 'carnivore', tier: 2, sources: { shellfish: 1 } },
  },
  forager: {
    name: 'Forager', icon: '🧺', desc: 'Pick through everything the sea floor offers.',
    requires: { line: ['omnivore'], minEra: 2 }, traits: { adaptability: 1 },
    diet: { line: 'omnivore', tier: 2, sources: { plants: 0.4, plankton: 0.3, detritus: 0.3, insects: 0.3 } },
  },
  kelpGrazer: {
    name: 'Kelp Grazer', icon: '🌱', desc: 'Feed on towering kelp forests.',
    requires: { line: ['herbivore'], habitat: 'aquatic', minEra: 2 }, traits: { size: 1 },
    diet: { line: 'herbivore', tier: 2, sources: { plants: 1 } },
  },
  insectivore: {
    name: 'Insectivore', icon: '🐜', desc: 'Snap up the insects swarming the land.',
    requires: { line: ['carnivore'], habitat: 'terrestrial', minEra: 3 },
    diet: { line: 'carnivore', tier: 2, sources: { insects: 1 } },
  },
  opportunist: {
    name: 'Opportunist', icon: '🎲', desc: 'Eat anything the land offers.',
    requires: { line: ['omnivore'], habitat: 'terrestrial', minEra: 3 }, traits: { adaptability: 1 },
    diet: { line: 'omnivore', tier: 2, sources: { plants: 0.3, insects: 0.3, carrion: 0.2, seeds: 0.2 } },
  },
  grazer: {
    name: 'Grazer', icon: '🌾', desc: 'Crop the low green plants carpeting the land.',
    requires: { line: ['herbivore'], habitat: 'terrestrial', minEra: 3 },
    diet: { line: 'herbivore', tier: 2, sources: { plants: 1 } },
  },
  deepAmbusher: {
    name: 'Deep Ambusher', icon: '🪤', desc: 'Lie motionless in the dark, then strike.',
    requires: { line: ['carnivore'], tags: ['deepSea'], anyTags: ['piscivore', 'microHunter'], minEra: 4 },
    traits: { metabolism: -1 },
    diet: { line: 'carnivore', tier: 3, sources: { prey: 1 } },
  },
  ventDetritivore: {
    name: 'Vent Detritivore', icon: '♨️', desc: 'Feed on the chemical gardens around volcanic vents.',
    requires: { line: ['omnivore'], tags: ['deepSea'], minEra: 4 },
    diet: { line: 'omnivore', tier: 2, sources: { detritus: 1 } },
  },
  reefGrazer: {
    name: 'Reef Grazer', icon: '🐠', desc: 'Pluck algae from the bright reef.',
    requires: { line: ['herbivore'], tags: ['reef'], minEra: 4 },
    diet: { line: 'herbivore', tier: 3, sources: { plants: 1 } },
  },
  hypercarnivore: {
    name: 'Hypercarnivore', icon: '🦖', desc: 'Nothing but meat, and plenty of it.',
    requires: { line: ['carnivore'], habitat: 'terrestrial', minEra: 4 }, traits: { size: 2 },
    diet: { line: 'carnivore', tier: 3, sources: { prey: 1 } },
  },
  burrowingForager: {
    name: 'Burrowing Forager', icon: '🕳️', desc: 'Dig for roots, grubs and seeds.',
    requires: { line: ['omnivore'], habitat: 'terrestrial', minEra: 4 }, tags: ['burrower'],
    diet: { line: 'omnivore', tier: 2, sources: { insects: 0.4, seeds: 0.3, plants: 0.3 } },
  },
  browser: {
    name: 'Browser', icon: '🌳', desc: 'Reach up and strip leaves from tall plants.',
    requires: { line: ['herbivore'], habitat: 'terrestrial', minEra: 4 }, traits: { size: 1 },
    diet: { line: 'herbivore', tier: 2, sources: { plants: 1 } },
  },
  granivore: {
    name: 'Granivore', icon: '🌰', desc: 'Crack hard, long-lasting seeds.',
    requires: { line: ['herbivore'], habitat: 'terrestrial', minEra: 4 },
    diet: { line: 'herbivore', tier: 2, sources: { seeds: 1 } },
  },
  sanguivore: {
    name: 'Sanguivore', icon: '🩸', desc: 'Drink the blood of larger animals.',
    requires: { line: ['carnivore'], minEra: 5 }, traits: { size: -1 },
    diet: { line: 'carnivore', tier: 3, sources: { prey: 1 } },
  },
  shellCrusher: {
    name: 'Shell-crusher', icon: '🔨', desc: 'Jaws strong enough for any shell.',
    requires: { line: ['carnivore'], habitat: 'aquatic', minEra: 5 }, traits: { defense: 1 },
    diet: { line: 'carnivore', tier: 3, sources: { shellfish: 1 } },
  },
  cleaner: {
    name: 'Cleaner', icon: '🧽', desc: 'Groom parasites off larger fish, safely.',
    requires: { line: ['omnivore'], tags: ['reef'], minEra: 5 }, traits: { defense: 1 },
    diet: { line: 'omnivore', tier: 2, sources: { prey: 0.4, detritus: 0.6 } },
  },
  coralGrazer: {
    name: 'Coral Grazer', icon: '🪸', desc: 'Bite through living coral.',
    requires: { line: ['herbivore'], tags: ['reef'], minEra: 5 },
    diet: { line: 'herbivore', tier: 3, sources: { plants: 1 } },
  },
  packHunter: {
    name: 'Pack Hunter', icon: '🐺', desc: 'Hunt together to bring down big prey.',
    requires: { line: ['carnivore'], habitat: 'terrestrial', minEra: 5 }, traits: { defense: 1 }, tags: ['social'],
    diet: { line: 'carnivore', tier: 2, sources: { prey: 1 } },
  },
  frugivore: {
    name: 'Frugivore', icon: '🍎', desc: 'Feast on the first sweet fruits.',
    requires: { line: ['herbivore'], habitat: 'terrestrial', minEra: 5 },
    diet: { line: 'herbivore', tier: 3, sources: { fruit: 1 } },
  },
  baleenGiant: {
    name: 'Baleen Giant', icon: '🐳', desc: 'Swallow whole clouds of plankton.',
    requires: { line: ['carnivore'], tags: ['filterFeeder', 'giant'], minEra: 6 },
    diet: { line: 'carnivore', tier: 3, sources: { plankton: 1 } },
  },
  abyssalScavenger: {
    name: 'Abyssal Scavenger', icon: '🦑', desc: 'Wait for whale-falls in the deep.',
    requires: { line: ['omnivore'], tags: ['deepSea'], minEra: 6 },
    diet: { line: 'omnivore', tier: 2, sources: { carrion: 0.6, detritus: 0.4 } },
  },
  kelpLeviathan: {
    name: 'Kelp Leviathan', icon: '🌊', desc: 'A gentle giant mowing the kelp forests.',
    requires: { line: ['herbivore'], tags: ['giant'], minEra: 6 },
    diet: { line: 'herbivore', tier: 3, sources: { plants: 1 } },
  },
  apexPredator: {
    name: 'Apex Predator', icon: '👑', desc: 'Top of the food chain.',
    requires: { line: ['carnivore'], habitat: 'terrestrial', minEra: 6 }, traits: { size: 2 },
    diet: { line: 'carnivore', tier: 3, sources: { prey: 1 } },
  },
  aerialHunter: {
    name: 'Aerial Hunter', icon: '🦉', desc: 'Strike from the sky.',
    requires: { line: ['carnivore'], tags: ['flight'], minEra: 6 },
    diet: { line: 'carnivore', tier: 3, sources: { prey: 0.6, insects: 0.4 } },
  },
  toolUser: {
    name: 'Tool-user', icon: '🪨', desc: 'Use sticks and stones to reach any food.',
    requires: { line: ['omnivore'], tags: ['intelligence'], minEra: 6 }, traits: { adaptability: 2 },
    diet: { line: 'omnivore', tier: 2, sources: { plants: 0.3, prey: 0.3, seeds: 0.2, fruit: 0.2 } },
  },
  nectarivore: {
    name: 'Nectarivore', icon: '🌸', desc: 'Hover from flower to flower.',
    requires: { line: ['herbivore'], tags: ['flight'], minEra: 6 },
    diet: { line: 'herbivore', tier: 3, sources: { nectar: 1 } },
  },

  // ── General minor mutations ──────────────────────────────────────────────
  aerobic: {
    name: 'Aerobic Respiration', icon: '💨', desc: 'Burn oxygen for energy instead of being poisoned by it.',
    requires: { maxEra: 1 }, guaranteed: { maxEra: 0 }, traits: { metabolism: 1, adaptability: 1 }, tags: ['aerobic'],
  },
  largerBody: {
    name: 'Larger Body', icon: '⬆️', desc: 'Grow bigger. Harder to eat, needs more food.',
    traits: { size: 1, metabolism: 1, defense: 1 },
  },
  smallerBody: {
    name: 'Smaller Body', icon: '⬇️', desc: 'Shrink down. Less food, more offspring.',
    requires: { trait: { size: 2 } }, traits: { size: -1, metabolism: -1, reproduction: 1 },
  },
  camouflage: {
    name: 'Camouflage', icon: '🎨', desc: 'Blend into your surroundings.',
    traits: { defense: 2 }, tags: ['camouflage'],
  },
  fastBreeding: {
    name: 'Fast Breeding', icon: '🐣', desc: 'Many young, little care.',
    traits: { reproduction: 2, adaptability: -1 },
  },
  efficientMetabolism: {
    name: 'Efficient Metabolism', icon: '🔋', desc: 'Squeeze more energy from every meal.',
    traits: { metabolism: -2, speed: -1 },
  },
  coldTolerance: {
    name: 'Cold Tolerance', icon: '❄️', desc: 'Antifreeze proteins keep you moving in icy water.',
    traits: { metabolism: 1 }, tags: ['coldTolerant'],
  },
  burrowing: {
    name: 'Burrowing', icon: '⛏️', desc: 'Dig into sediment to hide from danger.',
    requires: { minEra: 2, notTags: ['flight'] }, traits: { speed: -1 }, tags: ['burrower'],
  },
  betterGills: {
    name: 'Better Gills', icon: '🫁', desc: 'Pull oxygen from even stale water.',
    requires: { habitat: 'aquatic', minEra: 1 }, traits: { adaptability: 1 }, tags: ['gills'],
  },
  waterRetention: {
    name: 'Water Retention', icon: '💧', desc: 'Waxy skin that keeps moisture in.',
    requires: { habitat: 'terrestrial' }, traits: { defense: 1 }, tags: ['waterRetention'],
  },
  spikes: {
    name: 'Spikes', icon: '🌵', desc: 'Sharp spines on your back.',
    requires: { minEra: 1 }, traits: { defense: 2, speed: -1 }, tags: ['spikes'],
  },
  venom: {
    name: 'Venom', icon: '☠️', desc: 'A toxic bite or sting.',
    requires: { minEra: 2, line: ['carnivore'] }, traits: { defense: 1, speed: 1 }, tags: ['venom'],
  },
  keenEyes: {
    name: 'Keen Eyes', icon: '👁️', desc: 'See food and danger from afar.',
    requires: { minEra: 1 }, traits: { speed: 1, adaptability: 1 }, tags: ['keenEyes'],
  },
  generalistGut: {
    name: 'Generalist Gut', icon: '🧪', desc: 'Digest a little of everything.',
    traits: { adaptability: 2 },
  },
  socialBehavior: {
    name: 'Social Behavior', icon: '👥', desc: 'Live in groups that protect the young.',
    requires: { minEra: 3 }, traits: { reproduction: 1, defense: 1 }, tags: ['social'],
  },
  thickHide: {
    name: 'Thick Hide', icon: '🧱', desc: 'Leathery skin against claws and cold.',
    requires: { habitat: 'terrestrial', minEra: 4, notTags: ['exoskeleton'] }, traits: { defense: 2, metabolism: 1 },
  },
};

// ---------------------------------------------------------------------------
// Eras. Each era: one major fork (first fork whose `requires` matches),
// GENERATIONS_PER_ERA minor mutations, then an optional extinction event.
// ---------------------------------------------------------------------------

export const ERAS = [
  {
    name: 'Primordial Seas', mya: 3800,
    blurb: 'A warm, murky ocean. Life is a single fragile cell.',
    forks: [{ options: ['carnivore', 'omnivore', 'herbivore'], title: 'How will you feed?' }],
    event: 'greatOxidation',
  },
  {
    name: 'The Bloom', mya: 2300,
    blurb: 'Cells band together. Life grows bodies, and with bodies come predators.',
    forks: [{ options: ['shell', 'speed'], title: 'Defend or flee?' }],
    event: 'snowball',
  },
  {
    name: 'Body Plans', mya: 540,
    blurb: 'An explosion of shapes fills the seas. What will your body be built on?',
    forks: [{ options: ['exoskeleton', 'spine'], title: 'Choose a body plan' }],
    event: null,
  },
  {
    name: 'The Shoreline', mya: 420,
    blurb: 'Green life creeps onto bare rock. The land is empty and waiting.',
    forks: [{ options: ['stayWater', 'goLand'], title: 'Stay or go?' }],
    event: 'oceanAnoxia',
  },
  {
    name: 'Radiation', mya: 360,
    blurb: 'Life spreads into every corner it can reach.',
    forks: [
      { requires: { habitat: 'aquatic' }, options: ['deepSea', 'reef'], title: 'Where in the sea?' },
      { requires: { habitat: 'terrestrial', tags: ['exoskeleton'] }, options: ['insectWings', 'arachnid'], title: 'Six legs or eight?' },
      { requires: { habitat: 'terrestrial' }, options: ['coldBlooded', 'warmBlooded'], title: 'How will you stay warm?' },
    ],
    event: 'greatDying',
  },
  {
    name: 'Dominion', mya: 250,
    blurb: 'The survivors inherit a reshaped world.',
    forks: [
      { requires: { tags: ['deepSea'] }, options: ['bioluminescence', 'pressureArmor'], title: 'Master the abyss' },
      { requires: { tags: ['reef'] }, options: ['schooling', 'symbiosis'], title: 'Life on the reef' },
      { requires: { tags: ['insect'] }, options: ['metamorphosis', 'colony'], title: 'How will you raise your young?' },
      { requires: { tags: ['arachnid'] }, options: ['silk', 'trapdoor'], title: 'How will you catch your food?' },
      { requires: { tags: ['coldBlooded'] }, options: ['eggs', 'liveBirth'], title: 'How will you reproduce?' },
      { requires: { tags: ['warmBlooded'] }, options: ['fur', 'feathers'], title: 'What will keep you warm?' },
    ],
    event: 'meteor',
  },
  {
    name: 'Apex', mya: 65,
    blurb: 'An age of giants and minds. The final test approaches.',
    forks: [
      { requires: { habitat: 'aquatic' }, options: ['giant', 'swarm'], title: 'Final form' },
      { requires: { habitat: 'terrestrial', tags: ['exoskeleton'] }, options: ['swarm', 'diapause'], title: 'Final form' },
      { requires: { habitat: 'terrestrial' }, options: ['flight', 'intelligence'], title: 'Final form' },
    ],
    event: 'iceAge',
  },
];

export const PRESENT_DAY_MYA = 0;

// ---------------------------------------------------------------------------
// Extinction events. Survival = base + matching modifiers, scaled by how well-fed
// the population is. `shock` multiplies food sources (they recover over time).
// Modifier conditions: tag, habitat, line, trait {name, min|max}.
// ---------------------------------------------------------------------------

export const EVENTS = {
  greatOxidation: {
    name: 'The Great Oxidation', icon: '🫧', mya: 2400,
    warning: 'Blue-green microbes are flooding the seas with a corrosive new gas: oxygen.',
    desc: 'Oxygen poisons the oceans. Life that cannot breathe it suffocates in it.',
    base: 0.2,
    mods: [
      { tag: 'aerobic', value: 0.4, label: 'Aerobic respiration' },
      { line: 'herbivore', value: 0.1, label: 'Photosynthetic ancestry' },
      { line: 'carnivore', value: -0.05, label: 'Prey populations crash' },
    ],
    shock: { prey: 0.5, plankton: 0.7 },
  },
  snowball: {
    name: 'Snowball Earth', icon: '❄️', mya: 650,
    warning: 'Glaciers are creeping toward the equator. The seas grow colder every generation.',
    desc: 'Ice seals the oceans from pole to pole. Sunlight barely reaches the water.',
    base: 0.22,
    mods: [
      { tag: 'coldTolerant', value: 0.3, label: 'Cold tolerance' },
      { trait: { name: 'size', max: 2 }, value: 0.1, label: 'Small body' },
      { tag: 'filterFeeder', value: 0.1, label: 'Filter feeding under the ice' },
      { tag: 'detritivore', value: 0.15, label: 'Eats the dead' },
      { tag: 'scavenger', value: 0.08, label: 'Eats the dead' },
      { tag: 'algaeGrazer', value: -0.15, label: 'Algae need sunlight' },
      { line: 'herbivore', value: -0.05, label: 'Sunlight fades' },
      { tag: 'burrower', value: 0.08, label: 'Shelter in sediment' },
    ],
    shock: { plants: 0.3, plankton: 0.5 },
  },
  oceanAnoxia: {
    name: 'Ocean Anoxia', icon: '🌫️', mya: 372,
    warning: 'Purple bacterial blooms stain the shallows. The water smells of rot.',
    desc: 'The oceans suffocate. Oxygen drains from the water, layer by layer.',
    base: 0.2,
    mods: [
      { habitat: 'terrestrial', value: 0.55, label: 'Escaped to land' },
      { tag: 'gills', value: 0.25, label: 'Better gills' },
      { habitat: 'aquatic', trait: { name: 'size', max: 3 }, value: 0.08, label: 'Small body, low oxygen need' },
      { tag: 'piscivore', value: -0.1, label: 'Fish die off' },
      { tag: 'molluscivore', value: -0.1, label: 'Shellfish die off' },
      { tag: 'detritivore', value: 0.1, label: 'Feeds on the dead' },
    ],
    shock: { prey: 0.5, shellfish: 0.4 },
    oxygen: 0.35,
  },
  greatDying: {
    name: 'The Great Dying', icon: '🌋', mya: 252,
    warning: 'The ground trembles. Distant volcanoes darken the sky and the air tastes of sulfur.',
    desc: 'Supervolcanoes poison the air and acidify the seas. Nine in ten species perish.',
    base: 0.18,
    mods: [
      { tag: 'shell', habitat: 'aquatic', value: -0.15, label: 'Shells dissolve in acid seas' },
      { tag: 'reef', value: -0.15, label: 'Reefs collapse' },
      { tag: 'burrower', value: 0.2, label: 'Shelter underground' },
      { trait: { name: 'metabolism', max: 3 }, value: 0.15, label: 'Low metabolism' },
      { tag: 'scavenger', value: 0.15, label: 'Feast on the dead' },
      { tag: 'detritivore', value: 0.12, label: 'Feast on the dead' },
      { tag: 'ventDetritivore', value: 0.2, label: 'Vents are unaffected' },
      { tag: 'deepSea', value: 0.15, label: 'The deep is buffered' },
      { tag: 'browser', value: -0.1, label: 'Forests burn' },
      { tag: 'warmBlooded', value: -0.05, label: 'Heat stress' },
      { tag: 'coldBlooded', value: 0.05, label: 'Tolerates heat' },
      { tag: 'insect', value: -0.08, label: 'The only mass extinction of insects' },
    ],
    shock: { plants: 0.4, prey: 0.5, shellfish: 0.2, carrion: 1.8 },
    oxygen: 0.6, wetness: 0.5,
  },
  meteor: {
    name: 'Meteor Impact', icon: '☄️', mya: 66,
    warning: 'A new star burns brighter every night. Animals are restless.',
    desc: 'A mountain of rock strikes the Earth. Fire, then years of darkness.',
    base: 0.12,
    mods: [
      { trait: { name: 'size', min: 6 }, value: -0.25, label: 'Too big to hide or feed' },
      { trait: { name: 'size', max: 3 }, value: 0.15, label: 'Small body' },
      { tag: 'burrower', value: 0.15, label: 'Shelter underground' },
      { tag: 'deepSea', value: 0.25, label: 'The deep barely notices' },
      { tag: 'hypercarnivore', value: -0.2, label: 'Big prey vanishes' },
      { tag: 'apexPredator', value: -0.2, label: 'Big prey vanishes' },
      { tag: 'browser', value: -0.15, label: 'Plants die in the dark' },
      { tag: 'frugivore', value: -0.2, label: 'No more fruit' },
      { tag: 'granivore', value: 0.25, label: 'Seeds wait out the dark' },
      { tag: 'scavenger', value: 0.2, label: 'Endless carrion' },
      { tag: 'detritivore', value: 0.2, label: 'Endless decay' },
      { tag: 'insectivore', value: 0.1, label: 'Insects endure' },
      { tag: 'ventDetritivore', value: 0.2, label: 'Vents are unaffected' },
      { tag: 'metamorphosis', value: 0.08, label: 'Pupae wait out the dark' },
      { tag: 'colony', value: 0.05, label: 'Food stored in the nest' },
      { tag: 'silk', value: 0.05, label: 'Webs catch whatever still moves' },
    ],
    shock: { plants: 0.15, fruit: 0.05, nectar: 0.05, prey: 0.4, carrion: 2.0, insects: 0.7, plankton: 0.5 },
  },
  iceAge: {
    name: 'The Ice Age', icon: '🧊', mya: 2.6,
    warning: 'Winters stretch longer each generation. Ice sheets spread from the poles.',
    desc: 'Glaciers grind across the continents. Only the hardy endure.',
    base: 0.14,
    mods: [
      { tag: 'fur', value: 0.25, label: 'Thick fur' },
      { tag: 'feathers', value: 0.2, label: 'Insulating feathers' },
      { tag: 'warmBlooded', value: 0.15, label: 'Warm-blooded' },
      { tag: 'coldBlooded', habitat: 'terrestrial', value: -0.2, label: 'Too cold to move' },
      { tag: 'coldTolerant', value: 0.2, label: 'Cold tolerance' },
      { tag: 'deepSea', value: 0.2, label: 'The deep stays stable' },
      { tag: 'nectarivore', value: -0.25, label: 'Flowers vanish' },
      { tag: 'frugivore', value: -0.2, label: 'Fruit vanishes' },
      { tag: 'grazer', value: -0.1, label: 'Grass under snow' },
      { tag: 'scavenger', value: 0.1, label: 'Frozen carcasses' },
      { tag: 'filterFeeder', value: 0.1, label: 'Cold seas teem with plankton' },
      { tag: 'intelligence', value: 0.15, label: 'Finds shelter and fire' },
      { tag: 'liveBirth', value: 0.05, label: 'Young kept warm' },
      { tag: 'exoskeleton', habitat: 'terrestrial', value: -0.2, label: 'Cold-blooded in the cold' },
      { tag: 'diapause', value: 0.12, label: 'Sleeps through the winters' },
      { tag: 'colony', value: 0.05, label: 'The colony huddles for warmth' },
    ],
    shock: { plants: 0.4, fruit: 0.2, nectar: 0.1 },
    wetness: 0.6,
  },
};
