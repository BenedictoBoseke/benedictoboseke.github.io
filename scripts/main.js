import { features, customizationEnabled } from './features.js';
import { initExperience } from './experience.js';
import { initPortfolio } from './portfolio.js';
import { initScenes } from './scenes.js';
import { initCustomizer } from './customize.js';

let cleanups = [];
function applyFeatures(event) {
  const filter = document.querySelector('[data-filter][aria-pressed="true"]')?.dataset.filter;
  const sculpture = document.querySelector('button[data-object][aria-pressed="true"]')?.dataset.object;
  const rail = document.getElementById('project-rail');
  const railScroll = rail.scrollLeft;
  cleanups.reverse().forEach(dispose => dispose());
  if (event?.detail.changed.includes('scrollReveals') && features.scrollReveals) {
    document.querySelectorAll('[data-reveal]').forEach(element => element.classList.remove('is-revealed', 'reveal-pending'));
  }
  document.querySelectorAll('[data-feature]').forEach(element => {
    const enabled = features[element.dataset.feature] === true;
    element.hidden = !enabled;
    if (element.id) document.querySelectorAll(`a[href="#${element.id}"]`).forEach(link => { link.hidden = !enabled; });
  });
  document.querySelectorAll('[data-project]').forEach(card => { card.hidden = false; });
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === 'all')));
  document.getElementById('filter-status').textContent = 'Showing 6 projects.';
  for (const id of ['motion-toggle', 'copy-profile', 'hero-reset', 'object-reset']) {
    const element = document.getElementById(id);
    if (element) element.hidden = id === 'hero-reset' ? !features.heroScene : id === 'object-reset' ? !features.objectShowcase : false;
  }
  document.querySelector('.object-selectors').hidden = !features.objectShowcase;
  document.getElementById('site-header').dataset.theme = 'light';
  cleanups = [initExperience({ animateHeadings: !event || event.detail.changed.includes('splitHeadings') }), initPortfolio(), initScenes()];
  if (features.projectFilters && filter && filter !== 'all') document.querySelector(`[data-filter="${filter}"]`)?.click();
  if (features.projectCarousel) rail.scrollTo({ left: railScroll, behavior: 'instant' });
  if (features.objectShowcase && sculpture) document.querySelector(`button[data-object="${sculpture}"]`)?.click();
  document.documentElement.dataset.ready = 'true';
}
applyFeatures();
window.addEventListener('portfolio:featureschange', applyFeatures);
const disposeCustomizer = customizationEnabled ? initCustomizer() : () => {};
window.addEventListener('pagehide', event => {
  if (!event.persisted) {
    window.removeEventListener('portfolio:featureschange', applyFeatures);
    disposeCustomizer();
    cleanups.reverse().forEach(dispose => dispose());
  }
});
