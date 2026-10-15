import { features } from './features.js';
import { initExperience } from './experience.js';
import { initPortfolio } from './portfolio.js';
import { initScenes } from './scenes.js';

// Flags remove each experiment and its associated links as one unit.
document.querySelectorAll('[data-feature]').forEach(element => {
  const enabled = features[element.dataset.feature] === true;
  element.hidden = !enabled;
  if (!enabled && element.id) document.querySelectorAll(`a[href="#${element.id}"]`).forEach(link => { link.hidden = true; });
});
for (const id of ['motion-toggle', 'copy-profile', 'hero-reset', 'object-reset']) {
  const element = document.getElementById(id);
  if (element) element.hidden = id === 'hero-reset' ? !features.heroScene : id === 'object-reset' ? !features.objectShowcase : false;
}
document.querySelector('.object-selectors').hidden = !features.objectShowcase;
const cleanup = [initExperience(), initPortfolio(), initScenes()];
document.documentElement.dataset.ready = 'true';
// Keep BFCache pages alive; initialize just once and dispose only on real unload.
window.addEventListener('pagehide', event => { if (!event.persisted) cleanup.reverse().forEach(dispose => dispose()); });
