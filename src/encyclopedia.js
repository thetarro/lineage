// Prehistory encyclopedia: every species the player has met, remembered across games.
// Undiscovered species show as locked silhouettes. Thumbnails are rendered from the
// same low-poly builders the world uses.

import * as THREE from 'three';
import { SPECIES, speciesByEra } from './fauna.js';
import { ERAS } from './data.js';
import { showModal, fmtMya } from './ui.js';

// When each species lived, its size and diet, plus facts beyond the encounter fact.
export const ENTRIES = {
  // ── Primordial microbes ──────────────────────────────────────────────────
  bacterium: {
    lived: 'At least 3.5 billion years ago to today', size: '1–5 micrometers', diet: 'Chemicals such as hydrogen, iron and sulfur compounds',
    facts: ['Archaea and bacteria are two separate domains of life: archaea differ from bacteria about as much as bacteria differ from us.', 'For around two billion years, single cells like these were the only life on Earth.'],
  },
  cyanobacteria: {
    lived: 'At least 2.7 billion years ago to today', size: 'A few micrometers per cell; colonies can be seen by eye', diet: 'Sunlight (photosynthesis)',
    facts: ['The chloroplasts in every plant cell descend from cyanobacteria that were swallowed by another cell over a billion years ago.', 'The oxygen they released triggered the Great Oxidation Event about 2.4 billion years ago.'],
  },
  stromatolite: {
    lived: 'About 3.5 billion years ago to today', size: 'Mounds from a few centimeters to several meters tall', diet: 'Built by photosynthesizing microbes',
    facts: ['They grow very slowly, often less than a millimeter a year, as microbes trap sediment and grow up through it.', 'For over two billion years they were the most visible sign of life on Earth.'],
  },
  methanogen: {
    lived: 'At least 3.4 billion years ago to today', size: 'About 1 micrometer', diet: 'Hydrogen and carbon dioxide, turned into methane',
    facts: ['Oxygen is poison to them, so today they live in swamps, rice paddies and the stomachs of cows.', 'They are archaea, not bacteria, despite looking similar under a microscope.'],
  },
  purpleBacteria: {
    lived: 'Probably over 3 billion years ago to today', size: '1–5 micrometers', diet: 'Sunlight, using hydrogen sulfide instead of water',
    facts: ['They need light but no oxygen, so they thrive just below the surface of stagnant, oxygen-free water.', 'Their blooms can turn ponds and lagoons pink or purple.'],
  },
  spirochete: {
    lived: 'Ancient, and still living today', size: '5–250 micrometers long, but extremely thin', diet: 'Dissolved nutrients; some live inside other organisms',
    facts: ['Termites rely on spirochetes in their gut to help digest wood.', 'Some cause human diseases, such as Lyme disease and syphilis.'],
  },
  phage: {
    lived: 'Probably as old as cells themselves, to today', size: 'About 20–200 nanometers', diet: 'None: a virus hijacks a bacterium to copy itself',
    facts: ['There may be around 10³¹ phages on Earth, more than every star in the observable universe.', 'Doctors use them in "phage therapy" against infections that antibiotics cannot cure.'],
  },
  ironBacteria: {
    lived: 'Over 2.5 billion years ago to today', size: 'A few micrometers', diet: 'Energy from turning dissolved iron into rust',
    facts: ['Today they make the orange slime found in streams and drainage pipes.', 'Most banded iron formations were laid down between 2.5 and 1.8 billion years ago.'],
  },

  // ── Proterozoic and Ediacaran ────────────────────────────────────────────
  acritarch: {
    lived: 'About 1.8 billion years ago onward; most common until 250 million years ago', size: 'Usually 20–150 micrometers', diet: 'Mostly sunlight, as single-celled algae',
    facts: ['"Acritarch" means "of uncertain origin": it is a catch-all name for microfossils nobody can classify.', 'Geologists use them to date rocks and to search for oil.'],
  },
  dickinsonia: {
    lived: 'About 560–550 million years ago', size: 'Usually a few centimeters; up to 1.4 m', diet: 'Probably absorbed food from the microbial mats beneath it',
    facts: ['In 2018, cholesterol molecules preserved in a fossil showed that it was an animal.', 'Trails of body-shaped imprints suggest it fed in one spot, then moved on.'],
  },
  charnia: {
    lived: 'About 575–555 million years ago', size: 'Usually 15–60 cm; one species reached 2 m', diet: 'Probably absorbed nutrients from seawater',
    facts: ['Schoolchildren found it in Charnwood Forest, England, in the 1950s, in rocks thought too old to hold fossils.', 'It lived in the deep sea, too dark for photosynthesis, so it was probably not a plant.'],
  },
  jellyfish: {
    lived: 'Over 500 million years ago to today', size: 'Millimeters to over 2 m across', diet: 'Plankton and small animals, caught with stinging tentacles',
    facts: ['Jellyfish have no brain, heart or bones, and are about 95% water.', 'Their stinging cells fire faster than almost anything else in nature.'],
  },
  sponge: {
    lived: 'Over 540 million years ago, possibly much earlier, to today', size: 'A few millimeters to over 3 m', diet: 'Bacteria and particles filtered from seawater',
    facts: ['Push a sponge through a fine sieve and its separated cells can crawl back together and reassemble.', 'Some deep-sea glass sponges may live for over 10,000 years.'],
  },
  spriggina: {
    lived: 'About 555 million years ago', size: '3–5 cm', diet: 'Unknown',
    facts: ['It is named after Reg Sprigg, who discovered Ediacaran fossils in the Flinders Ranges of Australia in 1946.', 'Its body is made of segments that do not line up exactly across the middle, unlike most animals.'],
  },
  kimberella: {
    lived: 'About 558–555 million years ago', size: 'Up to about 15 cm', diet: 'Microbial mats, scraped up with a toothed proboscis',
    facts: ['It may be an early relative of molluscs, the group that includes snails and octopuses.', 'Its fossils are often found next to its scratch marks, so we know how it fed.'],
  },
  parvancorina: {
    lived: 'About 555 million years ago', size: 'Up to about 2.5 cm', diet: 'Unknown; possibly filtered from the water',
    facts: ['It may be a distant relative of the arthropods.', 'Young and adult fossils have different proportions, showing it changed shape as it grew.'],
  },
  ikaria: {
    lived: 'About 560–551 million years ago', size: '2–7 mm', diet: 'Organic matter in the seafloor sediment',
    facts: ['Its burrows were known long before the animal itself was identified in 2020, using 3D laser scans.', 'It is one of the oldest known bilaterians: animals with a mouth, a gut and an anus.'],
  },

  // ── Cambrian ─────────────────────────────────────────────────────────────
  trilobite: {
    lived: 'About 521–252 million years ago', size: 'Under 1 cm to over 70 cm', diet: 'Varied: mud-eaters, filter feeders, scavengers and hunters',
    facts: ['Their eyes had lenses made of the mineral calcite, a kind of rock.', 'Many could roll up like pill bugs for protection.'],
  },
  anomalocaris: {
    lived: 'About 515–499 million years ago', size: 'Up to about 40 cm; early estimates said 1 m', diet: 'Soft-bodied animals',
    facts: ['Its name means "unusual shrimp": its grasping limbs were first found on their own and mistaken for shrimp.', 'Fossil eyes of a relative from Australia had over 16,000 lenses each.'],
  },
  opabinia: {
    lived: 'About 508 million years ago', size: 'Up to about 7 cm', diet: 'Small animals or food from the seafloor, grabbed with its nozzle',
    facts: ['It is known almost only from the Burgess Shale in Canada.', 'It is a distant cousin of the arthropods, the group that includes insects and crabs.'],
  },
  hallucigenia: {
    lived: 'About 518–505 million years ago', size: '1–5 cm', diet: 'Probably small food particles',
    facts: ['Its head was only identified in 2015, with simple eyes and a ring of teeth.', 'It belongs to the lobopodians, relatives of the living velvet worms.'],
  },
  pikaia: {
    lived: 'About 508 million years ago', size: 'About 4–5 cm', diet: 'Probably small particles filtered from the water',
    facts: ['It swam by flexing its body in S-shaped curves, like an eel.', 'It was once called the oldest known chordate, until older ones were found in China.'],
  },
  wiwaxia: {
    lived: 'About 518–505 million years ago', size: 'Up to about 5 cm', diet: 'Grazing on microbial mats',
    facts: ['It may be related to molluscs or to bristle worms; scientists still disagree.', 'Its scales grew in rows and were shed and replaced as it grew.'],
  },
  marrella: {
    lived: 'About 508 million years ago', size: 'About 2 cm', diet: 'Small particles from the seafloor',
    facts: ['Over 25,000 specimens have been collected from the Burgess Shale.', 'Some fossils catch it in the middle of molting its exoskeleton.'],
  },
  haikouichthys: {
    lived: 'About 518 million years ago', size: 'About 2.5 cm', diet: 'Probably small particles',
    facts: ['It was found in the Chengjiang fossil beds of southern China.', 'It already had a skull and gill pouches, the basic plan of every fish.'],
  },

  // ── Silurian and Devonian ────────────────────────────────────────────────
  eurypterid: {
    lived: 'About 467–252 million years ago', size: 'Under 10 cm to about 2.6 m', diet: 'Fish and other animals; some were scavengers',
    facts: ['Despite the name, they were not true scorpions, though they were close relatives.', 'Many later moved into rivers and swamps.'],
  },
  orthocone: {
    lived: 'Most common about 485–360 million years ago', size: 'Shells usually under 1 m; some up to about 6 m', diet: 'Animals caught with tentacles',
    facts: ['Their shells had chambers of gas and liquid to control buoyancy, like a submarine.', 'The living nautilus is a distant relative with a coiled shell.'],
  },
  dunkleosteus: {
    lived: 'About 382–358 million years ago', size: 'About 3.5–6 m long (estimates vary)', diet: 'Fish, sharks and other armored animals',
    facts: ['It had no teeth: its bony jaw plates sharpened each other as they ground together.', 'It could open its mouth in about a fiftieth of a second, sucking prey in.'],
  },
  ostracoderm: {
    lived: 'About 480–360 million years ago', size: 'Usually under 50 cm', diet: 'Small particles and mud from the seafloor',
    facts: ['Their name means "shell-skinned".', 'Their bony armor is among the earliest bone in the fossil record.'],
  },
  crinoid: {
    lived: 'About 485 million years ago to today', size: 'Stalks usually under 1 m; one fossil species reached 26 m', diet: 'Plankton caught with feathery arms',
    facts: ['Some limestones are made almost entirely of broken crinoid pieces.', 'Their stalkless cousins, the feather stars, can swim by waving their arms.'],
  },
  cladoselache: {
    lived: 'About 370 million years ago', size: 'Up to about 1.8 m', diet: 'Fish and shrimp-like animals, often swallowed tail first',
    facts: ['Fossils from the Cleveland Shale in Ohio even preserve its muscles and kidneys.', 'Unlike modern sharks, it had almost no scales.'],
  },
  acanthodian: {
    lived: 'About 440–280 million years ago', size: 'Usually under 20 cm', diet: 'Plankton or small animals',
    facts: ['They are now thought to be early relatives of sharks.', 'Some had no teeth and probably filtered food from the water.'],
  },
  brittleStar: {
    lived: 'About 480 million years ago to today', size: 'Bodies up to about 5 cm across, with much longer arms', diet: 'Detritus, plankton or small animals',
    facts: ['They can shed an arm to escape a predator, then grow it back.', 'Some can sense light over their whole body.'],
  },
  cooksonia: {
    lived: 'About 433–393 million years ago', size: 'A few centimeters tall', diet: 'Sunlight (photosynthesis)',
    facts: ['It had no leaves or roots: just forked stems tipped with spore capsules.', 'It had water-carrying tubes inside, an early step toward trees.'],
  },
  moss: {
    lived: 'About 470 million years ago to today', size: 'Usually a few centimeters', diet: 'Sunlight (photosynthesis)',
    facts: ['They have no true roots and absorb water through their whole surface.', 'Early plants like these helped turn bare rock into the first soils.'],
  },
  millipede: {
    lived: 'About 428 million years ago to today', size: 'Usually a few centimeters', diet: 'Decaying plants',
    facts: ['A 428-million-year-old millipede from Scotland is one of the oldest known land animals.', 'One living species, found in Australia in 2021, has over 1,300 legs.'],
  },
  trigonotarbid: {
    lived: 'About 419–299 million years ago', size: 'Usually 1–3 cm', diet: 'Small animals',
    facts: ["Fossils from Scotland's Rhynie chert are so detailed that their book lungs can be seen.", 'They died out at the end of the Carboniferous and left no living descendants.'],
  },
  scorpion: {
    lived: 'About 435 million years ago to today', size: 'Usually a few centimeters', diet: 'Insects and other small animals',
    facts: ['Scorpions glow blue-green under ultraviolet light.', 'The earliest scorpions may have lived in water before moving onto land.'],
  },
  springtail: {
    lived: 'About 410 million years ago to today', size: '1–6 mm', diet: 'Fungi, algae and decaying matter',
    facts: ["Rhyniella, from Scotland's Rhynie chert, is one of the oldest known six-legged animals.", 'A single square meter of soil can hold over 100,000 of them.'],
  },
  centipede: {
    lived: 'About 420 million years ago to today', size: 'Usually a few centimeters', diet: 'Small animals',
    facts: ['Their venom claws are a pair of legs turned into fangs.', 'Every centipede has an odd number of leg pairs.'],
  },
  tiktaalik: {
    lived: 'About 375 million years ago', size: 'About 1.2–2.7 m', diet: 'Fish and other animals of the shallows',
    facts: ['Scientists found it in 2004 in the Canadian Arctic by searching rocks of exactly the right age.', 'It had lungs as well as gills, and a flexible wrist inside its fins.'],
  },
  ichthyostega: {
    lived: 'About 365 million years ago', size: 'About 1.5 m', diet: 'Fish and small animals',
    facts: ['It probably spent most of its time in water, hauling itself onto land like a seal.', 'Its fossils were found in Greenland in the 1930s.'],
  },

  // ── Carboniferous and Permian ────────────────────────────────────────────
  stethacanthus: {
    lived: 'About 370–345 million years ago', size: 'About 0.7–2 m', diet: 'Fish and other sea animals',
    facts: ["The crest on males' backs was covered in small tooth-like scales.", 'The crest may have been for display, or to look bigger to predators.'],
  },
  ammonite: {
    lived: 'About 409–66 million years ago', size: 'Mostly a few centimeters; the largest about 2 m across', diet: 'Plankton and small animals',
    facts: ['They died out with the dinosaurs at the end of the Cretaceous.', 'They evolved so fast that geologists use them to date rocks.'],
  },
  coelacanth: {
    lived: 'About 410 million years ago to today', size: 'Up to about 2 m', diet: 'Fish and squid',
    facts: ['Living coelacanths may reach 100 years old.', "Their lobed fins move in the same alternating pattern as a walking animal's legs."],
  },
  helicoprion: {
    lived: 'About 290–270 million years ago', size: 'Possibly 5–8 m', diet: 'Probably soft prey like squid',
    facts: ['For a century nobody knew where its tooth whorl went, until a 2013 CT scan placed it in the lower jaw.', 'It was more closely related to ratfish than to true sharks.'],
  },
  xenacanthus: {
    lived: 'Late Devonian to Triassic, about 360–220 million years ago', size: 'About 0.7–1 m', diet: 'Fish and amphibians',
    facts: ['Unlike most sharks, it lived in rivers and lakes.', 'Its teeth had two prongs, shaped like a V.'],
  },
  mesosaurus: {
    lived: 'About 299–280 million years ago', size: 'About 1 m', diet: 'Small crustaceans, perhaps strained with its long thin teeth',
    facts: ['It is one of the first reptiles known to have returned to the water.', 'Fossils of embryos suggest it may have given birth to live young.'],
  },
  lepidodendron: {
    lived: 'About 359–299 million years ago', size: 'Up to about 40 m tall', diet: 'Sunlight (photosynthesis)',
    facts: ['Its bark was covered in diamond-shaped leaf scars, so its fossils look like snakeskin.', 'It was more closely related to tiny club mosses than to any modern tree.'],
  },
  calamites: {
    lived: 'About 360–250 million years ago', size: 'Up to about 20 m tall', diet: 'Sunlight (photosynthesis)',
    facts: ['Its trunks were hollow, like bamboo.', 'It spread by underground stems, forming dense thickets.'],
  },
  treeFern: {
    lived: 'About 300 million years ago to today', size: 'Up to about 10 m tall', diet: 'Sunlight (photosynthesis)',
    facts: ['Their trunks are wrapped in a thick mat of roots.', 'Tree ferns still grow in the rainforests of Australia and New Zealand.'],
  },
  arthropleura: {
    lived: 'About 345–290 million years ago', size: 'Up to about 2.6 m', diet: 'Probably decaying plants',
    facts: ['Its fossil trackways show it walked across forest floors on dozens of legs.', 'The high oxygen levels of the coal swamps may have helped it grow so big.'],
  },
  eryops: {
    lived: 'About 295 million years ago', size: 'About 2 m', diet: 'Fish and smaller animals',
    facts: ['It was one of the largest land animals of its time.', 'Its skull was broad and flat, like a crocodile\'s.'],
  },
  dimetrodon: {
    lived: 'About 295–272 million years ago', size: '1.7–4.6 m', diet: 'Other animals, from fish to large reptiles',
    facts: ['Its name means "two measures of teeth", for its teeth of different sizes.', 'Its sail may have helped it warm up, or to show off.'],
  },
  edaphosaurus: {
    lived: 'About 303–280 million years ago', size: 'Up to about 3.5 m', diet: 'Plants',
    facts: ['It was one of the first large plant-eating land animals.', 'Its small head held grinding tooth plates for tough plants.'],
  },
  hylonomus: {
    lived: 'About 312 million years ago', size: 'About 20 cm', diet: 'Insects and millipedes',
    facts: ['Its fossils come from the sea cliffs of Joggins, Nova Scotia.', 'Its eggs were probably among the first that could be laid on dry land.'],
  },
  diplocaulus: {
    lived: 'About 306–255 million years ago', size: 'About 1 m', diet: 'Fish and small animals',
    facts: ['Young ones had small heads: the boomerang grew wider as they aged.', 'The wide head may also have made it too awkward for predators to swallow.'],
  },
  gorgonops: {
    lived: 'About 260–252 million years ago', size: 'Up to about 3 m', diet: 'Large plant-eating animals',
    facts: ['They were the top predators of their time.', 'They all died out in the Great Dying.'],
  },
  scutosaurus: {
    lived: 'About 264–252 million years ago', size: 'About 2–3 m', diet: 'Plants',
    facts: ['Its cheeks were lined with bony spikes.', 'Its fossils come from what is now Russia.'],
  },

  // ── Mesozoic ─────────────────────────────────────────────────────────────
  ichthyosaur: {
    lived: 'About 250–90 million years ago', size: 'Under 1 m to over 20 m', diet: 'Fish and squid-like animals',
    facts: ['They gave birth to live young at sea; some fossils show mothers mid-birth.', 'Mary Anning and her brother found the first complete one in England around 1811.'],
  },
  plesiosaur: {
    lived: 'About 203–66 million years ago', size: 'About 1.5–15 m', diet: 'Fish, squid and other sea animals',
    facts: ['Like ichthyosaurs, they gave birth to live young.', 'Some, like Elasmosaurus, had over 70 bones in their neck.'],
  },
  mosasaur: {
    lived: 'About 98–66 million years ago', size: 'Up to about 17 m', diet: 'Fish, turtles, ammonites and other sea reptiles',
    facts: ['They had an extra row of teeth on the roof of the mouth to grip prey.', 'The first one was found near Maastricht, in the Netherlands, in the 1700s.'],
  },
  archelon: {
    lived: 'About 80–74 million years ago', size: 'About 4–4.6 m', diet: 'Jellyfish, squid and shellfish',
    facts: ['Its shell was a bony frame covered in leathery skin, like a leatherback turtle.', 'One famous fossil is missing a flipper, perhaps bitten off by a predator.'],
  },
  belemnite: {
    lived: 'About 230–66 million years ago', size: 'Usually under 50 cm', diet: 'Small fish and crustaceans',
    facts: ['Fossil ink sacs have been found so well preserved that scientists drew with the ink.', 'They died out with the dinosaurs.'],
  },
  hybodus: {
    lived: 'About 250–75 million years ago', size: 'About 2 m', diet: 'Fish and shellfish',
    facts: ['Males had hooked spines on their heads, possibly used during mating.', 'Its blunt back teeth could crush shells.'],
  },
  sauropod: {
    lived: 'About 210–66 million years ago', size: 'Up to about 30–35 m long', diet: 'Plants',
    facts: ['They swallowed leaves without chewing.', "Air sacs inside their neck bones kept their long necks light, like birds' bones."],
  },
  theropod: {
    lived: 'About 68–66 million years ago', size: 'Up to about 12 m long and 8 tonnes', diet: 'Large dinosaurs, hunted or scavenged',
    facts: ['Its teeth, roots included, could be about 30 cm long.', 'Its arms were short but very strong.'],
  },
  triceratops: {
    lived: 'About 68–66 million years ago', size: 'About 9 m long, up to about 12 tonnes', diet: 'Plants',
    facts: ['Its frill was solid bone.', 'Tooth marks on its bones show Tyrannosaurus fed on it.'],
  },
  pachycephalosaurus: {
    lived: 'About 70–66 million years ago', size: 'About 4.5 m', diet: 'Plants, perhaps also fruit and seeds',
    facts: ['Some scientists think the spiky Dracorex and Stygimoloch were just young Pachycephalosaurus.', 'Whether it really head-butted is debated, but some skull domes show healed injuries.'],
  },
  stegosaurus: {
    lived: 'About 155–145 million years ago', size: 'About 9 m', diet: 'Low-growing plants',
    facts: ['Its brain was only about the size of a lime.', 'Its plates were not armor; they may have been for display.'],
  },
  velociraptor: {
    lived: 'About 75–71 million years ago', size: 'About 2 m long and 15 kg', diet: 'Small animals',
    facts: ['A famous fossil shows one locked in combat with a Protoceratops.', 'Bumps on its arm bones show where large feathers attached.'],
  },
  ankylosaurus: {
    lived: 'About 68–66 million years ago', size: 'About 6–8 m', diet: 'Low-growing plants',
    facts: ['Its tail club was made of fused bony plates.', 'Even its eyelids were protected by bony plates.'],
  },
  parasaurolophus: {
    lived: 'About 77–73 million years ago', size: 'About 9.5 m', diet: 'Plants',
    facts: ['Its crest was up to 1 m long, with air tubes running inside it.', 'Like other duck-billed dinosaurs, it had hundreds of teeth packed together for grinding.'],
  },
  cycad: {
    lived: 'About 280 million years ago to today', size: 'Usually 1–3 m; a few reach about 18 m', diet: 'Sunlight (photosynthesis)',
    facts: ['Many cycads are poisonous.', 'Many are pollinated by beetles, an arrangement that predates flowers.'],
  },
  conifer: {
    lived: 'About 310 million years ago to today', size: 'Up to 116 m tall (coast redwood)', diet: 'Sunlight (photosynthesis)',
    facts: ['Bristlecone pines, also conifers, can live for more than 4,800 years.', 'Amber is fossilized resin, much of it from ancient conifers.'],
  },
  fern: {
    lived: 'About 360 million years ago to today', size: 'From a few millimeters to tree-sized', diet: 'Sunlight (photosynthesis)',
    facts: ['Ferns spread by spores, not seeds.', 'After the dinosaur-killing impact, a burst of fern spores shows ferns were the first to regrow.'],
  },
  flower: {
    lived: 'About 130 million years ago to today', size: 'From under 1 mm to giant trees', diet: 'Sunlight (photosynthesis)',
    facts: ['There are around 300,000 species of flowering plants today.', 'Charles Darwin called their sudden rise "an abominable mystery".'],
  },
  seaweed: {
    lived: 'Algae: over a billion years ago to today', size: 'From single cells to many meters long', diet: 'Sunlight (photosynthesis)',
    facts: ['Bangiomorpha, a red alga about a billion years old, is one of the oldest known many-celled organisms.', 'Ocean algae and plankton produce about half the oxygen we breathe.'],
  },

  // ── Cenozoic ─────────────────────────────────────────────────────────────
  kelp: {
    lived: 'About 32 million years ago to today', size: 'Giant kelp can be over 40 m long', diet: 'Sunlight (photosynthesis)',
    facts: ['Giant kelp can grow up to about half a meter in a single day.', 'Gas-filled bladders keep its fronds floating toward the light.'],
  },
  whale: {
    lived: 'About 50 million years ago to today', size: 'Up to about 30 m (blue whale)', diet: 'Krill, plankton, fish or squid',
    facts: ['The blue whale is the largest animal known to have ever lived.', 'Their earliest ancestors, like Pakicetus, were wolf-sized land animals.'],
  },
  megalodon: {
    lived: 'About 23–3.6 million years ago', size: 'Possibly up to about 18 m', diet: 'Whales, seals and large fish',
    facts: ['It is known mostly from teeth, some as big as a hand.', 'Fossil whale bones carry its bite marks.'],
  },
  fish: {
    lived: 'About 420 million years ago to today', size: 'Under 1 cm to over 3 m', diet: 'Almost anything, depending on the species',
    facts: ['About half of all living vertebrate species are ray-finned fish.', 'Their fins are thin webs of skin held up by bony rays.'],
  },
  dolphin: {
    lived: 'About 11 million years ago to today', size: 'About 1.5–10 m (the orca is a dolphin)', diet: 'Fish and squid',
    facts: ['They sleep with one half of the brain at a time.', 'Each bottlenose dolphin has its own signature whistle, like a name.'],
  },
  basilosaurus: {
    lived: 'About 41–34 million years ago', size: 'About 15–18 m', diet: 'Fish, sharks and smaller whales',
    facts: ['Its name means "king lizard".', 'Stomach contents show it ate young of the smaller whale Dorudon.'],
  },
  seaTurtle: {
    lived: 'About 120 million years ago to today', size: 'Up to about 2 m (leatherback)', diet: 'Varies: jellyfish, seagrass, sponges or shellfish',
    facts: ['Females return to the beach where they hatched to lay their eggs.', 'The temperature of the sand decides whether hatchlings are male or female.'],
  },
  squid: {
    lived: 'Squid-like animals: over 160 million years ago to today', size: 'Up to about 12–14 m (giant and colossal squid)', diet: 'Fish, shrimp and other squid',
    facts: ['They have three hearts and blue blood.', 'They can change color in a fraction of a second.'],
  },
  penguin: {
    lived: 'About 62 million years ago to today', size: 'Today up to about 1.2 m; some extinct ones up to 1.6 m', diet: 'Fish, krill and squid',
    facts: ['Waimanu, one of the oldest penguins, lived just a few million years after the dinosaurs died out.', 'Their solid, heavy bones help them dive.'],
  },
  terrorBird: {
    lived: 'About 60 to 2 million years ago', size: 'Up to about 3 m tall', diet: 'Mammals and other animals',
    facts: ['Most lived in South America; one, Titanis, reached North America.', 'They probably struck prey with their beaks like an axe.'],
  },
  bird: {
    lived: 'About 150 million years ago to today', size: 'From the 5 cm bee hummingbird to the 2.7 m ostrich', diet: 'Varies: seeds, fruit, nectar, insects, fish or meat',
    facts: ['Over 10,000 species of birds live today.', 'Archaeopteryx, about 150 million years old, is one of the oldest known birds.'],
  },
  deer: {
    lived: 'About 20 million years ago to today', size: 'From the 35 cm pudu to the 2 m moose (shoulder height)', diet: 'Leaves, grass and shoots',
    facts: ['Antlers are bone, and regrow every year.', 'Growing antlers can lengthen by about 2 cm a day.'],
  },
  grass: {
    lived: 'At least 66 million years ago; widespread from about 20 million years ago', size: 'From a few centimeters to bamboo over 30 m tall', diet: 'Sunlight (photosynthesis)',
    facts: ['Tiny silica crystals from grass have been found in fossil dinosaur dung.', 'Grass grows from its base, so it survives being grazed.'],
  },
  broadleaf: {
    lived: 'About 100 million years ago to today', size: 'Up to about 100 m tall', diet: 'Sunlight (photosynthesis)',
    facts: ['Many drop their leaves in autumn to save water and energy through winter.', 'Most of them are flowering plants.'],
  },
  mammoth: {
    lived: 'About 400,000 to 4,000 years ago', size: 'About 3 m tall at the shoulder, up to about 6 tonnes', diet: 'Grasses and other plants',
    facts: ['The last mammoths lived on Wrangel Island, Siberia, until about 4,000 years ago, when the Egyptian pyramids already stood.', 'Frozen carcasses preserve hair, skin and even their last meals.'],
  },
  sabertooth: {
    lived: 'About 2.5 million to 10,000 years ago', size: 'Up to about 400 kg', diet: 'Large mammals such as bison and ground sloths',
    facts: ['Thousands of its fossils come from the La Brea tar pits in Los Angeles.', 'It could open its jaws to about 120 degrees.'],
  },
  megatherium: {
    lived: 'About 5 million to 12,000 years ago', size: 'About 6 m long, up to about 4 tonnes', diet: 'Leaves and other plants',
    facts: ['Charles Darwin collected fossils of it in Argentina in 1832.', 'It walked on the sides of its feet because of its huge claws.'],
  },
  glyptodon: {
    lived: 'About 2.5 million to 10,000 years ago', size: 'About 3 m long, up to about 2 tonnes', diet: 'Grasses and other plants',
    facts: ['It could not pull its head into its shell; its head had its own bony cap.', 'It lived in South America until the end of the last Ice Age.'],
  },
  woollyRhino: {
    lived: 'About 350,000 to 14,000 years ago', size: 'About 3.5 m long, 2–3 tonnes', diet: 'Grasses and other low plants',
    facts: ['Ice Age cave paintings in France, such as at Chauvet, show woolly rhinos.', 'Wear on its fossil horns suggests it swept snow aside to reach grass.'],
  },
};

