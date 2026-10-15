import { features, motionEnabled } from './features.js';
import { projects } from './projects.js';

export function initPortfolio() {
  const controller = new AbortController();
  const { signal } = controller;
  const listen = (target, type, listener, options = {}) => target?.addEventListener(type, listener, { ...options, signal });
  const byId = id => document.getElementById(id);
  const rail = byId('project-rail');
  const cards = [...document.querySelectorAll('[data-project]')];
  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const previous = byId('rail-prev'), next = byId('rail-next'), status = byId('rail-status');
  let frame = 0;
  const updateRail = () => {
    frame = 0;
    const shown = cards.filter(card => !card.hidden);
    const bounds = rail.getBoundingClientRect();
    const visible = shown.map((card, index) => ({ rect: card.getBoundingClientRect(), index })).filter(({ rect }) => rect.right > bounds.left + 5 && rect.left < bounds.right - 5);
    if (status) status.textContent = visible.length ? `${String(visible[0].index + 1).padStart(2, '0')}–${String(visible.at(-1).index + 1).padStart(2, '0')} / ${String(shown.length).padStart(2, '0')}` : '00 / 00';
    if (previous) previous.disabled = rail.scrollLeft < 2;
    if (next) next.disabled = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2;
  };
  const queueRail = () => { if (!frame) frame = requestAnimationFrame(updateRail); };
  if (rail) {
    rail.classList.toggle('is-grid', !features.projectCarousel);
    if (features.projectCarousel) {
      const move = direction => rail.scrollBy({ left: direction * (rail.clientWidth + 32), behavior: motionEnabled() ? 'smooth' : 'instant' });
      listen(previous, 'click', () => move(-1));
      listen(next, 'click', () => move(1));
      listen(rail, 'scroll', queueRail, { passive: true });
      listen(window, 'resize', queueRail, { passive: true });
      listen(rail, 'keydown', event => {
        if (event.target !== rail || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
      });
    }
    if (features.projectFilters) filterButtons.forEach(button => listen(button, 'click', () => {
      const value = button.dataset.filter;
      filterButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      cards.forEach(card => { card.hidden = value !== 'all' && card.dataset.category !== value; });
      rail.scrollTo({ left: 0, behavior: 'instant' });
      const count = cards.filter(card => !card.hidden).length;
      byId('filter-status').textContent = `Showing ${count} ${value === 'all' ? '' : `${value === 'python' ? 'Python' : 'web'} `}project${count === 1 ? '' : 's'}.`;
      queueRail();
    }));
    updateRail();
  }

  const dialog = byId('project-dialog');
  let opener;
  if (features.projectDetails && dialog?.showModal) {
    document.querySelectorAll('[data-project-open]').forEach(button => listen(button, 'click', () => {
      const project = projects.find(item => item.id === button.dataset.projectOpen);
      if (!project) return;
      opener = button;
      byId('project-dialog-meta').textContent = project.label;
      byId('project-dialog-title').textContent = project.title;
      byId('project-dialog-description').textContent = project.description;
      byId('project-dialog-language').textContent = project.language;
      byId('project-dialog-date').textContent = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${project.date}T12:00:00Z`));
      byId('project-dialog-link').href = project.url;
      dialog.showModal();
    }));
    listen(dialog.querySelector('.project-dialog-close'), 'click', () => dialog.close());
    listen(dialog, 'click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    listen(dialog, 'close', () => opener?.focus({ preventScroll: true }));
  } else document.querySelectorAll('[data-project-open]').forEach(button => { button.hidden = true; });

  const copy = byId('copy-profile'), copyStatus = byId('copy-status');
  listen(copy, 'click', async () => {
    const url = 'https://benedictoboseke.github.io/';
    copyStatus.textContent = 'Copying site link…';
    let timeout;
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await Promise.race([
        navigator.clipboard.writeText(url),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Clipboard permission pending')), 1500); }),
      ]);
      copyStatus.textContent = 'Site link copied. Thanks for sharing.';
    } catch {
      copyStatus.textContent = `Copy this link: ${url}`;
    } finally {
      clearTimeout(timeout);
    }
  });
  byId('copyright-year').textContent = new Date().getFullYear();
  return () => { controller.abort(); cancelAnimationFrame(frame); if (dialog?.open) dialog.close(); };
}
