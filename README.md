# Lineage

*Every species goes extinct. How long will yours last?*

A 3D evolution game in the browser. Start as a single cell in the primordial seas and steer your species through seven eras of Earth's history: choose how to feed, what body to build, whether to leave the water, and which mutations to keep. Six mass extinctions stand in the way, from the Great Oxidation to the Ice Age, and the traits you picked eras earlier decide whether you survive them.

## Play

```sh
npm start
```

Then open http://localhost:8000. There is no build step. Three.js loads from a CDN, so you need an internet connection.

**Controls:** joystick (bottom right) or WASD to move · Space/Shift to rise and sink in water or the air · drag to orbit the camera · scroll to zoom · M to mute.

## How it works

- **Eras and forks:** each era opens with a major evolutionary choice (carnivore/omnivore/herbivore, shell or speed, exoskeleton or spine, land or sea…), followed by generations where you pick minor mutations, including diet specializations from generalist to hyper-specialist.
- **Survival meters:** food, water and oxygen drain each generation. Let one run dry and your population shrinks.
- **Mass extinctions:** each one is foreshadowed during its era. Survival depends on your traits, and the result screen shows exactly what helped and what hurt.
- **Era life:** the world is populated with real prehistoric species of each era, from trilobites and Anomalocaris to sauropods and mammoths. Get close to one to learn about it.
- **Music and sound:** generated in code with the Web Audio API, so there are no audio files.

## Code

| File | Purpose |
|---|---|
| `src/data.js` | Game content: eras, choices, diets, extinction events (most balancing happens here) |
| `src/game.js` | Rules and simulation, no rendering (runs in Node) |
| `src/world.js` | Three.js scene, player creature builder, disaster effects |
| `src/fauna.js` | Prehistoric animals and plants for each era |
| `src/audio.js` | Procedural music and sound effects |
| `src/controls.js` | Joystick and keyboard input |
| `src/ui.js`, `src/main.js` | HUD, cards, timeline and game flow |
