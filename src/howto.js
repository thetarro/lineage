// How to play: a few cards shown the first time a game begins, and from the title screen.

import { showModal } from './ui.js';

const STORE = 'lineage.howto';

const PAGES = [
  {
    icon: '🧬', title: 'Evolve',
    points: [
      'Each era opens with a <b>major fork</b>: how you feed, what body you build, whether you leave the water.',
      'Every generation brings a <b>mutation</b> to choose. Cards show what each choice changes.',
      'Your choices decide which branch of life you become, and what your lineage resembles today.',
    ],
  },
  {
    icon: '🍖', title: 'Survive',
    points: [
      '<b>Food, Water and Oxygen</b> drain every generation. If one runs dry, your population shrinks.',
      'Swim or walk to <b>food</b> in the world to top up your Food meter.',
      '<b>Predators</b> (marked in red) hunt you: flee, or trust your armor. Burrowers can keep still to dig in, and flyers can rise out of reach.',
      'On land, <b>night</b> falls: cold blood slows you down, warm blood burns Energy, and amphibians must keep their skin wet.',
    ],
  },
  {
    icon: '☄️', title: 'Outlast',
    points: [
      'Most eras end in a <b>mass extinction</b>. Watch the signs of change, and the cards that help or hurt against it.',
      'Just before it strikes, make a <b>last stand</b>: endure, hide and wait, or breed fast.',
      'A <b>rival lineage</b> (marked in orange) competes for your food. Get there first or, as a bigger carnivore, hunt it.',
    ],
  },
];

export function seenHowTo() {
  try {
    return localStorage.getItem(STORE) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(STORE, '1');
  } catch {
    // Storage blocked (private mode, previews): it shows again next time.
  }
}

function pageHTML(i, doneLabel) {
  const p = PAGES[i];
  const last = i === PAGES.length - 1;
  return `
    <div class="howto">
      <div class="howto-step">How to play · ${i + 1} of ${PAGES.length}</div>
      <div class="event-icon">${p.icon}</div>
      <h2>${p.title}</h2>
      <ul>${p.points.map((t) => `<li>${t}</li>`).join('')}</ul>
      <div class="howto-dots">${PAGES.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="howto-buttons">
        ${i > 0 ? '<button class="secondary" id="howto-back">← Back</button>' : '<button class="secondary" id="howto-skip">Skip</button>'}
        <button class="primary" id="${last ? 'howto-done' : 'howto-next'}">${last ? doneLabel : 'Next →'}</button>
      </div>
    </div>`;
}

/** Walk through the cards; `onDone` runs when the player finishes or skips. */
export function openHowTo(onDone, { doneLabel = 'Got it' } = {}) {
  markSeen();
  const show = (i) => showModal(pageHTML(i, doneLabel), {
    buttons: {
      '#howto-next': () => show(i + 1),
      '#howto-back': () => show(i - 1),
      '#howto-skip': onDone,
      '#howto-done': onDone,
    },
  });
  show(0);
}
