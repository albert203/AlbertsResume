// ---- System map: three projects, each in its own zone ----
const ZONES = [
  { name: 'Microkeeper · 2024–2026', x: 30, y: 40, w: 730, h: 880, tint: '0,103,177' },
  { name: 'signalSEO · 2026–now', x: 790, y: 40, w: 645, h: 500, tint: '107,63,160' },
  { name: 'NFE · Oct 2026–now', x: 790, y: 580, w: 645, h: 340, tint: '176,48,106' },
];
const HUBS = [[360, 480], [1140, 260], [840, 740]];
const LINES = [
  // Microkeeper
  { c: 'red', d: 'M360 830 V150' },
  { c: 'blue', d: 'M360 480 H600 L660 420 V280' },
  { c: 'blue', d: 'M600 480 L660 540 V680' },
  { c: 'green', d: 'M360 480 L280 400 H110' },
  { c: 'amber', d: 'M360 480 L280 560 H110' },
  // signalSEO
  { c: 'purple', d: 'M830 160 H1040 L1140 260 H1370' },
  { c: 'purple', d: 'M1140 260 L1230 350 H1360' },
  { c: 'teal', d: 'M1140 90 V470 H1340' },
  // NFE
  { c: 'rose', d: 'M840 740 H1370' },
  { c: 'rose', d: 'M1110 740 L1190 660 H1350' },
  { c: 'rose', d: 'M840 740 L940 840 H1340' },
];
// [x, y, label, label side t|b|l|r, note]
const STOPS = [
  [360, 150, 'Analytics dashboard', 'r', 'Configurable real-time dashboard on Chart.js.', 1],
  [360, 300, 'Pages 50s → 3s', 'r', 'Indexes and reworked queries took key pages from about 50 seconds to 3.', 1],
  [360, 650, 'Indexes', 'r', 'Rebuilt to match how the modules actually query.', 1],
  [360, 830, 'MySQL', 'r', 'The data underneath the payroll platform.', 1],
  [450, 480, 'OAuth 2.0', 'b', 'Secure connection to each business\'s accounting account.'],
  [540, 480, 'Accounting API', 't', 'One integration layer for two accounting suites.'],
  [660, 280, 'Xero', 't', 'Pay runs post straight to Xero.', 1],
  [660, 680, 'Reckon', 'b', 'Pay runs post straight to Reckon.', 1],
  [230, 400, 'Upload API', 't', 'Upload, update and delete with no manual handling.'],
  [110, 400, 'Cloudflare Images', 'b', 'Profile pictures for thousands of users.'],
  [230, 560, 'Skills HR', 'b', 'Skills and documents reviewed in one place.'],
  [110, 560, 'Super funds', 't', 'Workflow redesign and UI/UX overhaul.'],
  [830, 160, 'Website', 't', 'An owner pastes their website.'],
  [930, 160, 'Site scraping', 'b', 'Scrapes both sites: pages, copy and screenshots.'],
  [1020, 160, 'Google rankings', 't', 'Live rankings, maps and reviews from Google.'],
  [1230, 260, 'Claude drafts', 't', 'AI writes the copy for each recommended fix.'],
  [1300, 260, 'Quality checks', 'b', 'Every AI draft must pass checks before it\'s shown.'],
  [1370, 260, 'Weekly fixes', 't', 'A short list of what to do this week.'],
  [1250, 350, 'Stripe', 'b', 'Subscriptions and checkout, card details kept off the server.'],
  [1360, 350, 'A$ / NZ$', 'b', 'Pricing in two currencies, monthly or yearly.'],
  [1140, 90, 'Nightly checks', 'r', 'Every tracked search re-checked automatically each night.', 1],
  [1140, 400, 'Rank alerts', 'l', 'Owners are told when they or a rival move.', 1],
  [1220, 470, 'AI answers', 'b', 'Tracks what Google\'s AI answer says and who it cites.'],
  [1340, 470, 'Weekly digest', 'b', 'A summary email every week.'],
  [960, 740, '60 UAT tests', 'b', 'Ran 60 user acceptance tests and reported to the owner daily.'],
  [1070, 740, 'Bug fixes', 'b', 'Fixed what testing found with Claude Code, reviewed and tested before merge.'],
  [1240, 740, 'Role guides', 'b', 'In-app guides for participants, tutors and admins.'],
  [1370, 740, 'Public site', 'b', 'Reworked the homepage, training, register and sign-in pages.'],
  [1200, 660, 'Design system', 't', 'One set of labels, icons and tables for every role.'],
  [1350, 660, 'Design board', 't', 'An admin page that draws every shared piece live.'],
  [1030, 840, 'Support desk', 'b', 'A hidden desk where NFE support can look up an account and fix it.'],
  [1200, 840, 'Sign-in fixes', 'b', 'Send a sign-in link, unlock an account, or change an email with a second check.'],
  [1340, 840, 'Audit log', 'b', 'Every support action is recorded against the person who did it.'],
];

