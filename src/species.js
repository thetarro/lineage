// The species sharing the world with the player and where they live: plain data, no
// rendering, so it also loads in Node. Their 3D models are built in fauna.js.

// ── Species: name, fact, behavior ───────────────────────────────────────
// kind: drifter | swimmer | crawler (seafloor) | walker | flyer | plant
// size scales the model; speed is m/s; reach widens the "you meet it" radius.
// predator: may hunt the player.

export const SPECIES = {
  bacterium: { name: 'Archaea & bacteria', kind: 'drifter', fact: "Earth's first life, thriving without oxygen." },
  cyanobacteria: { name: 'Cyanobacteria', kind: 'drifter', fact: 'Microbes that photosynthesize, slowly filling the air with oxygen.' },
  stromatolite: { name: 'Stromatolites', kind: 'plant', fact: 'Layered mounds built by microbial mats. A few still grow today in Shark Bay, Australia.' },
  dickinsonia: { name: 'Dickinsonia', kind: 'crawler', speed: 0.1, size: 1.4, fact: 'A flat, ribbed Ediacaran animal up to 1.4 m long, one of the first large animals.' },
  charnia: { name: 'Charnia', kind: 'plant', sway: true, fact: 'A frond anchored to the seafloor. Despite looking like a plant, it was probably an animal.' },
  jellyfish: { name: 'Medusoids', kind: 'drifter', fact: 'Early jellyfish-like drifters, among the oldest animals.' },
  sponge: { name: 'Sponges', kind: 'plant', fact: 'Simple filter-feeding animals with no organs, among the earliest animal lineages.' },
  trilobite: { name: 'Trilobites', kind: 'crawler', speed: 0.4, fact: 'Armored arthropods with crystal eyes. Over 20,000 species lived for 270 million years.' },
  anomalocaris: { name: 'Anomalocaris', kind: 'swimmer', predator: true, speed: 1.6, size: 1.2, reach: 1.5, fact: 'A Cambrian apex predator that grabbed prey with spiny frontal limbs.' },
  opabinia: { name: 'Opabinia', kind: 'swimmer', speed: 0.8, fact: 'Five eyes and a grasping nozzle. It made scientists laugh when first presented.' },
  hallucigenia: { name: 'Hallucigenia', kind: 'crawler', speed: 0.15, fact: 'A spiny worm so strange it was first reconstructed upside down.' },
  pikaia: { name: 'Pikaia', kind: 'swimmer', speed: 1, fact: 'A tiny swimmer with a notochord, a distant relative of every vertebrate.' },
  eurypterid: { name: 'Sea scorpions', kind: 'crawler', predator: true, speed: 0.5, size: 1.4, fact: 'Eurypterids; some grew over 2.5 m long, the largest arthropods ever.' },
  orthocone: { name: 'Orthocone nautiloids', kind: 'swimmer', predator: true, speed: 0.9, size: 1.2, reach: 1.5, fact: 'Squid-like hunters in straight shells up to 6 m long.' },
  dunkleosteus: { name: 'Dunkleosteus', kind: 'swimmer', predator: true, speed: 1.4, size: 1.5, reach: 3, fact: 'A giant armored fish with self-sharpening bony jaw blades.' },
  ostracoderm: { name: 'Ostracoderms', kind: 'swimmer', speed: 0.8, fact: 'Jawless armored fish, early experiments in having a backbone.' },
  crinoid: { name: 'Crinoids', kind: 'plant', sway: true, fact: 'Sea lilies: relatives of starfish that filter food from atop long stalks.' },
  cooksonia: { name: 'Cooksonia', kind: 'plant', fact: 'A few centimeters tall, one of the very first plants on land.' },
  moss: { name: 'Mosses & liverworts', kind: 'plant', fact: 'Low green carpets that first softened the bare rock.' },
  millipede: { name: 'Early millipedes', kind: 'walker', speed: 0.3, size: 1.3, fact: 'Among the first animals to walk on land.' },
  stethacanthus: { name: 'Stethacanthus', kind: 'swimmer', predator: true, speed: 1.8, size: 1.2, reach: 1.5, fact: 'An early shark with a strange anvil-shaped crest on its back.' },
  ammonite: { name: 'Ammonites', kind: 'swimmer', speed: 0.6, fact: 'Coiled-shell relatives of squid that thrived for 340 million years.' },
  coelacanth: { name: 'Coelacanths', kind: 'swimmer', speed: 0.8, size: 1.3, fact: 'Lobe-finned fish thought extinct until one was caught alive in 1938.' },
  lepidodendron: { name: 'Lepidodendron', kind: 'plant', reach: 2, fact: 'Scale trees up to 40 m tall. Their remains became much of the coal we burn today.' },
  calamites: { name: 'Calamites', kind: 'plant', fact: 'Giant horsetails, tree-sized relatives of the small horsetails alive today.' },
  treeFern: { name: 'Tree ferns', kind: 'plant', fact: 'Ferns with trunks, the understory of the coal swamps.' },
  arthropleura: { name: 'Arthropleura', kind: 'walker', speed: 0.4, size: 1.2, reach: 1.5, fact: 'A millipede 2.5 m long, the largest land invertebrate ever.' },
  eryops: { name: 'Eryops', kind: 'walker', speed: 0.5, size: 1.2, fact: 'A 2 m amphibian that hunted fish in the swamps.' },
  ichthyosaur: { name: 'Ichthyosaurs', kind: 'swimmer', predator: true, speed: 2.2, size: 1.3, reach: 2, fact: 'Dolphin-shaped marine reptiles with the largest eyes of any animal.' },
  plesiosaur: { name: 'Plesiosaurs', kind: 'swimmer', predator: true, speed: 1.2, size: 1.3, reach: 2.5, fact: 'Long-necked marine reptiles that "flew" through water with four flippers.' },
  sauropod: { name: 'Sauropods', kind: 'walker', speed: 0.7, size: 1.4, reach: 5, fact: 'The largest animals ever to walk the Earth, some over 30 m long.' },
  theropod: { name: 'Tyrannosaurus', kind: 'walker', predator: true, speed: 1.4, size: 1.3, reach: 3, fact: 'A 12 m predator with one of the strongest bites of any land animal.' },
  triceratops: { name: 'Triceratops', kind: 'walker', speed: 0.6, size: 1.2, reach: 3, fact: 'A three-horned plant-eater with a bony neck frill.' },
  pachycephalosaurus: { name: 'Pachycephalosaurus', kind: 'walker', speed: 0.8, size: 1.2, reach: 2.5, fact: 'A two-legged plant-eater with a domed skull up to 25 cm thick, possibly used to butt rivals.' },
  cycad: { name: 'Cycads', kind: 'plant', fact: 'Palm-like seed plants, a staple food of plant-eating dinosaurs.' },
  conifer: { name: 'Conifers', kind: 'plant', sway: true, fact: 'Cone-bearing trees that dominated Mesozoic forests.' },
  fern: { name: 'Ferns', kind: 'plant', fact: 'Ancient spore-bearing plants carpeting the forest floor.' },
  flower: { name: 'Flowering plants', kind: 'plant', fact: 'They appeared in the Cretaceous and rapidly took over the land.' },
  seaweed: { name: 'Algae & seaweed', kind: 'plant', sway: true, shallow: true, fact: 'Marine algae swaying in the sunlit shallows.' },
  kelp: { name: 'Kelp', kind: 'plant', shallow: true, fact: 'Giant brown algae forming underwater forests. It evolved only ~30 million years ago.' },
  whale: { name: 'Whales', kind: 'swimmer', speed: 1.5, size: 1.4, reach: 5, fact: 'Mammals whose ancestors walked on land before returning to the sea.' },
  megalodon: { name: 'Megalodon', kind: 'swimmer', predator: true, speed: 2, size: 3, reach: 4, fact: 'An 18 m shark, the largest predatory fish that ever lived.' },
  fish: { name: 'Ray-finned fish', kind: 'swimmer', speed: 1.4, fact: 'The most diverse group of vertebrates alive today.' },
  mammoth: { name: 'Woolly mammoths', kind: 'walker', speed: 0.7, size: 1.2, reach: 3.5, fact: 'Shaggy elephants of the Ice Age steppes.' },
  sabertooth: { name: 'Smilodon', kind: 'walker', predator: true, speed: 1.3, size: 1.2, fact: 'The saber-toothed cat, with fangs 28 cm long.' },
  bird: { name: 'Birds', kind: 'flyer', speed: 3, fact: 'The dinosaurs that survived the meteor.' },
  deer: { name: 'Deer', kind: 'walker', speed: 1, fact: 'Grazers that spread across the new grasslands.' },
  grass: { name: 'Grasses', kind: 'plant', fact: 'They spread only ~20 million years ago, transforming whole continents.' },
  broadleaf: { name: 'Broadleaf trees', kind: 'plant', sway: true, reach: 1.5, fact: 'Flowering trees that came to dominate forests.' },

  // Primordial microbes
  methanogen: { name: 'Methanogens', kind: 'drifter', size: 1.3, fact: 'Archaea that breathe out methane. Their gas may have kept the young Earth warm under a fainter Sun.' },
  purpleBacteria: { name: 'Purple sulfur bacteria', kind: 'drifter', size: 1.2, fact: 'They photosynthesize with hydrogen sulfide instead of water, so they make sulfur rather than oxygen.' },
  spirochete: { name: 'Spirochetes', kind: 'drifter', size: 1.2, fact: 'Corkscrew-shaped bacteria that swim by twisting their whole body.' },
  phage: { name: 'Bacteriophages', kind: 'drifter', size: 1.4, fact: 'Viruses that infect bacteria. Today they are the most numerous biological entities on Earth.' },
  ironBacteria: { name: 'Iron bacteria', kind: 'drifter', fact: 'Microbes that turn dissolved iron into rust. They helped lay down the banded iron formations mined today.' },
  // Proterozoic and Ediacaran
  acritarch: { name: 'Acritarchs', kind: 'drifter', size: 1.3, fact: 'Spiky microscopic cysts, mostly of early algae, that drifted through the Proterozoic seas.' },
  spriggina: { name: 'Spriggina', kind: 'crawler', speed: 0.25, size: 1.3, fact: 'A segmented Ediacaran animal with a crescent-shaped head. What it was related to is still debated.' },
  kimberella: { name: 'Kimberella', kind: 'crawler', speed: 0.1, size: 1.3, fact: 'A slug-like animal that scraped microbial mats, leaving fan-shaped scratch marks still visible in the rock.' },
  parvancorina: { name: 'Parvancorina', kind: 'crawler', speed: 0.15, size: 1.3, fact: 'A small shield with an anchor-shaped ridge. Fossils show it lined up facing the ocean currents.' },
  ikaria: { name: 'Ikaria', kind: 'crawler', speed: 0.08, size: 1.8, fact: 'A worm the size of a grain of rice, possibly an ancestor of every animal with a front, back, left and right.' },
  // Cambrian
  wiwaxia: { name: 'Wiwaxia', kind: 'crawler', speed: 0.15, size: 1.2, fact: 'A slug-like grazer armored with overlapping scales and two rows of tall spines.' },
  marrella: { name: 'Marrella', kind: 'swimmer', speed: 0.9, fact: 'The "lace crab", the most common animal in the Burgess Shale, with sweeping spines on its head.' },
  haikouichthys: { name: 'Haikouichthys', kind: 'swimmer', speed: 1.2, fact: 'One of the earliest known fish: no jaws, no scales, just a few centimeters long.' },
  // Silurian and Devonian
  cladoselache: { name: 'Cladoselache', kind: 'swimmer', predator: true, speed: 1.9, size: 1.1, reach: 1.5, fact: 'One of the oldest sharks, a 2 m hunter whose fossils still hold its last meals.' },
  acanthodian: { name: 'Acanthodians', kind: 'swimmer', speed: 1.1, fact: 'The "spiny sharks": small fish with a sharp spine before every fin, among the first with jaws.' },
  brittleStar: { name: 'Brittle stars', kind: 'crawler', speed: 0.2, size: 1.2, fact: 'Starfish relatives that crawl on five snaking arms, an ancient design still common on seafloors today.' },
  trigonotarbid: { name: 'Trigonotarbids', kind: 'walker', speed: 0.3, size: 1.4, fact: 'Spider-like arachnids that could not spin silk, among the first predators on land.' },
  scorpion: { name: 'Early scorpions', kind: 'walker', speed: 0.35, size: 1.3, fact: 'Scorpions crept out of the water onto land early on. Their body plan has barely changed since.' },
  springtail: { name: 'Springtails', kind: 'walker', speed: 0.4, size: 1.5, fact: 'Tiny six-legged soil animals that fling themselves away with a spring under their belly. Fossils date back 400 million years.' },
  centipede: { name: 'Early centipedes', kind: 'walker', speed: 0.5, size: 1.3, fact: 'Venomous hunters already stalking the first land plants over 400 million years ago.' },
  tiktaalik: { name: 'Tiktaalik', kind: 'crawler', speed: 0.2, size: 1.2, fact: 'A "fishapod" with a neck and sturdy fins to prop itself up in the shallows: half fish, half tetrapod.' },
  ichthyostega: { name: 'Ichthyostega', kind: 'walker', speed: 0.3, size: 1.2, reach: 1.5, fact: 'One of the first four-legged vertebrates, with seven toes on each hind foot.' },
  // Carboniferous and Permian
  helicoprion: { name: 'Helicoprion', kind: 'swimmer', predator: true, speed: 1.5, size: 1.2, reach: 2, fact: 'A shark relative with a spiral whorl of teeth in its lower jaw, like a buzz saw.' },
  xenacanthus: { name: 'Xenacanthus', kind: 'swimmer', predator: true, speed: 1.2, fact: 'An eel-shaped freshwater shark with a long spine sticking back from its head.' },
  mesosaurus: { name: 'Mesosaurus', kind: 'swimmer', speed: 1.3, fact: 'One of the first reptiles to return to the water. Its fossils in both Africa and South America helped prove continental drift.' },
  dimetrodon: { name: 'Dimetrodon', kind: 'walker', predator: true, speed: 0.6, size: 1.2, reach: 2, fact: 'A sail-backed predator often mistaken for a dinosaur. It was actually closer to mammals.' },
  edaphosaurus: { name: 'Edaphosaurus', kind: 'walker', speed: 0.4, size: 1.2, reach: 2, fact: 'A sail-backed plant-eater whose sail spines bristled with little crossbars.' },
  hylonomus: { name: 'Hylonomus', kind: 'walker', speed: 0.7, size: 1.3, fact: 'A 20 cm lizard-like animal, the oldest known reptile, found fossilized inside hollow tree stumps.' },
  diplocaulus: { name: 'Diplocaulus', kind: 'walker', speed: 0.3, size: 1.2, fact: 'An amphibian with a boomerang-shaped head, perhaps used like a hydrofoil when swimming.' },
  gorgonops: { name: 'Gorgonopsids', kind: 'walker', predator: true, speed: 1.1, size: 1.2, reach: 2, fact: 'Saber-toothed predators of the late Permian, distant relatives of mammals.' },
  scutosaurus: { name: 'Scutosaurus', kind: 'walker', speed: 0.35, size: 1.2, reach: 2, fact: 'A squat, cow-sized plant-eater studded with bony armor.' },
  // Mesozoic
  mosasaur: { name: 'Mosasaurs', kind: 'swimmer', predator: true, speed: 1.8, size: 1.4, reach: 3, fact: 'Giant marine lizards related to monitor lizards and snakes. The largest reached 17 m.' },
  archelon: { name: 'Archelon', kind: 'swimmer', speed: 0.8, size: 1.6, reach: 2, fact: 'A sea turtle 4 m long, the largest turtle ever found.' },
  belemnite: { name: 'Belemnites', kind: 'swimmer', speed: 1, fact: 'Squid relatives with a bullet-shaped internal shell. Fossil ones were once called "thunderbolts".' },
  hybodus: { name: 'Hybodus', kind: 'swimmer', speed: 1.4, size: 1.1, fact: 'A shark with spines before its dorsal fins and two kinds of teeth, for gripping and for crushing.' },
  stegosaurus: { name: 'Stegosaurus', kind: 'walker', speed: 0.5, size: 1.2, reach: 3.5, fact: 'Its tail spikes were real weapons: one Allosaurus fossil has a wound that matches them.' },
  velociraptor: { name: 'Velociraptor', kind: 'walker', predator: true, speed: 1.6, size: 1.1, fact: 'A feathered predator the size of a turkey, with a sickle-shaped claw on each foot.' },
  ankylosaurus: { name: 'Ankylosaurus', kind: 'walker', speed: 0.35, size: 1.2, reach: 3, fact: 'A living tank, with bony armor down to its eyelids and a club on its tail.' },
  parasaurolophus: { name: 'Parasaurolophus', kind: 'walker', speed: 0.6, size: 1.2, reach: 3, fact: 'A duck-billed dinosaur whose hollow crest worked like a trumpet for deep calls.' },
  // Cenozoic
  dolphin: { name: 'Dolphins', kind: 'swimmer', speed: 2.4, size: 1.1, reach: 1.5, fact: 'Echolocating mammals that hunt together in cooperative pods.' },
  basilosaurus: { name: 'Basilosaurus', kind: 'swimmer', predator: true, speed: 1.2, size: 1.3, reach: 4, fact: 'An 18 m early whale, so serpent-like it was first mistaken for a reptile. It still had tiny hind legs.' },
  seaTurtle: { name: 'Sea turtles', kind: 'swimmer', speed: 0.8, fact: "They outlived the dinosaurs, and navigate the oceans using Earth's magnetic field." },
  squid: { name: 'Squid', kind: 'swimmer', speed: 1.3, fact: 'Jet-propelled hunters with eight arms, two long tentacles and some of the largest eyes in nature.' },
  penguin: { name: 'Penguins', kind: 'swimmer', speed: 1.8, fact: 'Birds that traded flying in air for flying underwater. Some early penguins stood as tall as a person.' },
  terrorBird: { name: 'Terror birds', kind: 'walker', predator: true, speed: 1.6, size: 1.1, reach: 2, fact: 'Flightless predatory birds up to 3 m tall with axe-like hooked beaks.' },
  megatherium: { name: 'Megatherium', kind: 'walker', speed: 0.4, size: 1.2, reach: 3, fact: 'A ground sloth as big as an elephant that could rear up on its hind legs to browse trees.' },
  glyptodon: { name: 'Glyptodon', kind: 'walker', speed: 0.3, size: 1.1, reach: 2.5, fact: 'An armadillo relative the size of a small car, inside a domed shell of over 1,000 bony plates.' },
  woollyRhino: { name: 'Woolly rhinos', kind: 'walker', speed: 0.6, size: 1.2, reach: 3, fact: 'Shaggy Ice Age rhinoceroses with a front horn up to a meter long.' },
};
for (const [id, s] of Object.entries(SPECIES)) s.id = id;

