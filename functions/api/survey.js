// /api/survey — the public half of the follow-up survey. The ?t= token from
// the emailed link is the only credential: 128 random bits, one per person per
// gathering, so no login or Turnstile (same reasoning as /api/unsubscribe).
//
//   GET  ?t=<token>          who it's for, which gathering, and the questions
//   POST { token, answers }  answers = { <question id>: value }. Accepted once.
import { json } from '../_shared/db.js';

const MAX_TEXT = 2000;

const findSurvey = (env, token) =>
  env.DB.prepare(
    `SELECT s.id, s.first_name, s.answered_at, e.title
       FROM surveys s LEFT JOIN events e ON e.id = s.event_id
      WHERE s.token = ?`
  ).bind(token).first();

const activeQuestions = async (env) => {
  const { results } = await env.DB.prepare(
    'SELECT id, label, kind, options, required FROM survey_questions WHERE active = 1 ORDER BY sort_order ASC, id ASC'
  ).all();
  return (results || []).map((q) => ({
    id: q.id,
    label: q.label,
    kind: q.kind,
    options: q.kind === 'choice' ? splitOptions(q.options) : [],
    required: !!q.required,
  }));
};

const splitOptions = (s) => String(s || '').split('\n').map((o) => o.trim()).filter(Boolean);

export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get('t') || '';
  if (!token) return json({ ok: false, error: 'token_required' }, 400);
  const s = await findSurvey(env, token);
  if (!s) return json({ ok: false, error: 'not_found' }, 404);
  return json({
    ok: true,
    firstName: s.first_name || '',
    eventTitle: s.title || 'the gathering',
    answered: !!s.answered_at,
    questions: s.answered_at ? [] : await activeQuestions(env),
  });
}

// Checks one answer against its question's kind. Returns the cleaned value,
// '' for a blank answer, or undefined when the value isn't allowed.
function clean(q, v) {
  const t = v == null ? '' : String(v).trim();
  if (t === '') return '';
  switch (q.kind) {
    case 'rating': return /^[1-5]$/.test(t) ? Number(t) : undefined;
    case 'yesno': return t === 'yes' || t === 'no' ? t : undefined;
    case 'choice': return q.options.includes(t) ? t : undefined;
    default: return t.slice(0, MAX_TEXT);
  }
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  const token = String(body.token || '').trim();
  if (!token) return json({ ok: false, error: 'token_required' }, 400);
  const s = await findSurvey(env, token);
  if (!s) return json({ ok: false, error: 'not_found' }, 404);
  if (s.answered_at) return json({ ok: false, error: 'already_answered' }, 409);

  const given = body.answers && typeof body.answers === 'object' ? body.answers : {};
  const answers = [];
  for (const q of await activeQuestions(env)) {
    const a = clean(q, given[q.id]);
    if (a === undefined) return json({ ok: false, error: 'invalid_answer', question: q.id }, 400);
    if (a === '' && q.required) return json({ ok: false, error: 'answer_required', question: q.id }, 400);
    answers.push({ id: q.id, label: q.label, answer: a });
  }

  // `answered_at IS NULL` makes a double-click or a second tab a no-op rather
  // than an overwrite.
  const res = await env.DB.prepare(
    `UPDATE surveys SET answers = ?, answered_at = datetime('now')
      WHERE id = ? AND answered_at IS NULL`
  ).bind(JSON.stringify(answers), s.id).run();
  if (!res.meta || !res.meta.changes) return json({ ok: false, error: 'already_answered' }, 409);

  return json({ ok: true });
}
