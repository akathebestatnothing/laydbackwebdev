'use strict';
// Accessible content works without animation; JS only enhances navigation and enquiry.
document.documentElement.classList.add('js');

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionToggle = $('#motion-toggle');
let userReducedMotion = false;
try { userReducedMotion = localStorage.getItem('sensify-reduced-motion') === 'true'; } catch { /* storage may be unavailable */ }
let motionDisabled = motionPreference.matches || userReducedMotion;
function applyMotionPreference() {
  motionDisabled = motionPreference.matches || userReducedMotion;
  document.documentElement.classList.toggle('reduce-motion', motionDisabled);
  motionToggle.setAttribute('aria-pressed', String(userReducedMotion));
  motionToggle.lastChild.textContent = motionDisabled ? ' Motion reduced' : ' Reduce motion';
  if (motionDisabled) {
    $('#photo-table').style.removeProperty('--motion-ratio');
    $$('.reveal').forEach(item => item.classList.add('is-visible'));
  } else onScroll();
}
motionToggle.addEventListener('click', () => {
  userReducedMotion = !userReducedMotion;
  try { localStorage.setItem('sensify-reduced-motion', String(userReducedMotion)); } catch { /* no persistence required */ }
  applyMotionPreference();
});
const onMotionChange = () => applyMotionPreference();
if (motionPreference.addEventListener) motionPreference.addEventListener('change', onMotionChange);
else motionPreference.addListener(onMotionChange);

const menuButton = $('.menu-toggle');
const mobileMenu = $('#mobile-menu');
function setMenu(open, restoreFocus = false) {
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  mobileMenu.hidden = !open;
  if (restoreFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
$$('a', mobileMenu).forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false, true);
});
document.addEventListener('click', event => {
  if (menuButton.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-header')) setMenu(false);
});
window.matchMedia('(min-width: 801px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

// Progressive entrance effects do not gate the main reading flow.
const revealTargets = $$('.section-heading, .service-tabs, .pack-copy, .idea-card, .steps, .gallery-tile, .faq-list, .form-card');
revealTargets.forEach(item => item.classList.add('reveal'));
let revealObserver;
if (!motionDisabled && 'IntersectionObserver' in window) {
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .04, rootMargin: '0px 0px -4% 0px' });
  revealTargets.forEach(item => revealObserver.observe(item));
} else revealTargets.forEach(item => item.classList.add('is-visible'));

// Local CSS 3D scene: bounded rAF, no scroll hijack, transform-only.
const photoTable = $('#photo-table');
let ticking = false;
function onScroll() {
  ticking = false;
  if (!photoTable) return;
  if (motionDisabled || window.innerWidth < 581) {
    photoTable.style.removeProperty('--motion-ratio');
    return;
  }
  const heroBottom = $('#home').offsetTop + $('#home').offsetHeight;
  const progress = Math.min(1, Math.max(0, window.scrollY / Math.max(heroBottom, 1)));
  photoTable.style.setProperty('--motion-ratio', progress.toFixed(3));
}
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
window.addEventListener('resize', () => requestAnimationFrame(onScroll), { passive: true });
applyMotionPreference();

// WAI-ARIA tab keyboard model, including Home/End and orientation-independent arrows.
const tabs = $$('[role="tab"]');
function activateTab(tab, focus = false) {
  tabs.forEach(item => {
    const active = item === tab;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
  });
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else if (['ArrowRight','ArrowDown'].includes(event.key)) next = (index + 1) % tabs.length;
    else if (['ArrowLeft','ArrowUp'].includes(event.key)) next = (index + tabs.length - 1) % tabs.length;
    else return;
    event.preventDefault();
    activateTab(tabs[next], true);
  });
});

