// Backend data access. Mirrors the original bundle: fetch /api/events and
// /api/quotes, fall back to the static arrays when the API is unavailable
// (e.g. previewing the static files without the Pages Functions runtime).
import { FALLBACK_EVENTS, FALLBACK_VOICES } from './data.js';

async function getJson(url) {
  try {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d) && d.length ? d : null;
  } catch {
    return null;
  }
}

export async function loadEvents() {
  const d = await getJson('/api/events');
  return d || FALLBACK_EVENTS;
}

// Random 3 quotes per visit, mapped into the shape the Quote card expects.
export async function loadVoices() {
  const d = await getJson('/api/quotes');
  const pool = d
    ? d.map(q => ({ tone: q.tone, name: q.name, detail: q.detail, quote: q.body, monogram: q.monogram, avatar: q.avatar }))
    : FALLBACK_VOICES.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

// Rotating photos by slot. /api/photos returns arrays per slot; we pick a random
// hero/story/join for this visit (that's the "rotation") and pass gallery through
// as an array. Empty slots fall back to the baked-in images in app.js.
export async function loadPhotos() {
  let raw = {};
  try {
    const r = await fetch('/api/photos', { headers: { accept: 'application/json' } });
    if (r.ok) raw = await r.json();
  } catch {
    raw = {};
  }
  const pick = (arr) => (Array.isArray(arr) && arr.length
    ? arr[Math.floor(Math.random() * arr.length)].url
    : null);
  return {
    hero: pick(raw.hero),
    story: pick(raw.story),
    join: pick(raw.join),
    gallery: Array.isArray(raw.gallery) ? raw.gallery : [],
  };
}
