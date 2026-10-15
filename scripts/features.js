// Flip a flag to remove an experiment without untangling the rest of the site.
export const features = Object.freeze({
  overlayMenu: true,
  sectionTransitions: true,
  splitHeadings: true,
  scrollReveals: true,
  smoothScroll: true,
  readingProgress: true,
  sectionThemes: true,
  magneticLinks: true,
  pointerTrail: true,
  heroScene: true,
  objectShowcase: true,
  projectFilters: true,
  projectDetails: true,
  projectCarousel: true,
  storyCollage: true,
  marquees: true,
  timeline: true,
  localClock: true,
  backToTop: true,
});

const media = window.matchMedia('(prefers-reduced-motion: reduce)');
let paused = false;
try { paused = localStorage.getItem('bb-motion') === 'off'; } catch { /* Storage can be unavailable. */ }

export function motionEnabled() { return !media.matches && !paused; }
export function prefersReducedMotion() { return media.matches; }
export function toggleMotion() {
  if (media.matches) return;
  paused = !paused;
  try { localStorage.setItem('bb-motion', paused ? 'off' : 'on'); } catch { /* Keep the session setting. */ }
  notifyMotion();
}
function notifyMotion() {
  document.documentElement.dataset.motion = motionEnabled() ? 'on' : 'off';
  window.dispatchEvent(new CustomEvent('portfolio:motionchange', { detail: { enabled: motionEnabled() } }));
}
media.addEventListener('change', notifyMotion);
document.documentElement.dataset.motion = motionEnabled() ? 'on' : 'off';
