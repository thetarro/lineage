# Lineage

*Every species goes extinct. How long will yours last?*

A 3D evolution game in the browser. Start as a single cell in the primordial seas and steer your species through seven eras of Earth's history: choose how to feed, what body to build, whether to leave the water, and which mutations to keep. Seven mass extinctions stand in the way, from the Great Oxidation to the Ice Age, and the traits you picked eras earlier decide whether you survive them.

## Play

```sh
npm start
```

Then open http://localhost:8000. There is no build step. Three.js loads from a CDN, so you need an internet connection.

**Controls:** joystick (bottom right) or WASD to move · Space/Shift to rise and sink in water or the air · drag to orbit the camera · scroll to zoom · M to mute.

## How it works

- **Eras and forks:** each era opens with a major evolutionary choice (carnivore/omnivore/herbivore, shell or speed, exoskeleton, spine or tentacles, land or sea…), followed by generations where you pick minor mutations, including diet specializations from generalist to hyper-specialist.
- **Branches:** vertebrates on land (cold- or warm-blooded, then fur, feathers, flight or intelligence), arthropods on land (insects or arachnids), amphibians at the water's edge (who may become reptiles), cephalopods (ammonites or squid), and sea life in the deep or on reefs, which may even take to the air as gliders.
- **Your lineage today:** the ending screen names the real living group your lineage resembles, and every finished game is kept in the past lineages gallery, with records to beat.
- **Survival meters:** food, water and oxygen drain each generation. Let one run dry and your population shrinks.
- **Predators:** from the second era on, predators take a share of your population every generation. Defense, and to a lesser degree size, cut their toll; a well-armored species is left alone. From Body Plans on, a real predator of the era sometimes hunts you (marked in red): outrun it with Speed, or trust your armor. Nothing chases you while you choose a mutation.
- **Traits you can feel:** burrowers keep still to dig in and lose a predator, flyers rise out of a land predator's reach, Camouflage halves how often hunts start, and Keen Eyes see farther and meet species from farther away.
- **A rival lineage:** another species evolves alongside yours, often following your forks. Where you share a habitat and your diets overlap, it takes part of your food each generation and its members (marked in orange) race you to the food in the world. It faces the same extinctions.
- **Day and night on land:** cold-blooded species slow down at night. Warm-blooded ones have an Energy meter that drains in real time and refills with each bite of food; run out and your kind weaken until you eat.
- **Amphibians:** a species at the water's edge has a Skin meter that drains in real time on land. A warning appears when it falls below 50%. Wade back into a lake to wet it again; dried out, your kind die off until you do. Water Retention slows it, and a shelled egg (reptiles) ends the need.
- **Foraging:** food that suits your diet is scattered around the world. Swim or walk to it to top up your Food meter, up to a limit per generation.
- **Mass extinctions:** each one is foreshadowed during its era, and choice cards flag what clearly helps or hurts against it. Survival depends on your traits, and the result screen shows exactly what helped and what hurt.
- **Era life:** the world is populated with real prehistoric species of each era, from trilobites and Anomalocaris to sauropods and mammoths. Get close to one to learn about it and add it to the prehistory encyclopedia, which also hints where to find the ones you have not met yet.
- **Music and sound:** generated in code with the Web Audio API, so there are no audio files.

## Code

| File | Purpose |
|---|---|
| `src/data.js` | Game content: eras, choices, diets, extinction events (most balancing happens here) |
| `src/game.js` | Rules and simulation, no rendering (runs in Node) |
| `src/world.js` | Three.js scene, player creature builder, disaster effects |
| `src/species.js` | Prehistoric species and which ones live in each era (data only) |
| `src/fauna.js` | 3D models of the prehistoric animals and plants |
| `src/encyclopedia.js`, `src/encyclopedia-entries.js` | The prehistory encyclopedia page, and its content for every species |
| `src/audio.js` | Procedural music and sound effects |
| `src/controls.js` | Joystick and keyboard input |
| `src/ui.js`, `src/main.js` | HUD, cards, timeline and game flow |
| `serve.py` | Local dev server used by `npm start` (disables browser caching) |

## Testing

```sh
npm test          # game rules and content, in Node (no install needed)
npm run test:ui   # plays the real game in headless Chromium (~2 minutes)
```

`npm test` runs the files in `test/*.test.js` with Node's built-in test runner. They check that every lineage gets a fork in every era, that all content references are valid, the rules for mutations, diets and extinction events, and 500 random full games.

`npm run test:ui` needs Python Playwright (`pip install playwright && playwright install chromium`) and an internet connection for Three.js. It checks the title screen, the encyclopedia (locking, discovering, entries), the arthropod branch, a full game and the phone layout.

## Workflow

This project does not use pull requests or manual merges: commit directly to `main`.
