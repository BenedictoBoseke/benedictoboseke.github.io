import { features, featureDefaults, setFeatures, resetFeatures } from './features.js';

const groups = [
  ['Navigation', [
    ['overlayMenu', 'F01', 'Fullscreen menu', 'Animated navigation and link previews.', 'home'],
    ['sectionTransitions', 'F02', 'Section wipes', 'A blue wipe when following section links.', 'work'],
    ['smoothScroll', 'F05', 'Smooth scrolling', 'Native smooth movement when section wipes are off.', 'work'],
    ['readingProgress', 'F06', 'Reading progress', 'The thin progress bar along the top.', 'timeline'],
    ['sectionThemes', 'F07', 'Adaptive header', 'Header colors follow the current section.', 'about'],
    ['backToTop', 'F19', 'Back to top', 'A shortcut in the page footer.', 'connect'],
  ]],
  ['Motion & graphics', [
    ['splitHeadings', 'F03', 'Heading entrances', 'Words animate into place.', 'home'],
    ['scrollReveals', 'F04', 'Scroll reveals', 'Content appears as it enters the viewport.', 'about'],
    ['magneticLinks', 'F08', 'Magnetic buttons', 'Gentle attraction toward your mouse.', 'connect'],
    ['pointerTrail', 'F09', 'Pointer trail', 'Small particles follow your mouse.', 'home'],
    ['heroScene', 'F10', '3D hero', 'The interactive blue knot.', 'home'],
    ['objectShowcase', 'F11', '3D playground', 'Orbit, Ribbon, and Constellation studies.', 'objects'],
    ['marquees', 'F16', 'Moving typography', 'The blue scrolling statement strip.', 'work'],
  ]],
  ['Content & projects', [
    ['projectFilters', 'F12', 'Project filters', 'All, Web, and Python categories.', 'work'],
    ['projectDetails', 'F13', 'Project details', 'The + buttons and project dialogs.', 'work'],
    ['projectCarousel', 'F14', 'Project carousel', 'Horizontal rail; off restores a grid.', 'work'],
    ['storyCollage', 'F15', 'Story collage', 'The illustrated note and code artwork.', 'about'],
    ['timeline', 'F17', 'Project timeline', 'Five milestones from public repositories.', 'timeline'],
    ['localClock', 'F18', 'Jakarta clock', 'Current WIB time in the footer.', 'connect'],
  ]],
];

export function initCustomizer() {
  const controller = new AbortController();
  const { signal } = controller;
  const toggle = document.getElementById('customize-toggle');
  const panel = document.getElementById('customize-panel');
  if (!toggle || !panel) return () => {};
  const list = panel.querySelector('#customize-options');
  for (const [title, entries] of groups) {
    const group = document.createElement('fieldset');
    const legend = document.createElement('legend'); legend.textContent = title; group.append(legend);
    for (const [key, id, label, description, target] of entries) {
      const row = document.createElement('div'); row.className = 'customize-row';
      const control = document.createElement('label'); control.htmlFor = `feature-${key}`;
      const copy = document.createElement('span'); copy.className = 'customize-copy';
      const name = document.createElement('strong'); name.textContent = `${id} · ${label}`;
      const note = document.createElement('small'); note.textContent = description;
      copy.append(name, note);
      const input = document.createElement('input'); input.type = 'checkbox'; input.id = `feature-${key}`; input.name = key; input.dataset.featureControl = key;
      input.addEventListener('change', () => setFeatures({ [key]: input.checked }), { signal });
      control.append(copy, input);
      const locate = document.createElement('a'); locate.href = `#${target}`; locate.textContent = 'View ↗'; locate.className = 'customize-view'; locate.setAttribute('aria-label', `View ${label}`);
      row.append(control, locate); group.append(row);
    }
    list.append(group);
  }
  const sync = () => {
    panel.querySelectorAll('[data-feature-control]').forEach(input => { input.checked = features[input.name]; });
    const enabled = Object.values(features).filter(Boolean).length;
    const changed = Object.keys(featureDefaults).filter(key => features[key] !== featureDefaults[key]).length;
    panel.querySelector('#customize-status').textContent = `${enabled} of 19 features on${changed ? ` · ${changed} changed` : ' · default version'}`;
    panel.querySelectorAll('.customize-view').forEach(link => {
      const section = document.getElementById(link.hash.slice(1));
      link.hidden = !section || section.hidden;
    });
  };
  const setOpen = open => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close customization ×' : 'Customize ✳';
  };
  toggle.hidden = false;
  toggle.addEventListener('click', () => setOpen(panel.hidden), { signal });
  panel.querySelector('#customize-close').addEventListener('click', () => { setOpen(false); toggle.focus({ preventScroll: true }); }, { signal });
  panel.querySelector('#features-on').addEventListener('click', () => setFeatures(Object.fromEntries(Object.keys(featureDefaults).map(key => [key, true]))), { signal });
  panel.querySelector('#features-off').addEventListener('click', () => setFeatures(Object.fromEntries(Object.keys(featureDefaults).map(key => [key, false]))), { signal });
  panel.querySelector('#features-reset').addEventListener('click', resetFeatures, { signal });
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); toggle.focus({ preventScroll: true }); }
  }, { signal });
  window.addEventListener('portfolio:featureschange', sync, { signal });
  sync();
  if (new URLSearchParams(location.search).get('customize') === '1') setOpen(true);
  return () => { controller.abort(); list.replaceChildren(); panel.hidden = true; toggle.hidden = true; };
}