const NS = 'http://www.w3.org/2000/svg';
const svg = document.querySelector('.map');
const el = (tag, attrs, text, parent = svg) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text) n.textContent = text; parent.appendChild(n); return n; };
const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
if (motion) document.documentElement.classList.add('motion');

ZONES.forEach((z) => {
  el('rect', { x: z.x, y: z.y, width: z.w, height: z.h, rx: 22, class: 'zone', fill: `rgba(${z.tint},.07)`, stroke: `rgba(${z.tint},.45)` });
  const g = el('g', { class: 'tab' });
  const pill = el('rect', { x: z.x + 20, y: z.y - 19, width: 200, height: 38, rx: 19 }, null, g);
  const label = el('text', { x: z.x + 42, y: z.y + 6 }, z.name, g);
  document.fonts.ready.then(() => pill.setAttribute('width', label.getComputedTextLength() + 44));
});
LINES.forEach((l, i) => {
  const p = el('path', { class: 'line', d: l.d, style: `stroke:var(--${l.c})` });
  p.style.setProperty('--len', Math.ceil(p.getTotalLength()));
  p.style.setProperty('--delay', (i * 0.1) + 's');
});
HUBS.forEach(([x, y]) => el('circle', { class: 'hub', cx: x, cy: y, r: 24, 'aria-hidden': 'true' }));
STOPS.forEach(([x, y, label, side, note, across]) => {
  el('circle', { class: 'platform', cx: x, cy: y, r: 13, tabindex: 0, 'data-tip': note, 'aria-label': `${label}: ${note}` });
  const gap = 13;
  const [dx, dy, anchor] = { t: [0, -gap - 11, 'middle'], b: [0, gap + 23, 'middle'], r: [gap + 12, 6, 'start'], l: [-gap - 12, 6, 'end'] }[side];
  el('text', { x: x + dx, y: y + dy, 'text-anchor': anchor, 'aria-hidden': 'true' }, label);
});
// one train per system: Microkeeper accounting line, signalSEO report line, NFE main line
if (motion) [[1, 6], [5, 8], [8, 7]].forEach(([line, dur]) => {
  const train = el('circle', { class: 'train', r: 8 });
  const am = document.createElementNS(NS, 'animateMotion');
  am.setAttribute('dur', dur + 's'); am.setAttribute('repeatCount', 'indefinite'); am.setAttribute('path', LINES[line].d);
  train.appendChild(am);
});

const wrap = document.querySelector('.map-wrap'), tipBox = document.querySelector('.tip');
const show = (stop) => {
  tipBox.textContent = stop.dataset.tip;
  const st = stop.getBoundingClientRect(), w = wrap.getBoundingClientRect();
  tipBox.style.left = Math.min(st.left - w.left + wrap.scrollLeft - 20, wrap.scrollWidth - 300) + 'px';
  tipBox.style.top = (st.bottom - w.top + 10) + 'px';
  tipBox.classList.add('on');
};
svg.querySelectorAll('.platform').forEach((stop) => {
  stop.addEventListener('mouseenter', () => show(stop));
  stop.addEventListener('focus', () => show(stop));
  stop.addEventListener('mouseleave', () => tipBox.classList.remove('on'));
  stop.addEventListener('blur', () => tipBox.classList.remove('on'));
});

