// Game content is consistent: every reference in data.js points at something that exists.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHOICES, ERAS, EVENTS, START } from '../src/data.js';
import { VERSION } from '../src/version.js';

const forkIds = new Set(ERAS.flatMap((e) => e.forks.flatMap((f) => f.options)));

// Every tag a lineage can ever carry: starting tags, choice ids and the tags choices add.
const producible = new Set([...START.tags, 'terrestrial', ...Object.keys(CHOICES), ...Object.values(CHOICES).flatMap((c) => c.tags ?? [])]);

test('every fork option is a defined choice', () => {
  for (const id of forkIds) assert.ok(CHOICES[id], `fork option "${id}" has no entry in CHOICES`);
});

test('every era event is a defined extinction event', () => {
  for (const era of ERAS) if (era.event) assert.ok(EVENTS[era.event], `${era.name}: unknown event "${era.event}"`);
});

test('requirements and event modifiers only mention tags a lineage can have', () => {
  const check = (where, tags = []) => {
    for (const t of tags) assert.ok(producible.has(t), `${where}: tag "${t}" can never be gained`);
  };
  for (const [id, c] of Object.entries(CHOICES)) {
    for (const key of ['requires', 'guaranteed']) {
      const r = c[key];
      if (r) for (const field of ['tags', 'anyTags', 'notTags']) check(`${id}.${key}.${field}`, r[field]);
    }
  }
  for (const era of ERAS) for (const f of era.forks) for (const field of ['tags', 'anyTags', 'notTags']) check(`${era.name} fork.${field}`, f.requires?.[field]);
  for (const [id, ev] of Object.entries(EVENTS)) for (const m of ev.mods) check(`${id} modifier "${m.label}"`, m.tag ? [m.tag] : []);
});

test('every choice has a name, icon and description', () => {
  for (const [id, c] of Object.entries(CHOICES)) {
    assert.ok(c.name && c.icon && c.desc, `choice "${id}" is missing a name, icon or description`);
  }
});

test('the version on the title screen matches package.json', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  assert.equal(VERSION, pkg.version);
});