// Who lives where, per era (index into ERAS): [speciesId, count].
const ERA_LIFE = [
  {
    water: [['bacterium', 16], ['cyanobacteria', 12], ['methanogen', 10], ['purpleBacteria', 10], ['spirochete', 8], ['phage', 8],
      ['ironBacteria', 6], ['stromatolite', 30]],
  },
  {
    water: [['dickinsonia', 10], ['jellyfish', 8], ['spriggina', 6], ['kimberella', 5], ['parvancorina', 6], ['ikaria', 8], ['acritarch', 10],
      ['charnia', 22], ['sponge', 12]],
  },
  {
    water: [['trilobite', 14], ['anomalocaris', 3], ['opabinia', 4], ['hallucigenia', 8], ['pikaia', 6], ['wiwaxia', 6], ['marrella', 8],
      ['haikouichthys', 6], ['sponge', 16], ['seaweed', 10]],
  },
  {
    water: [['eurypterid', 5], ['orthocone', 3], ['dunkleosteus', 2], ['ostracoderm', 8], ['trilobite', 6], ['cladoselache', 2],
      ['acanthodian', 6], ['brittleStar', 8], ['crinoid', 20], ['sponge', 8]],
    land: [['millipede', 8], ['trigonotarbid', 5], ['scorpion', 4], ['springtail', 8], ['centipede', 4], ['tiktaalik', 3], ['ichthyostega', 2],
      ['cooksonia', 70], ['moss', 25]],
  },
  {
    water: [['stethacanthus', 4], ['ammonite', 7], ['coelacanth', 3], ['helicoprion', 2], ['xenacanthus', 3], ['mesosaurus', 4],
      ['trilobite', 4], ['eurypterid', 3], ['crinoid', 16], ['seaweed', 10]],
    land: [['dimetrodon', 2], ['arthropleura', 3], ['eryops', 4], ['edaphosaurus', 2], ['hylonomus', 5], ['diplocaulus', 3], ['gorgonops', 2],
      ['scutosaurus', 3], ['lepidodendron', 14], ['calamites', 20], ['treeFern', 16], ['moss', 15]],
  },
  {
    water: [['ichthyosaur', 4], ['plesiosaur', 3], ['ammonite', 8], ['fish', 8], ['mosasaur', 2], ['archelon', 3], ['belemnite', 8],
      ['hybodus', 3], ['seaweed', 14]],
    land: [['sauropod', 2], ['theropod', 2], ['triceratops', 3], ['pachycephalosaurus', 3], ['stegosaurus', 2], ['velociraptor', 4], ['ankylosaurus', 2],
      ['parasaurolophus', 3], ['cycad', 16], ['conifer', 14], ['fern', 30], ['flower', 30]],
  },
  {
    water: [['whale', 2], ['megalodon', 2], ['fish', 14], ['dolphin', 4], ['basilosaurus', 1], ['seaTurtle', 3], ['squid', 5], ['penguin', 5],
      ['kelp', 26]],
    land: [['mammoth', 3], ['sabertooth', 2], ['deer', 5], ['bird', 6], ['terrorBird', 2], ['megatherium', 2], ['glyptodon', 2],
      ['woollyRhino', 2], ['broadleaf', 18], ['conifer', 6], ['grass', 70], ['flower', 30]],
  },
];

/** Every species once, grouped by the era (index into ERAS) where it first appears. */
export function speciesByEra() {
  const seen = new Set();
  return ERA_LIFE.map((e) => [...(e.water ?? []), ...(e.land ?? [])]
    .map(([id]) => id)
    .filter((id) => !seen.has(id) && seen.add(id)));
}

/** Every era and habitat a species lives in, in era order. */
export function whereToFind(id) {
  return ERA_LIFE.flatMap((e, era) => ['water', 'land'].filter((h) => e[h]?.some(([sid]) => sid === id)).map((habitat) => ({ era, habitat })));
}

/** An era's roster as written: `water`, and `land` once there is life on land. */
export const eraLife = (era) => ERA_LIFE[era];

export function lifeFor(era, habitat) {
  const e = ERA_LIFE[Math.min(era, ERA_LIFE.length - 1)];
  return e[habitat] ?? e.water;
}
