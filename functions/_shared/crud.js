// Generic list/create/update/delete over a resource declared in resources.js.
//
// Routing stays file-based and explicit — Pages maps a URL to a file, and each
// of those files is now a two-line re-export of the handlers built here.

import { json } from './db.js';
import { RESOURCES } from './resources.js';

const writable = (r) => r.fields.filter((f) => f.parse && !f.managed);

// Row -> response object. `admin` keeps the ordering/visibility columns; the
// public shape drops them.
function project(r, row, { admin }) {
  const out = { [r.id.column]: row[r.id.column] };
  for (const f of r.fields) {
    if (f.admin && !admin) continue;
    out[f.key] = row[f.col] ?? '';
  }
  for (const [key, fn] of Object.entries(r.derive || {})) out[key] = fn(row);
  return out;
}

// Body -> column values, with each field's own parser applied.
function parseBody(r, body) {
  const values = {};
  for (const f of writable(r)) values[f.col] = f.parse(body[f.key]);
  return values;
}

function firstMissing(r, values) {
  for (const f of writable(r)) {
    if (f.required && !values[f.col]) return f.required;
  }
  return null;
}

const readJson = async (request) => {
  try { return await request.json(); } catch { return null; }
};

// Append to the end when no explicit position was given.
async function nextSortOrder(env, r) {
  const row = await env.DB.prepare(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM ${r.table}`
  ).first();
  return row.n;
}

const castId = (r, id) => (r.id.numeric ? Number(id) : id);

const exists = (env, r, id) =>
  env.DB.prepare(`SELECT ${r.id.column} FROM ${r.table} WHERE ${r.id.column} = ?`)
    .bind(castId(r, id))
    .first();

/* ------------------------------------------------ /api/<resource> (public) */
export function publicList(name) {
  const r = RESOURCES[name];
  const select = ['*', r.publicSelect].filter(Boolean).join(', ');
  const where = r.publicWhere ? `WHERE ${r.publicWhere}` : '';
  const sql = `SELECT ${select} FROM ${r.table} ${where} ORDER BY ${r.order}`;

  return {
    async onRequestGet({ env }) {
      const { results } = await env.DB.prepare(sql).all();
      return json((results || []).map((row) => project(r, row, { admin: false })));
    },
  };
}

/* ------------------------------ /api/admin/<resource> — list + create */
export function collection(name) {
  const r = RESOURCES[name];

  return {
    async onRequestGet({ env }) {
      const { results } = await env.DB.prepare(
        `SELECT * FROM ${r.table} ORDER BY ${r.order}`
      ).all();
      return json((results || []).map((row) => project(r, row, { admin: true })));
    },

    async onRequestPost({ request, env }) {
      const body = await readJson(request);
      if (!body) return json({ ok: false, error: 'invalid_json' }, 400);

      const values = parseBody(r, body);

      // Events carry a client-chosen id, so it is parsed, required and checked
      // for collisions. Everything else autoincrements. Checked before the
      // other required fields, so a body missing both reports the id first.
      let id = null;
      if (r.id.fromBody) {
        id = String(body[r.id.column] || '').trim();
        if (!id) return json({ ok: false, error: r.id.required }, 400);
      }

      const missing = firstMissing(r, values);
      if (missing) return json({ ok: false, error: missing }, 400);

      if (id !== null) {
        if (await exists(env, r, id)) return json({ ok: false, error: 'duplicate_id' }, 409);
        values[r.id.column] = id;
      }

      if (!values.sort_order) values.sort_order = await nextSortOrder(env, r);

      const cols = Object.keys(values);
      const res = await env.DB.prepare(
        `INSERT INTO ${r.table} (${cols.join(', ')}, updated_at)
         VALUES (${cols.map(() => '?').join(',')}, datetime('now'))`
      ).bind(...cols.map((c) => values[c])).run();

      return json({ ok: true, id: id ?? (res.meta && res.meta.last_row_id) }, 201);
    },
  };
}

/* --------------------------- /api/admin/<resource>/:id — update + delete */
export function item(name) {
  const r = RESOURCES[name];

  return {
    async onRequestPut({ request, env, params }) {
      const body = await readJson(request);
      if (!body) return json({ ok: false, error: 'invalid_json' }, 400);

      const values = parseBody(r, body);
      const missing = firstMissing(r, values);
      if (missing) return json({ ok: false, error: missing }, 400);

      const id = castId(r, params.id);
      if (!(await exists(env, r, id))) return json({ ok: false, error: 'not_found' }, 404);

      const cols = Object.keys(values);
      await env.DB.prepare(
        `UPDATE ${r.table}
            SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now')
          WHERE ${r.id.column} = ?`
      ).bind(...cols.map((c) => values[c]), id).run();

      return json({ ok: true, id });
    },

    async onRequestDelete({ env, params }) {
      await env.DB.prepare(`DELETE FROM ${r.table} WHERE ${r.id.column} = ?`)
        .bind(castId(r, params.id))
        .run();
      return json({ ok: true });
    },
  };
}