// ── Discoveries (kept across games in this browser) ──────────────────────

const STORE = 'lineage.discovered';

export function loadDiscovered() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORE) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function saveDiscovered(set) {
  try {
    localStorage.setItem(STORE, JSON.stringify([...set]));
  } catch {
    // Storage blocked (private mode, previews): discoveries last for this session only.
  }
}

/** Species that appear in the game, in era order, with the era each first appears in. */
function catalog() {
  return speciesByEra().flatMap((ids, era) => ids.map((id) => ({ sp: SPECIES[id], era })));
}

/** How many of the game's species this browser has discovered. */
export function progress(discovered) {
  const all = catalog();
  return { found: all.filter(({ sp }) => discovered.has(sp.id)).length, total: all.length };
}

// ── Thumbnails ────────────────────────────────────────────────────────────

let thumbRenderer = null;
const thumbs = new Map();

/** A transparent PNG of the species' model; undiscovered ones as a flat silhouette. */
function thumbnail(sp, locked) {
  const key = `${sp.id}:${locked}`;
  if (thumbs.has(key)) return thumbs.get(key);
  if (!thumbRenderer) {
    thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    thumbRenderer.setPixelRatio(1);
    thumbRenderer.setSize(240, 180);
  }
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(3, 5, 4);
  scene.add(sun);
  if (locked) scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0x24323e });

  const obj = sp.build();
  scene.add(obj);
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  const camera = new THREE.PerspectiveCamera(35, 240 / 180, 0.01, 1000);
  const dist = radius / Math.sin((35 / 2) * (Math.PI / 180)) * 0.85;
  camera.position.copy(center).add(new THREE.Vector3(0.85, 0.45, 1).normalize().multiplyScalar(dist));
  camera.lookAt(center);

  thumbRenderer.render(scene, camera);
  const url = thumbRenderer.domElement.toDataURL('image/png');
  obj.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) [].concat(o.material).forEach((m) => m.dispose());
  });
  scene.overrideMaterial?.dispose();
  thumbs.set(key, url);
  return url;
}

