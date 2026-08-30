// Backend data access: /api/events, /api/quotes, /api/photos.
//
// No loader ever invents content: a fabricated gathering would be worse than a
// blank calendar, because someone would show up to it. What they do instead is
// report the difference between "nothing scheduled" and "we could not reach the
// server" — an empty array for the first, null for the second — so the views
// can tell the visitor which one they are looking at.

async function getJson(url) {
  try {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// null means "could not load", which is not the same thing as an empty
// calendar: one is our problem, the other is just a quiet week. The views say
// different things for each, so the distinction has to survive the loader.
export async function loadEvents() {
  const d = await getJson('/api/events');
  return Array.isArray(d) ? d : null;
}

// Random 3 quotes per visit, mapped into the shape the Quote card expects.
// null on failure, same reasoning as loadEvents.
export async function loadVoices() {
  const d = await getJson('/api/quotes');
  if (!Array.isArray(d)) return null;
  const pool = d.map((q) => ({
    tone: q.tone, name: q.name, detail: q.detail,
    quote: q.body, monogram: q.monogram, avatar: q.avatar,
  }));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

// Rotating photos by slot. /api/photos returns arrays per slot; we pick a random
// hero/join for this visit (that's the "rotation") and pass gallery through
// as an array. Empty slots fall back to the baked-in images in app.js.
export async function loadPhotos() {
  const raw = (await getJson('/api/photos')) || {};
  const pick = (arr) => (Array.isArray(arr) && arr.length
    ? arr[Math.floor(Math.random() * arr.length)].url
    : null);
  return {
    hero: pick(raw.hero),
    join: pick(raw.join),
    gallery: Array.isArray(raw.gallery) ? raw.gallery : [],
  };
}