// Search and filter combine instead of surprising the user by discarding their query.
const search = $('#explorer-search');
const filterButtons = $$('.filter-button');
const ideas = $$('.idea-card');
let filter = 'all';
function filterIdeas() {
  const query = search.value.trim().toLocaleLowerCase();
  let count = 0;
  ideas.forEach(card => {
    const categoryMatch = filter === 'all' || card.dataset.categories.split(' ').includes(filter);
    const searchMatch = !query || (card.dataset.search + ' ' + card.textContent).toLocaleLowerCase().includes(query);
    const visible = categoryMatch && searchMatch;
    card.hidden = !visible;
    if (visible) count++;
  });
  $('#empty-state').hidden = count !== 0;
  $('#idea-grid').hidden = count === 0;
  $('#result-count').textContent = count === 0 ? 'No ideas match your search' : `Showing ${count} ${count === 1 ? 'idea' : 'ideas'}${filter !== 'all' ? ' in this collection' : ''}`;
}
search.addEventListener('input', filterIdeas);
filterButtons.forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  filterButtons.forEach(item => {
    const current = item === button;
    item.classList.toggle('is-active', current);
    item.setAttribute('aria-pressed', String(current));
  });
  filterIdeas();
}));
$('#reset-explorer').addEventListener('click', () => {
  search.value = ''; filter = 'all';
  filterButtons.forEach(item => {
    const active = item.dataset.filter === 'all';
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  filterIdeas();
  search.focus();
});

// Keep the form's selection linked to the thing the visitor actually clicked.
const serviceSelect = $('#service-name');
function focusFirstEmpty() {
  const first = [serviceSelect, $('#client-name'), $('#email')].find(field => !field.value.trim());
  (first || $('#preferred-timing')).focus({ preventScroll: true });
}
$$('.service-enquire').forEach(button => button.addEventListener('click', () => {
  const service = button.dataset.service;
  if ($(`option[value="${service}"]`, serviceSelect)) serviceSelect.value = service;
  if (!$('#enquiry-form').hidden) {
    serviceSelect.dispatchEvent(new Event('change', { bubbles: true }));
    $('#form-card').scrollIntoView({ behavior: motionDisabled ? 'instant' : 'smooth', block: 'center' });
    focusFirstEmpty();
  }
}));

// Existing Lay'd Back configuration convention. Correct missing-value fallback
// retained, but no silent substitution for the actual POST failure.
const LB_POINTER = 'https://gist.githubusercontent.com/laydbackapps-beep/48ff985c786b72a1637d7875f4df79b8/raw/api-base.txt';
const LB_FALLBACK = 'https://laydback-hq.tail5b3740.ts.net';
const LOCAL_ORIGINS = new Set(['localhost','127.0.0.1','::1']);
function resolveApiBase() {
  const isLocal = LOCAL_ORIGINS.has(window.location.hostname);
  const fallback = isLocal ? window.location.origin : LB_FALLBACK;
  if (window.__LAYDBACK_API_BASE) {
    const configured = String(window.__LAYDBACK_API_BASE).trim().replace(/\/+$/, '');
    return Promise.resolve(configured);
  }
  return new Promise(resolve => {
    let complete = false;
    const useFallback = () => { if (!complete) { complete = true; resolve(fallback); } };
    const timer = setTimeout(useFallback, 2500);
    // Dev/static servers generally do not have CORS permission to read the gist.
    // Serve a local simulated API through the same origin; production continues
    // to use the pointer + fallback convention.
    if (isLocal || fallback.startsWith('http://')) { clearTimeout(timer); useFallback(); return; }
    fetch(`${LB_POINTER}?_=${Date.now()}`, { headers: { 'Accept': 'text/plain' } })
      .then(response => { if (!response.ok) throw new Error('Configuration unavailable'); return response.text(); })
      .then(text => {
        if (complete) return;
        const base = text.trim().replace(/\/+$/, '');
        resolve(/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(base) ? base : LB_FALLBACK);
      })
      .catch(useFallback)
      .finally(() => { clearTimeout(timer); });
  });
}

const form = $('#enquiry-form');
const formStatus = $('#form-status');
const formSubmit = form.querySelector('button[type="submit"]');
const submitText = formSubmit.querySelector('span');
function showStatus(message, type) {
  formStatus.textContent = message;
  formStatus.className = `form-status ${type}`;
}
function makeRequestId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const value = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${value.slice(0,8)}-${value.slice(8,12)}-${value.slice(12,16)}-${value.slice(16,20)}-${value.slice(20)}`;
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  // All application requests are JSON; never use native HTML form submission.
  formStatus.textContent = ''; formStatus.className = 'form-status';
  if (!form.reportValidity()) {
    showStatus('Please add your chosen idea, name, a valid email and consent so we can send your enquiry.', 'error');
    form.querySelector(':invalid')?.focus();
    return;
  }
  const values = new FormData(form);
  if (String(values.get('website') || '').trim()) return;
  const notes = String(values.get('notes') || '').trim();
  const payload = {
    data: {
      service_name: String(values.get('service_name')).trim(),
      client_name: String(values.get('client_name')).trim(),
      email: String(values.get('email')).trim(),
      phone: String(values.get('phone') || '').trim(),
      preferred_timing: String(values.get('preferred_timing') || '').trim(),
      notes,
      request_id: makeRequestId(),
      consent: values.get('consent') === 'on'
    }
  };
  if (!payload.data.consent) return;
  formSubmit.disabled = true;
  submitText.textContent = 'Sending…';
  form.setAttribute('aria-busy', 'true');
  showStatus('Connecting to the enquiry service…', 'info');
  try {
    const base = await resolveApiBase();
    const response = await fetch(base + '/websites/sensify-me/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    const bodyText = await response.text();
    let result = {};
    try { result = bodyText ? JSON.parse(bodyText) : {}; } catch { /* still require HTTP OK */ }
    if (!response.ok || result.success === false || result.ok === false) {
      const error = new Error(result.error || result.message || 'The enquiry could not be sent.');
      error.userMessage = true;
      throw error;
    }
    $('#request-reference').textContent = payload.data.request_id;
    form.hidden = true;
    $('.form-heading').hidden = true;
    $('#form-success').hidden = false;
    $('#form-success').focus({ preventScroll: true });
    form.reset();
  } catch (error) {
    showStatus(' ', 'error');
    formStatus.replaceChildren();
    formStatus.append('We couldn’t send this just now. Please try again, or ');
    const facebook = document.createElement('a');
    facebook.href = 'https://www.facebook.com/people/Sensify-Me/61569873631692/';
    facebook.target = '_blank'; facebook.rel = 'noopener noreferrer';
    facebook.textContent = 'message Sensify Me on Facebook';
    formStatus.append(facebook, '. Your message has not been confirmed as sent.');
    formStatus.classList.add('error');
  } finally {
    formSubmit.disabled = false;
    submitText.textContent = 'Send my enquiry';
    form.setAttribute('aria-busy', 'false');
  }
});
$('#another-enquiry').addEventListener('click', () => {
  $('#form-success').hidden = true;
  $('.form-heading').hidden = false;
  form.hidden = false;
  formStatus.textContent = ''; formStatus.className = 'form-status';
  serviceSelect.focus();
});
$('#year').textContent = String(new Date().getFullYear());
