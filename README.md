# Benedicto Boseke — personal website

A static GitHub Pages portfolio with original blue WebGL sculptures, real public projects, and optional motion. The website needs no build, runtime packages, CDNs, or external fonts.

## Preview and trim

Requires Node.js 18+. Run `npm start`, then open http://127.0.0.1:4173 . Set `PORT` to choose another port. Use HTTP rather than opening index.html directly, because native ES modules need a server.

All experiments are enabled in `scripts/features.js`. Change a flag to `false` and reload. Optional sections and their menu links are removed together; disabling the carousel restores a regular project grid. See [FEATURES.md](FEATURES.md) for the numbered inventory and REA reference mapping.

## Structure

- `index.html`: semantic content and real project/social links, available without JavaScript.
- `style/home.css`: responsive design, typography, project illustrations, and motion.
- `style/scenes.css`: scene containers and static artwork.
- `scripts/features.js`: feature switches and persistent motion preference.
- `scripts/experience.js`: menu, section transitions, text/reveal effects, pointer trail, progress, and clock.
- `scripts/scenes.js`: original native WebGL geometry, lighting, interaction, and lifecycle.
- `scripts/portfolio.js`: project filters/carousel/dialogs and copy-link action.
- `scripts/projects.js`: verified dialog metadata. Keep matching static cards in index.html in sync when editing projects.

Content is a snapshot of public GitHub metadata and READMEs checked 15 October 2026. LinkedIn retains the destination from the original site. No employer, achievement, availability, email, or hobby was invented.

REA findings from landonorris.com informed the mechanics. The code and artwork are original; no Lando portrait, model, texture, Rive animation, font, or bundle is included. Native browser APIs provide equivalents without Webflow, Three.js, GSAP, Lenis, Taxi, or Rive dependencies.

## Verify

```sh
npm run check
npm ci
npm start
# In another terminal, with the preview server running:
npm test
```

Browser tests use playwright-core and an existing Chrome executable. Set `BROWSER_PATH` if Chrome is not at the Windows default path. `TEST_URL` and `TEST_ARTIFACTS` are optional. Installing test dependencies does not download a browser binary.

The suite covers desktop/mobile navigation, focus and history, filters/dialogs/carousel, actual object pixel changes, WebGL context loss/recovery, motion preferences, no-WebGL/no-JavaScript fallbacks, feature removal, page errors, and missing assets. GitHub Pages serves the repository directly; the test dependency and preview server are development-only.
