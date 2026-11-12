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

// Background pour reel controls & reduced-motion compliance
const heroVideo = document.getElementById('hero-video');
const reelToggle = document.getElementById('reelToggle');
const heroImage = document.getElementById('hero-image');

if (heroVideo && reelToggle) {
  const syncReelButton = () => {
    const paused = heroVideo.paused;
    reelToggle.setAttribute('aria-pressed', String(paused));
    reelToggle.textContent = paused ? 'Play reel' : 'Pause reel';
  };
  if (reducedMotion.matches) {
    heroVideo.pause();
    syncReelButton();
  } else {
    const playPromise = heroVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => syncReelButton());
    }
  }
  reelToggle.addEventListener('click', () => {
    if (heroVideo.paused) {
      heroVideo.play().catch(() => {});
    } else {
      heroVideo.pause();
    }
    syncReelButton();
  });
}

// Subtle 3D mineral-aggregate flow-field canvas in hero
const heroCanvas = document.getElementById('hero-canvas');
if (heroCanvas && !reducedMotion.matches) {
  const ctx = heroCanvas.getContext('2d');
  let width = 0, height = 0, rafId = 0;
  const particles = Array.from({ length: 36 }, (_, i) => ({
    x: (i * 0.29) % 1,
    y: (i * 0.61) % 1,
    r: 1.1 + (i % 3) * 0.65,
    vx: 0.00018 + (i % 5) * 0.00004,
    vy: -0.00012 - (i % 4) * 0.00003,
    alpha: 0.14 + (i % 4) * 0.06
  }));
  const resize = () => {
    const rect = heroCanvas.getBoundingClientRect();
    width = heroCanvas.width = Math.max(1, Math.floor(rect.width * Math.min(window.devicePixelRatio || 1, 2)));
    height = heroCanvas.height = Math.max(1, Math.floor(rect.height * Math.min(window.devicePixelRatio || 1, 2)));
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  const draw = () => {
    if (window.scrollY < window.innerHeight * 1.1) {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x = (p.x + p.vx + 1) % 1;
        p.y = (p.y + p.vy + 1) % 1;
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(233, 232, 223, ${p.alpha})`;
        ctx.fill();
      }
    }
    rafId = window.requestAnimationFrame(draw);
  };
  rafId = window.requestAnimationFrame(draw);
}

let scrollTicking = false;
function frame() {
  const mediaTarget = heroVideo || heroImage;
  if (mediaTarget && window.scrollY < window.innerHeight && window.innerWidth > 760) {
    const y = Math.min(window.scrollY * 0.035, 28);
    mediaTarget.style.transform = `translate3d(0,${y}px,0) scale(1.04)`;
  } else if (mediaTarget) {
    mediaTarget.style.removeProperty('transform');
  }
  scrollTicking = false;
}
window.addEventListener('scroll', () => {
  if (!reducedMotion.matches && !scrollTicking) {
    scrollTicking = true;
    window.requestAnimationFrame(frame);
  }
}, { passive: true });

// Horizontal project gallery: arrow buttons + mouse-wheel + click-and-drag
const track = document.getElementById('projectTrack');
const prevBtn = document.getElementById('galleryPrev');
const nextBtn = document.getElementById('galleryNext');
if (track) {
  const stepSize = () => {
    const firstCard = track.querySelector('.project-card');
    return firstCard ? firstCard.getBoundingClientRect().width + 28 : 420;
  };
  if (prevBtn) prevBtn.addEventListener('click', () => track.scrollBy({ left: -stepSize(), behavior: 'smooth' }));
  if (nextBtn) nextBtn.addEventListener('click', () => track.scrollBy({ left: stepSize(), behavior: 'smooth' }));

  track.addEventListener('wheel', event => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      const atStart = track.scrollLeft <= 0 && event.deltaY < 0;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2 && event.deltaY > 0;
      if (!atStart && !atEnd) {
        event.preventDefault();
        track.scrollLeft += event.deltaY;
      }
    }
  }, { passive: false });

  let isDown = false, startX = 0, scrollStart = 0;
  track.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    isDown = true;
    startX = event.clientX;
    scrollStart = track.scrollLeft;
    track.classList.add('is-dragging');
    track.setPointerCapture(event.pointerId);
  });
  track.addEventListener('pointermove', event => {
    if (!isDown) return;
    const dx = event.clientX - startX;
    track.scrollLeft = scrollStart - dx;
  });
  const stopDrag = () => {
    isDown = false;
    track.classList.remove('is-dragging');
  };
  track.addEventListener('pointerup', stopDrag);
  track.addEventListener('pointercancel', stopDrag);
}

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
  status.hidden = true;
  if (!form.reportValidity()) {
    status.textContent = 'Please complete the required fields so we can get back to you.';
    status.classList.add('error');
    status.hidden = false;
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
    status.hidden = false;
  } catch (error) {
    status.innerHTML = 'Your enquiry couldn’t be sent just now. Please try again or call <a href="tel:+61436486214"><strong>0436 486 214</strong></a>.';
    status.classList.add('error');
    status.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector('span').textContent = 'Send my enquiry';
  }
});

document.getElementById('year').textContent = new Date().getFullYear();
