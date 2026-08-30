#!/usr/bin/env node
// index.html ships a static copy of the hero — a real <h1> and the intro copy —
// so that a crawler which never runs JS, and a visitor on a slow connection,
// both get something. app.js overwrites it on first render.
//
// That means the hero markup is written out twice, on purpose. The words are
// not: they live in assets/js/data.js. This asserts index.html still says the
// same thing. Worth automating because the failure is silent — the site looks
// perfect while Google reads copy you retired months ago.
//
// Run: node tools/check-static-hero.mjs

import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');

// data.js is loaded through a data: URL rather than imported by path because
// the repo has no package.json, so Node would treat a bare .js as CommonJS and
// choke on its `export`. data.js imports nothing itself, so this is safe.
const src = readFileSync(new URL('assets/js/data.js', root), 'utf8');
const { HERO, NAV } = await import(
  'data:text/javascript;base64,' + Buffer.from(src).toString('base64')
);

const expected = [
  ['hero eyebrow', HERO.eyebrow],
  ['hero title (first line)', HERO.titleLead],
  ['hero title (script word)', HERO.titleScript],
  ['hero lead paragraph', HERO.lead],
  ['hero CTA label', HERO.cta],
  ['hero image', HERO.image],
  ['hero image alt text', HERO.imageAlt],
  ...NAV.map(([route, label]) => [`nav label "${label}"`, label]),
  ...NAV.map(([route]) => [`nav route "${route}"`, `data-nav="${route}"`]),
];

const missing = expected.filter(([, value]) => !html.includes(value));

if (missing.length) {
  console.error('\nindex.html has drifted from assets/js/data.js.\n');
  console.error('Its static hero is missing:\n');
  for (const [what, value] of missing) console.error(`  ${what}\n    expected: ${value}\n`);
  console.error('Update the static block inside #app in index.html to match.\n');
  process.exit(1);
}

console.log(`static hero in sync with data.js (${expected.length} strings checked)`);
