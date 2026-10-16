// The /survey page — the follow-up survey emailed the morning after a
// gathering. The ?t= token in the link says who it's for; the questions are
// the shared set edited on the admin's Survey tab. With &optout=1 (the link
// at the foot of every survey email) it asks to stop feedback emails instead.
import { esc } from './util.js';

const view = document.getElementById('view');
const params = new URLSearchParams(location.search);
const token = params.get('t') || '';

const message = (title, lead) => {
  view.innerHTML = `<h1 class="page-title">${esc(title)}</h1>
    <p class="page-lead">${esc(lead)}</p>
    <p class="page-fine"><a href="/">Back to the website</a></p>`;
};

const radios = (q, values, labels, col) => `
  <div class="s-opts${col ? ' s-opts--col' : ''}">
    ${values.map((v, i) => `<label class="s-opt"><input type="radio" name="q${q.id}" value="${esc(v)}"><span>${esc(labels[i])}</span></label>`).join('')}
  </div>`;

function control(q) {
  const name = `q${q.id}`;
  switch (q.kind) {
    case 'rating':
      return radios(q, ['1', '2', '3', '4', '5'], ['1', '2', '3', '4', '5'])
        + '<div class="s-scale" aria-hidden="true"><span>Not great</span><span>Loved it</span></div>';
    case 'yesno': return radios(q, ['yes', 'no'], ['Yes', 'No']);
    case 'choice': return radios(q, q.options, q.options, true);
    case 'longtext': return `<textarea class="s-input" id="${name}" name="${name}" maxlength="2000"></textarea>`;
    default: return `<input class="s-input" type="text" id="${name}" name="${name}" maxlength="2000">`;
  }
}

// Text controls get a real <label for>; radio groups are a fieldset whose
// legend names them.
function questionHTML(q) {
  const req = q.required ? ' <span class="s-req" aria-hidden="true">*</span>' : '';
  const grouped = ['rating', 'yesno', 'choice'].includes(q.kind);
  return grouped
    ? `<fieldset class="s-q" data-q="${q.id}"><legend class="s-label">${esc(q.label)}${req}</legend>${control(q)}</fieldset>`
    : `<div class="s-q" data-q="${q.id}"><label class="s-label" for="q${q.id}">${esc(q.label)}${req}</label>${control(q)}</div>`;
}

const valueOf = (form, q) => {
  const el = form.querySelector(`[name="q${q.id}"]:is(:checked, textarea, input:not([type=radio]))`);
  return el ? el.value.trim() : '';
};

function render(data) {
  view.innerHTML = `
    <h1 class="page-title">How was it${data.firstName ? ', ' + esc(data.firstName) : ''}?</h1>
    <p class="page-lead">Thanks for coming to <b>${esc(data.eventTitle)}</b>. A couple of minutes of
      honest feedback helps us make the next one better.</p>
    <form id="f" novalidate>
      ${data.questions.map(questionHTML).join('')}
      <button type="submit" class="page-btn page-btn--full" id="go">Send my answers</button>
    </form>
    <p class="page-fine"><a href="?t=${encodeURIComponent(token)}&optout=1">Stop sending me feedback emails</a></p>`;

  const form = document.getElementById('f');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.querySelectorAll('.u-err').forEach((n) => n.remove());
    form.querySelectorAll('.s-q.err').forEach((n) => n.classList.remove('err'));

    const answers = {};
    const missing = [];
    for (const q of data.questions) {
      answers[q.id] = valueOf(form, q);
      if (q.required && !answers[q.id]) missing.push(q.id);
    }
    if (missing.length) return fail(form, 'Please answer the questions marked *.', missing);

    const btn = document.getElementById('go');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const r = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, answers }),
      });
      const d = await r.json().catch(() => null);
      if (d && d.error === 'already_answered') return thanks();
      if (!r.ok || !d || !d.ok) {
        btn.disabled = false; btn.textContent = 'Send my answers';
        return fail(form, 'Please check your answers and try again.', d && d.question ? [d.question] : []);
      }
      thanks();
    } catch {
      btn.disabled = false; btn.textContent = 'Send my answers';
      fail(form, 'We couldn’t reach the server. Check your connection and try again.', []);
    }
  });
}

function fail(form, msg, ids) {
  ids.forEach((id) => { const n = form.querySelector(`[data-q="${id}"]`); if (n) n.classList.add('err'); });
  const p = document.createElement('p');
  p.className = 'u-err';
  p.setAttribute('role', 'alert');
  p.textContent = msg;
  form.appendChild(p);
  const first = ids.length && form.querySelector(`[data-q="${ids[0]}"]`);
  if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Nothing changes on page load — scanners and prefetchers follow links in
// email — so opting out takes one confirming click.
function optoutMode() {
  view.innerHTML = `
    <h1 class="page-title">No more feedback emails?</h1>
    <p class="page-lead">We'll stop sending you surveys after gatherings. You'll still get
      the details for any gathering you RSVP to.</p>
    <button type="button" class="page-btn page-btn--full" id="go">Yes, stop feedback emails</button>
    <p class="page-fine"><a href="?t=${encodeURIComponent(token)}">No thanks, take me to the survey</a></p>`;
  document.getElementById('go').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'One moment…';
    try {
      const r = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, action: 'optout' }),
      });
      const d = await r.json().catch(() => null);
      if (r.status === 404) return message('Link not recognised', 'This link doesn’t work any more. Email contact@ingreatcompanysav.com and we’ll take you off by hand.');
      if (!r.ok || !d || !d.ok) throw new Error();
      message('Done', 'You won’t get any more feedback surveys from us.');
    } catch {
      btn.disabled = false; btn.textContent = 'Yes, stop feedback emails';
      fail(view, 'That didn’t go through. Please try again in a moment.', []);
    }
  });
}

const thanks = () => message('Thank you!', 'Your answers are in. We read every one — see you at the next gathering.');

async function start() {
  if (!token) return message('Survey link missing', 'This page needs the link from your survey email. Try clicking it again.');
  if (params.get('optout')) return optoutMode();
  try {
    const r = await fetch('/api/survey?t=' + encodeURIComponent(token));
    if (r.status === 404) return message('Link not recognised', 'This survey link doesn’t work any more. Thanks for thinking of us all the same.');
    const d = await r.json();
    if (!d.ok) throw new Error(d.error);
    if (d.answered) return message('Already answered', 'You’ve already sent your answers for this gathering — thank you!');
    render(d);
  } catch {
    message('Something went wrong', 'We couldn’t load the survey just now. Please try the link again in a moment.');
  }
}

start();
