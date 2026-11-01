// Every species in the world has complete encyclopedia data.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES, speciesByEra, lifeFor } from '../src/species.js';
import { ENTRIES } from '../src/encyclopedia-entries.js';
import { ERAS } from '../src/data.js';

const inGame = new Set(speciesByEra().flat());

test('every species listed in an era is defined', () => {
  for (let era = 0; era < ERAS.length; era++) {
    for (const habitat of ['water', 'land']) {
      for (const [id, count] of lifeFor(era, habitat)) {
        assert.ok(SPECIES[id], `era ${era} ${habitat}: unknown species "${id}"`);
        assert.ok(count > 0, `era ${era} ${habitat}: "${id}" has count ${count}`);
      }
    }
  }
});

test('every defined species appears in some era', () => {
  for (const id of Object.keys(SPECIES)) assert.ok(inGame.has(id), `species "${id}" never appears in the world`);
});

test('every species has a name, kind and encounter fact', () => {
  for (const [id, sp] of Object.entries(SPECIES)) {
    assert.ok(sp.name && sp.kind && sp.fact, `species "${id}" is missing a name, kind or fact`);
  }
});

test('every species has a complete encyclopedia entry', () => {
  for (const id of inGame) {
    const e = ENTRIES[id];
    assert.ok(e, `no encyclopedia entry for "${id}"`);
    for (const field of ['lived', 'size', 'diet']) assert.ok(e[field], `"${id}" has no ${field}`);
    assert.ok(e.facts?.length >= 2 && e.facts.every(Boolean), `"${id}" needs at least two facts`);
  }
});

test('every encyclopedia entry belongs to a species in the game', () => {
  for (const id of Object.keys(ENTRIES)) assert.ok(inGame.has(id), `entry "${id}" has no species in the game`);
});
