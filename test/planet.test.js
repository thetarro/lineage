// Alien worlds: planets generated from a seed, with their own eras and extinctions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import { CHOICES, ERAS, EVENTS, TRAIT_NAMES } from '../src/data.js';
import { generatePlanet, alienPlanet, planetName, playRandomGame, seededRandom, randomSeed, cleanSeed, FAIR_SURVIVAL } from '../src/planet.js';
import { runRecord } from '../src/gallery.js';

const SEEDS = ['7F3K', 'ABCD', 'ZZZZ', 'Q2W8', 'HELLO', 'M4X9'];
const KNOWN_TAGS = new Set(Object.entries(CHOICES).flatMap(([id, c]) => [id, ...(c.tags ?? [])]));

test('the same seed always makes the same planet', () => {
  for (const seed of SEEDS) assert.deepEqual(alienPlanet(seed), alienPlanet(seed));
  assert.equal(planetName('7F3K'), alienPlanet('7F3K').name, 'the name preview matches the planet');
  assert.equal(new Set(SEEDS.map(planetName)).size, SEEDS.length, 'different seeds, different planets');
  assert.equal(cleanSeed(' 7f3k '), '7F3K');
  assert.match(randomSeed(seededRandom('x')), /^[A-Z2-9]{4}$/);
});

test('rerolling a planet for fairness keeps its name and colors', () => {
  const a = generatePlanet('7F3K', 0), b = generatePlanet('7F3K', 5);
  assert.deepEqual([a.name, a.sun, a.sea, a.land], [b.name, b.sun, b.sea, b.land]);
});

test('alien eras keep Earth forks, with their own names, dates and extinctions', () => {
  for (const seed of SEEDS) {
    const p = alienPlanet(seed);
    assert.equal(p.eras.length, ERAS.length);
    p.eras.forEach((era, i) => {
      assert.equal(era.forks, ERAS[i].forks, 'the evolution tree is unchanged');
      assert.ok(era.name && era.blurb && !era.blurb.includes('{'), `${seed} era ${i} has text`);
      assert.ok(p.events[era.event], `${seed} era ${i} has an extinction`);
      if (i > 0) assert.ok(era.mya < p.eras[i - 1].mya, 'eras run forward in time');
      const ev = p.events[era.event];
      assert.ok(ev.mya < era.mya && ev.mya > (p.eras[i + 1]?.mya ?? 0), `${seed} era ${i}: the extinction ends its era`);
      assert.ok(EVENTS[ev.look], `${seed}: "${ev.look}" is a disaster the world can show`);
    });
    assert.equal(new Set(Object.values(p.events).map((e) => e.name)).size, ERAS.length, `${seed}: every extinction has its own name`);
  }
});

test('every alien extinction has a counter, and only asks for things that exist', () => {
  for (const seed of SEEDS) {
    for (const ev of Object.values(alienPlanet(seed).events)) {
      assert.ok(ev.mods.some((m) => m.value > 0), `${ev.name} has something that helps`);
      assert.ok(ev.base > 0 && ev.base < 1);
      for (const m of ev.mods) {
        if (m.tag) assert.ok(KNOWN_TAGS.has(m.tag), `${ev.name}: unknown tag "${m.tag}"`);
        if (m.trait) assert.ok(TRAIT_NAMES[m.trait.name], `${ev.name}: unknown trait "${m.trait.name}"`);
        if (m.line) assert.ok(['carnivore', 'omnivore', 'herbivore'].includes(m.line));
        if (m.habitat) assert.ok(['aquatic', 'terrestrial'].includes(m.habitat));
        assert.ok(m.label && !m.label.includes('{'));
      }
    }
  }
});

test('alien planets are hard but beatable', () => {
  for (const seed of SEEDS) {
    const p = alienPlanet(seed);
    assert.ok(p.survivalRate >= FAIR_SURVIVAL[0] - 0.05 && p.survivalRate <= FAIR_SURVIVAL[1] + 0.05, `${seed}: ${p.survivalRate}`);
  }
});

test('whole games on alien planets finish cleanly, through the planet\'s own extinctions', () => {
  const planet = alienPlanet('7F3K');
  const rng = seededRandom('games');
  let survived = 0;
  for (let i = 0; i < 100; i++) {
    const g = playRandomGame(planet, rng);
    assert.ok(['extinct', 'survived'].includes(g.status));
    assert.equal(g.rival.planet, planet, 'the rival shares the planet');
    for (const h of g.history.filter((x) => x.kind === 'event')) assert.ok(planet.events[h.id], `${h.id} is one of the planet's`);
    if (g.status === 'survived') {
      survived++;
      assert.equal(G.lifespanMyr(g), planet.eras[0].mya);
    }
  }
  assert.ok(survived > 0);
});

test('Earth games are unchanged', () => {
  const g = G.createGame();
  assert.equal(g.planet, null);
  assert.equal(G.erasOf(g), ERAS);
  assert.equal(G.upcomingEvent(g), EVENTS.greatOxidation);
});

test('a finished alien game remembers its planet for the gallery', () => {
  const planet = alienPlanet('ABCD');
  const run = runRecord(playRandomGame(planet, seededRandom('run')));
  assert.equal(run.planet.name, planet.name);
  assert.equal(run.planet.seed, 'ABCD');
  assert.deepEqual(run.planet.eras.map((e) => e.name), planet.eras.map((e) => e.name));
  assert.ok(JSON.parse(JSON.stringify(run)), 'it must survive being stored as JSON');
});
