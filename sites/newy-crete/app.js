'use strict';

// Accessible before and without animation; no smooth-scroll hijacking.
document.documentElement.classList.add('js');

const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');
const setMenu = (open, restoreFocus = false) => {
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  mobileMenu.hidden = !open;
  document.body.classList.toggle('menu-open', open);
  if (restoreFocus) menuButton.focus();
};
menuButton.addEventListener('click', () => {
  setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
});
mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false, true);
});
window.matchMedia('(min-width: 761px)').addEventListener('change', event => {
  if (event.matches) setMenu(false);
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const revealItems = document.querySelectorAll('.reveal');
if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
  revealItems.forEach(item => observer.observe(item));
} else {
  revealItems.forEach(item => item.classList.add('is-visible'));
}

const heroImage = document.getElementById('hero-image');
let scrollTicking = false;
function frame() {
  if (window.scrollY < window.innerHeight && window.innerWidth > 760) {
    const y = Math.min(window.scrollY * 0.035, 28);
    heroImage.style.transform = `translate3d(0,${y}px,0) scale(1.025)`;
  } else {
    heroImage.style.removeProperty('transform');
  }
  scrollTicking = false;
}
window.addEventListener('scroll', () => {
  if (!reducedMotion.matches && !scrollTicking) {
    scrollTicking = true;
    window.requestAnimationFrame(frame);
  }
}, { passive: true });

// Existing Lay'd Back / Supabase quote pathway. Never silently substitute mailto.
const LB_POINTER = 'https://gist.githubusercontent.com/laydbackapps-beep/48ff985c786b72a1637d7875f4df79b8/raw/api-base.txt';
const LB_FALLBACK = 'https://laydback-hq.tail5b3740.ts.net';
function resolveApiBase() {
  const fallback = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://' + window.location.host : LB_FALLBACK;
  if (window.__LAYDBACK_API_BASE) return Promise.resolve(window.__LAYDBACK_API_BASE);
  return new Promise(resolve => {
    let complete = false;
    const useFallback = () => { if (!complete) { complete = true; resolve(fallback); } };
    const timer = setTimeout(useFallback, 2500);
    if (fallback.startsWith('http://')) { useFallback(); clearTimeout(timer); return; }
    fetch(LB_POINTER + '?_=' + Date.now())
      .then(response => { if (!response.ok) throw new Error('Configuration unavailable'); return response.text(); })
      .then(text => {
        const base = (text || '').trim().replace(/\/+$/, '');
        if (complete) return;
        complete = true;
        clearTimeout(timer);
        resolve(/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(base) ? base : LB_FALLBACK);
      })
      .catch(() => { clearTimeout(timer); useFallback(); });
  });
}

const form = document.getElementById('quoteForm');
const status = document.getElementById('formStatus');
const submitButton = form.querySelector('button[type="submit"]');
form.addEventListener('submit', async event => {
  event.preventDefault();
  status.className = 'form-status';
  if (!form.reportValidity()) {
    status.textContent = 'Please complete the required fields so we can get back to you.';
    status.classList.add('error');
    return;
  }
  const data = new FormData(form);
  if (data.get('website')) return;
  const suburb = String(data.get('suburb') || '').trim();
  const detail = String(data.get('message') || '').trim();
  submitButton.disabled = true;
  submitButton.querySelector('span').textContent = 'Sending…';
  status.textContent = '';
  try {
    const base = await resolveApiBase();
    const response = await fetch(base + '/functions/v1/quote-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        site_id: 'newy-crete',
        business_name: 'Newy Concrete Solutions Pty Ltd',
        name: data.get('name'),
        phone: data.get('phone'),
        email: data.get('email') || '',
        service: data.get('service'),
        message: 'Project location: ' + suburb + (detail ? ' — ' + detail : ''),
        consent: data.get('consent') === 'on'
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) throw new Error(result.error || 'Your enquiry could not be sent.');
    form.reset();
    status.textContent = 'Thanks — your enquiry has been sent to Newy Crete. We’ll be in touch about your project.';
    status.classList.add('success');
  } catch (error) {
    status.innerHTML = 'Your enquiry couldn’t be sent just now. Please try again or call <a href="tel:+61436486214"><strong>0436 486 214</strong></a>.';
    status.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector('span').textContent = 'Send my enquiry';
  }
});

document.getElementById('year').textContent = new Date().getFullYear();
