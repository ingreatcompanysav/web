// The RSVP modal. openRSVP({ eventId, title, guests, onSuccess }) opens it and
// posts to /api/rsvp.
//
// Built on <dialog>. showModal() supplies the modal semantics, the focus trap,
// Escape-to-close, the inert background and focus restore on close — all of
// which this file used to hand-roll. What is left is the form.
import { mountTurnstile } from './turnstile.js';

let dlg = null;
let ts = null;
let current = {};

function build() {
  dlg = document.createElement('dialog');
  dlg.className = 'rsvp';
  dlg.innerHTML = `
    <header class="rsvp__head">
      <div>
        <h2 class="rsvp__title">Save your seat</h2>
        <p class="rsvp__sub" data-igc="sub"></p>
      </div>
      <button type="button" class="rsvp__close" data-igc="close" aria-label="Close">&times;</button>
    </header>
    <form class="rsvp__form" data-igc="form">
      <div class="rsvp__row">
        <label class="rsvp__field">
          <span class="rsvp__label">First name</span>
          <input class="rsvp__input" name="firstName" type="text" autocomplete="given-name" required>
        </label>
        <label class="rsvp__field">
          <span class="rsvp__label">Last name</span>
          <input class="rsvp__input" name="lastName" type="text" autocomplete="family-name">
        </label>
      </div>
      <label class="rsvp__field">
        <span class="rsvp__label">Email <span class="rsvp__optional">(optional)</span></span>
        <input class="rsvp__input" name="email" type="email" autocomplete="email">
      </label>
      <label class="rsvp__field">
        <span class="rsvp__label">How many of you?</span>
        <input class="rsvp__input" name="guests" type="number" min="1" max="6" step="1" value="1">
      </label>
      <label class="rsvp__field">
        <span class="rsvp__label">Anything to add? <span class="rsvp__optional">(optional)</span></span>
        <textarea class="rsvp__input rsvp__input--area" name="note" rows="2"></textarea>
      </label>
      <div data-igc="ts"></div>
      <p class="rsvp__msg" data-igc="msg" role="status" aria-live="polite"></p>
      <button type="submit" class="rsvp__submit" data-igc="submit">Send RSVP</button>
      <p class="rsvp__fine">By RSVPing, you confirm you're 21 or older and agree we can
        email you about this event. We never sell your info.
        <a href="#privacy">Privacy Policy</a></p>
    </form>`;
  document.body.appendChild(dlg);

  // Light-dismiss. A backdrop click reports the dialog itself as its target,
  // but so does the tail of the very click that opened the dialog — the button
  // is gone from under the pointer by the time the click event lands, so the
  // modal would shut the instant it appeared. Requiring the press to have
  // STARTED on the backdrop separates the two: the opening click's mousedown
  // happened on the button, before this dialog existed on screen.
  let pressedBackdrop = false;
  dlg.addEventListener('mousedown', (e) => { pressedBackdrop = e.target === dlg; });
  dlg.addEventListener('click', (e) => {
    if (e.target.dataset.igc === 'close') { dlg.close(); return; }
    if (pressedBackdrop && e.target === dlg) dlg.close();
    pressedBackdrop = false;
  });
  dlg.addEventListener('close', () => ts && ts.reset());
  dlg.querySelector('[data-igc="form"]').addEventListener('submit', submit);
}

const $ = (k) => dlg.querySelector(`[data-igc="${k}"]`);

function setMsg(text, ok) {
  const m = $('msg');
  m.textContent = text || '';
  m.classList.toggle('is-ok', !!ok);
}

export function openRSVP(opts) {
  current = opts || {};
  if (!dlg) build();

  const form = $('form');
  form.reset();
  form.querySelector('[name="guests"]').value =
    String(Math.max(1, Math.min(6, parseInt(current.guests, 10) || 1)));
  $('sub').textContent = current.title ? `for ${current.title}` : '';
  $('submit').disabled = false;
  setMsg('');

  dlg.showModal();
  form.querySelector('[name="firstName"]').focus();

  // Re-render the widget each time so a reopened form gets a fresh challenge.
  $('ts').innerHTML = '';
  mountTurnstile($('ts')).then((handle) => { ts = handle; });
}

export function closeRSVP() {
  if (dlg && dlg.open) dlg.close();
}

async function submit(e) {
  e.preventDefault();
  const form = e.target;
  const val = (k) => (form.querySelector(`[name="${k}"]`).value || '').trim();

  const firstName = val('firstName');
  if (!firstName) return setMsg('Please add your first name.');

  const btn = $('submit');
  btn.disabled = true;
  setMsg('Sending…', true);

  try {
    const r = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        eventId: current.eventId || '',
        firstName,
        lastName: val('lastName'),
        email: val('email'),
        guests: parseInt(val('guests'), 10) || 1,
        note: val('note'),
        turnstileToken: ts ? ts.token() : '',
      }),
    });
    const out = await r.json().catch(() => null);
    if (!r.ok || !out || !out.ok) throw new Error('rejected');

    setMsg("You're on the list — see you there! 💛", true);
    if (typeof current.onSuccess === 'function') current.onSuccess();
    setTimeout(closeRSVP, 1400);
  } catch {
    btn.disabled = false;
    if (ts) ts.reset();
    setMsg("Sorry — that didn't go through. Please try again.");
  }
}
