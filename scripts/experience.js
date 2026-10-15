import { features, motionEnabled, prefersReducedMotion, toggleMotion } from './features.js';

let disposePrevious;

// Original, dependency-free interpretations of the reference site's motion mechanics.
// Every enhancement is optional; semantic content and ordinary links work without it.
export function initExperience() {
  disposePrevious?.();
  const controller = new AbortController();
  const { signal } = controller;
  const root = document.documentElement;
  const cleanups = [];
  const listen = (target, type, handler, options = {}) => target?.addEventListener(type, handler, { ...options, signal });
  const all = (selector) => [...document.querySelectorAll(selector)];
  const byId = (id) => document.getElementById(id);
  root.classList.add('motion-ready');

  const menu = byId('site-menu');
  const menuButton = byId('menu-toggle');
  let lockedScroll = 0;
  let savedOverflow = '';
  let menuLocked = false;
  const releaseMenu = () => {
    root.classList.remove('menu-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation menu');
    if (menuLocked) {
      root.style.overflow = savedOverflow;
      menuLocked = false;
      // Overflow locking retains position in modern browsers. Restore only if needed.
      if (Math.abs(window.scrollY - lockedScroll) > 1) window.scrollTo({ top: lockedScroll, behavior: 'instant' });
    }
  };
  const closeMenu = () => {
    if (menu?.open) menu.close();
    // Do this synchronously: an anchor's default scroll must run after unlock.
    releaseMenu();
  };
  const openMenu = () => {
    if (!menu || menu.open || typeof menu.showModal !== 'function') return;
    lockedScroll = window.scrollY;
    savedOverflow = root.style.overflow;
    menu.showModal();
    root.style.overflow = 'hidden';
    menuLocked = true;
    root.classList.add('menu-open');
    menuButton?.setAttribute('aria-expanded', 'true');
    menuButton?.setAttribute('aria-label', 'Close navigation menu');
  };
  if (features.overlayMenu && menu && typeof menu.showModal === 'function') {
    if (menuButton) menuButton.hidden = false;
    listen(menuButton, 'click', () => menu.open ? closeMenu() : openMenu());
    listen(menu.querySelector('.menu-close'), 'click', closeMenu);
    listen(menu, 'close', releaseMenu);
    listen(menu, 'cancel', () => { releaseMenu(); });
    listen(menu, 'click', (event) => {
      if (event.target !== menu) return;
      const rect = menu.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeMenu();
    });
    const preview = menu.querySelector('[data-menu-preview]');
    all('[data-menu-link]').forEach((link) => {
      const updatePreview = () => { if (preview) preview.textContent = link.dataset.preview || link.textContent.trim(); };
      listen(link, 'pointerenter', updatePreview);
      listen(link, 'focus', updatePreview);
    });
  } else if (menuButton) menuButton.hidden = true;
  cleanups.push(closeMenu);

  const destinationFor = (link) => {
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return null;
    let url;
    try { url = new URL(link.href, location.href); } catch { return null; }
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return null;
    let id;
    try { id = decodeURIComponent(url.hash.slice(1)); } catch { return null; }
    const element = byId(id);
    return element && !element.hidden ? { element, hash: url.hash } : null;
  };
  const focusSection = (element) => {
    const focusTarget = element.querySelector('h1, h2') || element;
    const previous = focusTarget.getAttribute('tabindex');
    if (previous === null) focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
    if (previous === null) {
      const restore = () => focusTarget.removeAttribute('tabindex');
      focusTarget.addEventListener('blur', restore, { once: true, signal });
      cleanups.push(restore);
    }
  };
  const jumpTo = (element) => {
    // A curtain covers the jump; native smooth scroll would make its timing ambiguous.
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    element.scrollIntoView({ behavior: 'instant', block: 'start' });
    root.style.scrollBehavior = previous;
    focusSection(element);
  };
  const curtain = byId('transition-curtain');
  let transitionGeneration = 0;
  let transitionAnimation;
  let pendingDestination;
  const cancelTransition = () => {
    transitionGeneration += 1;
    transitionAnimation?.cancel();
    transitionAnimation = null;
    pendingDestination = null;
    curtain?.classList.remove('is-active');
  };
  const transitionTo = async ({ element, hash }) => {
    cancelTransition();
    pendingDestination = { element, hash };
    const generation = transitionGeneration;
    const canAnimate = motionEnabled() && curtain && typeof curtain.animate === 'function';
    if (canAnimate) {
      curtain.classList.add('is-active');
      transitionAnimation = curtain.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 260, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
      try { await transitionAnimation.finished; } catch { return; }
    }
    if (generation !== transitionGeneration) return;
    if (location.hash !== hash) history.pushState(null, '', hash);
    jumpTo(element);
    pendingDestination = null;
    if (canAnimate && motionEnabled()) {
      transitionAnimation = curtain.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], { duration: 310, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
      try { await transitionAnimation.finished; } catch { return; }
    }
    if (generation === transitionGeneration) cancelTransition();
  };
  listen(document, 'click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    const destination = destinationFor(link);
    if (!destination) return;
    if (menu?.contains(link)) closeMenu();
    if (features.sectionTransitions && motionEnabled()) {
      event.preventDefault();
      void transitionTo(destination);
    }
  });
  listen(window, 'popstate', () => {
    cancelTransition();
    closeMenu();
    // Let the browser restore its saved scroll position on Back/Forward.
    // Native fragment navigation still resolves the correct target when needed.
  });
  cleanups.push(cancelTransition);

  if (features.splitHeadings) {
    all('[data-split]').forEach((heading) => {
      if (heading.querySelector('a, button, input, [data-split-word]')) return;
      const previousHTML = heading.innerHTML;
      const previousLabel = heading.getAttribute('aria-label');
      const semanticHeading = heading.matches('h1, h2, h3, h4, h5, h6, [role="heading"]');
      const accessibleCopy = heading.cloneNode(true);
      accessibleCopy.querySelectorAll('[aria-hidden="true"]').forEach(element => element.remove());
      accessibleCopy.querySelectorAll('br').forEach((lineBreak) => lineBreak.replaceWith(document.createTextNode(' ')));
      const text = accessibleCopy.textContent.replace(/\s+/g, ' ').trim();
      if (!text) return;
      // An aria-label on an arbitrary inline span is unreliable. Only semantic
      // headings receive a single accessible name; inline split regions retain
      // their text in the accessibility tree (or inherit the heading's label).
      if (semanticHeading) heading.setAttribute('aria-label', previousLabel || text);
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
          if (node.parentElement.closest('[data-split]') !== heading) return NodeFilter.FILTER_REJECT;
          if (node.parentElement.closest('script, style, noscript, [aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      let wordIndex = 0;
      textNodes.forEach((textNode) => {
        const fragment = document.createDocumentFragment();
        textNode.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { fragment.append(document.createTextNode(part)); return; }
          const span = document.createElement('span');
          span.className = 'split-word';
          span.dataset.splitWord = '';
          if (semanticHeading) span.setAttribute('aria-hidden', 'true');
          span.style.setProperty('--word-index', wordIndex++);
          span.textContent = part;
          fragment.append(span);
        });
        textNode.replaceWith(fragment);
      });
      cleanups.push(() => {
        heading.innerHTML = previousHTML;
        if (previousLabel === null) heading.removeAttribute('aria-label');
        else heading.setAttribute('aria-label', previousLabel);
      });
    });
  }

  const revealElements = features.scrollReveals ? all('[data-reveal]') : [];
  let revealObserver;
  const revealAll = () => {
    revealObserver?.disconnect();
    revealElements.forEach((element) => { element.classList.remove('reveal-pending'); element.classList.add('is-revealed'); });
  };
  const setupReveals = () => {
    revealObserver?.disconnect();
    if (!motionEnabled() || !('IntersectionObserver' in window)) { revealAll(); return; }
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        target.classList.remove('reveal-pending');
        target.classList.add('is-revealed');
        revealObserver.unobserve(target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    revealElements.forEach((element) => {
      if (element.classList.contains('is-revealed')) return;
      if (element.getBoundingClientRect().top < innerHeight * 0.9) element.classList.add('is-revealed');
      else { element.classList.add('reveal-pending'); revealObserver.observe(element); }
    });
  };
  listen(document, 'focusin', (event) => {
    if (!(event.target instanceof Element)) return;
    const pending = event.target.closest('.reveal-pending');
    if (pending) { pending.classList.remove('reveal-pending'); pending.classList.add('is-revealed'); }
  });
  cleanups.push(revealAll);

  const progress = byId('reading-progress');
  if (progress) progress.hidden = !features.readingProgress;
  const back = byId('back-to-top');
  if (back) back.hidden = !features.backToTop;
  const themedSections = features.sectionThemes ? all('[data-section-theme]') : [];
  const header = byId('site-header');
  let scrollFrame = 0;
  const updateScroll = () => {
    scrollFrame = 0;
    if (features.readingProgress && progress) {
      const distance = Math.max(1, root.scrollHeight - innerHeight);
      progress.style.transform = `scaleX(${Math.max(0, Math.min(1, scrollY / distance))})`;
    }
    if (features.backToTop && back) {
      const visible = scrollY > innerHeight * 0.7;
      back.classList.toggle('is-visible', visible);
      back.hidden = !visible;
    }
    if (header && themedSections.length) {
      const marker = header.getBoundingClientRect().bottom + 2;
      const active = themedSections.find((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= marker && rect.bottom > marker;
      });
      if (active) header.dataset.theme = active.dataset.sectionTheme;
    }
  };
  const scheduleScroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); };
  listen(window, 'scroll', scheduleScroll, { passive: true });
  listen(window, 'resize', scheduleScroll, { passive: true });
  if ('ResizeObserver' in window) {
    const sizeObserver = new ResizeObserver(scheduleScroll);
    sizeObserver.observe(document.body);
    cleanups.push(() => sizeObserver.disconnect());
  }
  cleanups.push(() => cancelAnimationFrame(scrollFrame));

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const magnets = features.magneticLinks ? all('[data-magnetic]') : [];
  const resetMagnet = (element) => {
    element.style.setProperty('--magnetic-x', '0px');
    element.style.setProperty('--magnetic-y', '0px');
  };
  magnets.forEach((element) => {
    listen(element, 'pointermove', (event) => {
      if (!motionEnabled() || !finePointer.matches || event.pointerType === 'touch') return;
      const rect = element.getBoundingClientRect();
      const clamp = (value) => Math.max(-6, Math.min(6, value * 0.08));
      element.style.setProperty('--magnetic-x', `${clamp(event.clientX - rect.left - rect.width / 2)}px`);
      element.style.setProperty('--magnetic-y', `${clamp(event.clientY - rect.top - rect.height / 2)}px`);
    });
    listen(element, 'pointerleave', () => resetMagnet(element));
    listen(element, 'blur', () => resetMagnet(element));
  });

  const canvas = byId('pointer-trail');
  const context = features.pointerTrail && canvas ? canvas.getContext('2d') : null;
  let trailFrame = 0;
  let particles = [];
  let trailLastTime = 0;
  let lastParticle = 0;
  let width = innerWidth;
  let height = innerHeight;
  const trailAllowed = () => Boolean(context && motionEnabled() && finePointer.matches && !document.hidden && !menu?.open);
  const clearTrail = () => {
    cancelAnimationFrame(trailFrame);
    trailFrame = 0;
    particles = [];
    context?.clearRect(0, 0, width, height);
  };
  const sizeTrail = () => {
    if (!context) return;
    width = innerWidth;
    height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    clearTrail();
  };
  const paintTrail = (time) => {
    trailFrame = 0;
    if (!trailAllowed()) { clearTrail(); return; }
    const elapsed = Math.min(50, time - trailLastTime || 16);
    trailLastTime = time;
    context.clearRect(0, 0, width, height);
    particles = particles.filter((particle) => {
      particle.life -= elapsed / 550;
      if (particle.life <= 0) return false;
      context.beginPath();
      context.arc(particle.x, particle.y, 3 + (1 - particle.life) * 12, 0, Math.PI * 2);
      context.strokeStyle = `rgba(96, 156, 185, ${particle.life * 0.42})`;
      context.lineWidth = 1;
      context.stroke();
      return true;
    });
    if (particles.length) trailFrame = requestAnimationFrame(paintTrail);
  };
  if (context) {
    sizeTrail();
    listen(window, 'resize', sizeTrail, { passive: true });
    listen(window, 'pointermove', (event) => {
      if (!trailAllowed() || event.pointerType === 'touch') return;
      const now = performance.now();
      if (now - lastParticle < 28) return;
      lastParticle = now;
      particles.push({ x: event.clientX, y: event.clientY, life: 1 });
      if (particles.length > 24) particles.shift();
      if (!trailFrame) { trailLastTime = now; trailFrame = requestAnimationFrame(paintTrail); }
    }, { passive: true });
    listen(document, 'pointerleave', clearTrail);
    listen(document, 'visibilitychange', clearTrail);
  }
  if (canvas) canvas.hidden = !context;
  cleanups.push(clearTrail);

  const marquees = all('[data-marquee]');
  const marqueeVisibility = new WeakMap();
  const updateMarquees = () => marquees.forEach((track) => {
    track.dataset.running = String(Boolean(features.marquees && motionEnabled() && !document.hidden && marqueeVisibility.get(track)));
  });
  if ('IntersectionObserver' in window && features.marquees) {
    const marqueeObserver = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => marqueeVisibility.set(target, isIntersecting));
      updateMarquees();
    });
    marquees.forEach((track) => marqueeObserver.observe(track));
    cleanups.push(() => marqueeObserver.disconnect());
  } else marquees.forEach((track) => marqueeVisibility.set(track, true));
  listen(document, 'visibilitychange', updateMarquees);

  const clock = byId('local-clock');
  let clockInterval;
  if (features.localClock && clock) {
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
    const updateClock = () => {
      const value = formatter.format(new Date());
      clock.textContent = `${value} WIB`;
      clock.setAttribute('aria-label', `Jakarta local time ${value}`);
    };
    updateClock();
    clockInterval = setInterval(updateClock, 30000);
    listen(document, 'visibilitychange', () => { if (!document.hidden) updateClock(); });
  } else if (clock) clock.hidden = true;
  cleanups.push(() => clearInterval(clockInterval));

  const motionToggle = byId('motion-toggle');
  const previousScrollBehavior = root.style.scrollBehavior;
  const updateMotion = () => {
    const enabled = motionEnabled();
    root.style.scrollBehavior = features.smoothScroll && enabled ? 'smooth' : 'auto';
    if (motionToggle) {
      motionToggle.textContent = prefersReducedMotion() ? 'Reduced motion' : enabled ? 'Pause motion' : 'Resume motion';
      motionToggle.setAttribute('aria-pressed', String(!enabled));
      motionToggle.disabled = prefersReducedMotion();
      motionToggle.setAttribute('aria-label', prefersReducedMotion() ? 'Reduced motion follows your device preference' : enabled ? 'Pause decorative motion' : 'Resume decorative motion');
    }
    if (!enabled) {
      // Changing motion preferences mid-curtain must still honor the clicked link.
      const requested = pendingDestination;
      cancelTransition();
      if (requested) {
        if (location.hash !== requested.hash) history.pushState(null, '', requested.hash);
        jumpTo(requested.element);
      }
      clearTrail();
      magnets.forEach(resetMagnet);
    }
    setupReveals();
    updateMarquees();
  };
  listen(motionToggle, 'click', toggleMotion);
  listen(window, 'portfolio:motionchange', updateMotion);
  listen(finePointer, 'change', () => { clearTrail(); magnets.forEach(resetMagnet); });
  updateMotion();
  updateScroll();

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    controller.abort();
    cleanups.reverse().forEach((cleanup) => cleanup());
    magnets.forEach(resetMagnet);
    marquees.forEach((track) => { track.dataset.running = 'false'; });
    root.style.scrollBehavior = previousScrollBehavior;
    root.classList.remove('motion-ready');
    if (disposePrevious === dispose) disposePrevious = null;
  };
  disposePrevious = dispose;
  return dispose;
}