/** Fill thumbnails a few per frame so the page opens instantly. */
function fillThumbnails(root) {
  const imgs = [...root.querySelectorAll('img[data-thumb]')];
  const step = () => {
    if (!root.isConnected) return;
    for (const img of imgs.splice(0, 6)) img.src = thumbnail(SPECIES[img.dataset.thumb], img.dataset.locked === '1');
    if (imgs.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ── Pages ─────────────────────────────────────────────────────────────────

function listHTML(discovered) {
  const all = catalog();
  const { found, total } = progress(discovered);
  const sections = ERAS.map((era, i) => {
    const tiles = all.filter((s) => s.era === i).map(({ sp }) => (discovered.has(sp.id)
      ? `<button class="codex-tile" data-id="${sp.id}"><img data-thumb="${sp.id}" data-locked="0" alt=""><span>${sp.name}</span></button>`
      : `<div class="codex-tile locked" title="Not discovered yet"><img data-thumb="${sp.id}" data-locked="1" alt=""><span>???</span></div>`)).join('');
    return tiles && `<h3 class="codex-era">${era.name} <span>${fmtMya(era.mya)}</span></h3><div class="codex-grid">${tiles}</div>`;
  }).join('');
  return `
    <div class="codex">
      <div class="codex-head">
        <button class="codex-back" id="codex-close">← Back</button>
        <h2>📖 Prehistory Encyclopedia</h2>
        <span class="codex-count">${found} / ${total} discovered</span>
      </div>
      <p class="codex-hint">Get close to a species while playing to discover it.</p>
      ${sections}
    </div>`;
}

function entryHTML(sp) {
  const e = ENTRIES[sp.id];
  return `
    <div class="codex codex-entry">
      <div class="codex-head">
        <button class="codex-back" id="codex-list">← All species</button>
      </div>
      <img class="codex-hero" data-thumb="${sp.id}" data-locked="0" alt="${sp.name}">
      <h2>${sp.name}</h2>
      <dl class="codex-stats">
        <div><dt>🕰️ Lived</dt><dd>${e.lived}</dd></div>
        <div><dt>📏 Size</dt><dd>${e.size}</dd></div>
        <div><dt>🍽️ Diet</dt><dd>${e.diet}</dd></div>
      </dl>
      <h3>Facts</h3>
      <ul class="codex-facts">${[sp.fact, ...e.facts].map((f) => `<li>${f}</li>`).join('')}</ul>
    </div>`;
}

/** Open the encyclopedia over the title screen; `onClose` returns to it. */
export function openEncyclopedia(discovered, onClose) {
  const showList = () => {
    showModal(listHTML(discovered), { wide: true, buttons: { '#codex-close': onClose } });
    const root = document.querySelector('#modal-content .codex');
    root.querySelectorAll('.codex-tile[data-id]').forEach((el) => el.addEventListener('click', () => showEntry(el.dataset.id)));
    fillThumbnails(root);
  };
  const showEntry = (id) => {
    showModal(entryHTML(SPECIES[id]), { wide: true, buttons: { '#codex-list': showList } });
    fillThumbnails(document.querySelector('#modal-content .codex'));
  };
  showList();
}