// ---- Viewers: stations switch views (or seek chapters); the fill runs along the line ----
document.querySelectorAll('[data-viewer]').forEach((v) => {
  const slides = [...v.querySelectorAll('.slide')];
  const stops = [...v.querySelectorAll('.stations button')];
  const rail = v.querySelector('.rail'), caption = v.querySelector('.caption'), play = v.querySelector('.play');
  const chapters = v.querySelector('video[data-chapters]');   // one video; stations seek into it
  const times = stops.map((b) => +b.dataset.t || 0);
  const DWELL = 7000;
  let i = 0, playing = motion, inView = false, hold = false, elapsed = 0, last = 0, raf = 0;

  const media = () => chapters || slides[i].querySelector('video');
  const active = () => playing && inView && !hold;
  const mark = () => {
    stops.forEach((b, n) => { b.toggleAttribute('aria-current', n === i); b.classList.toggle('done', n < i); });
    caption.textContent = stops[i].dataset.note;
  };
  const frac = () => {
    const m = media();
    if (chapters) {
      const t = m.currentTime, k = Math.max(0, times.findLastIndex((x) => t >= x));
      if (k !== i) { i = k; mark(); }
      const next = times[k + 1] ?? (m.duration || t + 1);
      return Math.min(1, (t - times[k]) / (next - times[k]));
    }
    if (m) return m.duration ? m.currentTime / m.duration : 0;
    return Math.min(1, elapsed / DWELL);
  };
  const frame = (now) => {
    raf = 0;
    if (active() && !media()) elapsed += last ? now - last : 0;
    last = active() ? now : 0;
    const f = frac();
    rail.style.setProperty('--p', ((i + f) / stops.length * 100) + '%');
    stops.forEach((b, n) => b.style.setProperty('--f', (n < i ? 100 : n === i ? f * 100 : 0) + '%'));
    if (active() && !chapters && f >= 1) return go(i + 1);
    if (active()) raf = requestAnimationFrame(frame);
  };
  const run = () => {
    const m = media();
    if (m) { if (active()) m.play().catch(() => {}); else m.pause(); }
    v.classList.toggle('paused', !playing);
    v.classList.toggle('holding', hold && playing);
    play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const go = (n) => {
    i = (n + stops.length) % stops.length; elapsed = 0; last = 0;
    if (chapters) chapters.currentTime = times[i];
    else slides.forEach((s, k) => {
      s.classList.toggle('on', k === i); s.inert = k !== i;
      const vid = s.querySelector('video');
      if (vid) { vid.pause(); if (k === i) vid.currentTime = 0; }
    });
    closeNote(); mark(); run();
  };

  // annotation pins: hover or focus to read; the viewer holds still meanwhile
  const note = v.querySelector('.note');
  const closeNote = () => { if (!note) return; note.classList.remove('on'); v.querySelectorAll('.pin[aria-expanded]').forEach((p) => p.removeAttribute('aria-expanded')); };
  v.querySelectorAll('.pin').forEach((p) => {
    p.setAttribute('aria-label', `Note ${p.textContent}: ${p.dataset.note}`);
    const open = () => {
      closeNote(); note.textContent = p.dataset.note; p.setAttribute('aria-expanded', 'true');
      const box = v.getBoundingClientRect(), r = p.getBoundingClientRect();
      note.style.left = Math.max(0, Math.min(r.left - box.left + r.width / 2 - 136, box.width - note.offsetWidth)) + 'px';
      const below = r.bottom - box.top + 10, screenH = v.querySelector('.screen').offsetHeight;
      note.style.top = (below + note.offsetHeight > screenH ? r.top - box.top - 10 - note.offsetHeight : below) + 'px';
      note.classList.add('on');
    };
    p.addEventListener('mouseenter', open); p.addEventListener('focus', open); p.addEventListener('click', open);
    p.addEventListener('mouseleave', closeNote); p.addEventListener('blur', closeNote);
  });

  const screen = v.querySelector('.screen');
  screen.insertAdjacentHTML('beforeend', '<span class="hold" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M6 4h3v12H6zM11 4h3v12h-3z"/></svg>Paused · move away to play</span>');
  screen.addEventListener('pointerenter', () => { hold = true; run(); });
  screen.addEventListener('pointerleave', () => { hold = false; run(); });
  screen.addEventListener('focusin', () => { hold = true; run(); });
  screen.addEventListener('focusout', () => { hold = false; run(); });
  play.addEventListener('click', () => { playing = !playing; run(); });
  stops.forEach((b, n) => b.addEventListener('click', () => go(n)));
  if (chapters) chapters.addEventListener('ended', () => go(0));
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; run(); }, { threshold: 0.35 }).observe(v);
  go(0);
});

// ---- Contact: posts to the Worker at /api/contact, Turnstile token included ----
const form = document.getElementById('contact_form');
if (form) {
  const ok = document.getElementById('form_success'), err = document.getElementById('form_error');
  const send = form.querySelector('button[type="submit"]'), label = send.querySelector('span');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    ok.hidden = true; err.hidden = true;
    send.disabled = true; label.textContent = 'Sending…';
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      if (res.ok) { ok.hidden = false; form.reset(); label.textContent = 'Sent'; return; }
      const data = await res.json().catch(() => ({}));
      err.querySelector('span').textContent = data.error === 'Missing spam check' ? 'Please complete the spam check, then send again.' : (data.error || 'Something went wrong. Please try again.');
    } catch {
      err.querySelector('span').textContent = 'Could not reach the server. Check your connection and try again.';
    }
    err.hidden = false; send.disabled = false; label.textContent = 'Send message';
    if (window.turnstile) window.turnstile.reset();
  });
}

const links = [...document.querySelectorAll('.nav ul a')];
const spy = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) links.forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
['lines', 'experience', 'about', 'contact'].forEach((id) => spy.observe(document.getElementById(id)));
