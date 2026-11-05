// Past lineages: what a finished game records, and the records to beat.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import { runRecord, records, runLook } from '../src/gallery.js';

function finishedGame(ids, name) {
  const g = G.createGame({ name });
  for (const id of ids) {
    G.applyChoice(g, id, 'fork');
    G.advanceEra(g);
  }
  return g;
}

test('a run record keeps what the gallery and its timeline need', () => {
  const g = finishedGame(['omnivore', 'shell', 'exoskeleton', 'goLand', 'arachnid', 'silk', 'diapause'], 'Testus maximus');
  const run = runRecord(g, 1000);
  assert.equal(run.name, 'Testus maximus');
  assert.equal(run.won, true);
  assert.equal(run.date, 1000);
  assert.equal(run.lifespan, Math.round(G.lifespanMyr(g)));
  assert.deepEqual(run.descendant, { icon: '🕷️', name: 'Spiders' });
  assert.equal(run.history.length, g.history.length);
  assert.deepEqual(run.look, { tags: [...g.tags], line: 'omnivore', size: g.traits.size, era: g.era });
  assert.ok(JSON.parse(JSON.stringify(run)), 'it must survive being stored as JSON');
});

test('runs saved before portraits existed get their look back from their choices', () => {
  const g = finishedGame(['herbivore', 'speed', 'spine', 'goLand', 'warmBlooded', 'fur', 'intelligence'], 'Oldus');
  G.applyChoice(g, 'giant', 'minor');
  const run = runRecord(g);
  const old = JSON.parse(JSON.stringify({ ...run, look: undefined }));
  assert.equal(old.look, undefined);
  assert.deepEqual(runLook(old), run.look);
});

test('records pick the best runs, and handle having none', () => {
  assert.deepEqual(records([]), { played: 0, won: 0, longest: null, mostSurvived: null, largest: null });
  const runs = [
    { name: 'a', won: false, lifespan: 100, survived: 1, peak: 5000 },
    { name: 'b', won: true, lifespan: 3800, survived: 7, peak: 3000 },
    { name: 'c', won: false, lifespan: 900, survived: 2, peak: 9000 },
  ];
  const r = records(runs);
  assert.equal(r.played, 3);
  assert.equal(r.won, 1);
  assert.equal(r.longest.name, 'b');
  assert.equal(r.mostSurvived.name, 'b');
  assert.equal(r.largest.name, 'c');
});
