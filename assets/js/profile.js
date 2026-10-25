// The host profile popup on the Who we are page. The cards there show a few
// lines of each bio; openProfile(html, fromEl) shows the whole profile in a
// <dialog>, grown out of the card that was clicked so it reads as that card
// moving to the centre and opening up.
//
// Like the RSVP modal, showModal() brings the focus trap, Escape, the inert
// background and focus restore on close.

let dlg = null;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The transform that puts the dialog exactly over `from` (a DOMRect).
function overCard(from) {
  const to = dlg.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})`;
}

function build() {
  dlg = document.createElement('dialog');
  dlg.className = 'profile';
  dlg.innerHTML = `
    <button type="button" class="profile__close" data-igc="close" aria-label="Close">&times;</button>
    <div data-igc="body"></div>`;
  document.body.appendChild(dlg);

  // Light-dismiss, with the same guard rsvp.js explains: only a press that
  // STARTED on the backdrop closes it, not the tail of the opening click.
  let pressedBackdrop = false;
  dlg.addEventListener('mousedown', (e) => { pressedBackdrop = e.target === dlg; });
  dlg.addEventListener('click', (e) => {
    if (e.target.closest('[data-igc="close"]')) closeProfile();
    else if (pressedBackdrop && e.target === dlg) closeProfile();
    pressedBackdrop = false;
  });
  // Escape: animate back into the card instead of vanishing.
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeProfile(); });
}

let card = null;   // the card it opened from, to shrink back into

export function openProfile(html, fromEl) {
  if (!dlg) build();
  card = fromEl || null;
  dlg.querySelector('[data-igc="body"]').innerHTML = html;
  dlg.showModal();
  dlg.scrollTop = 0;
  dlg.querySelector('[data-igc="close"]').focus();
  if (card && !reducedMotion()) {
    dlg.animate(
      [{ transform: overCard(card.getBoundingClientRect()), opacity: 0.6 }, { transform: 'none', opacity: 1 }],
      { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
  }
}

export function closeProfile({ instant } = {}) {
  if (!dlg || !dlg.open) return;
  if (instant || !card || !card.isConnected || reducedMotion()) { dlg.close(); return; }
  // Held on its last frame until closed, so it can't flash back to full size.
  const shrink = dlg.animate(
    [{ transform: 'none', opacity: 1 }, { transform: overCard(card.getBoundingClientRect()), opacity: 0 }],
    { duration: 220, easing: 'ease-in', fill: 'forwards' }
  );
  const done = () => { dlg.close(); shrink.cancel(); };
  shrink.finished.then(done, done);
}
