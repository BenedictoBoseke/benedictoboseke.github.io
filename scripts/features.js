// Set this false to remove the temporary customizer and ignore browser overrides.
export const customizationEnabled = true;
// Source defaults stay separate from this browser's temporary preview settings.
export const featureDefaults = Object.freeze({
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

export const features = { ...featureDefaults };
const previewStorageKey = 'bb-feature-preview-v1';
if (customizationEnabled) {
  try {
    const saved = JSON.parse(localStorage.getItem(previewStorageKey) || '{}');
    for (const key of Object.keys(featureDefaults)) {
      if (typeof saved?.[key] === 'boolean') features[key] = saved[key];
    }
  } catch { /* Corrupt or unavailable storage keeps source defaults. */ }
}
export function setFeatures(values) {
  const changed = [];
  for (const key of Object.keys(featureDefaults)) {
    if (typeof values[key] === 'boolean' && features[key] !== values[key]) {
      features[key] = values[key];
      changed.push(key);
    }
  }
  if (!changed.length) return;
  try { localStorage.setItem(previewStorageKey, JSON.stringify(features)); } catch { /* Session-only preview still works. */ }
  window.dispatchEvent(new CustomEvent('portfolio:featureschange', { detail: { changed } }));
}
export function resetFeatures() {
  setFeatures(featureDefaults);
  try { localStorage.removeItem(previewStorageKey); } catch { /* Defaults already applied. */ }
}

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
