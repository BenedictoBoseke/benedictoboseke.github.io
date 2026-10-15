# Feature inventory for review

All 19 optional experiments start enabled. Use **Customize ✳** at the bottom right to change them in real time. All on, All off, and Reset make comparisons easy. Choices persist in this browser only; source defaults stay in `scripts/features.js`.

The hamburger remains available inside the open menu. Click it again to close using the opening ellipse in reverse. Escape and section links also animate the close; reduced motion closes immediately. Rapid clicks can reverse an in-progress close.

| ID | Added feature | What to try | Switch |
|---|---|---|---|
| F01 | Animated fullscreen navigation | Menu reveal, staggered links, hover/focus preview, Escape | `overlayMenu` |
| F02 | Section wipe transitions | Follow section links; try Back/Forward | `sectionTransitions` |
| F03 | Split-word heading entrances | Reload with motion enabled; original breaks/emphasis remain | `splitHeadings` |
| F04 | Scroll-triggered reveals | Scroll through copy and timeline | `scrollReveals` |
| F05 | Native smooth anchor scrolling | Smooth movement when a section wipe is disabled | `smoothScroll` |
| F06 | Reading progress bar | Thin top-edge indicator while scrolling | `readingProgress` |
| F07 | Section-aware header colors | Header follows light/dark/blue sections | `sectionThemes` |
| F08 | Magnetic links/buttons | Gentle mouse-following calls to action | `magneticLinks` |
| F09 | Pointer particle trail | Move a mouse with motion enabled | `pointerTrail` |
| F10 | Interactive blue WebGL hero | Rotate the knot with mouse/arrow keys; reset | `heroScene` |
| F11 | Interactive 3D study showcase | Orbit / Ribbon / Constellation; rotate and reset | `objectShowcase` |
| F12 | Project filtering | All / Web / Python | `projectFilters` |
| F13 | Project detail dialogs | + opens description, language, repository date, source link | `projectDetails` |
| F14 | Horizontal project carousel | Arrows, keyboard, native horizontal scrolling | `projectCarousel` |
| F15 | Editorial story collage | Original code/note/signature artwork in About | `storyCollage` |
| F16 | Typography marquee | Moving blue statement strip; pauses offscreen | `marquees` |
| F17 | Repository milestone timeline | Five real dated entries linked to source | `timeline` |
| F18 | Indonesia local clock | Jakarta time in WIB in the footer | `localClock` |
| F19 | Back-to-top navigation | Footer shortcut after scrolling | `backToTop` |

The following supporting additions have no experiment flag; they can be edited normally. Accessibility and fallbacks should stay when visual experiments are trimmed.

| ID | Supporting addition | Details |
|---|---|---|
| F20 | Persistent motion pause/resume | Respects OS reduced motion; never overrides that preference |
| F21 | Six real project showcases | TV Show Finder, Machine Learning, URL Shortener, Form & File Upload, Human × Computer, Security Programming; original abstract illustrations |
| F22 | Responsive personal visual system | Existing blue identity, cream/ink sections, oversized type, monogram, mobile and landscape layouts |
| F23 | Social/contact section and copy-site-link action | Original GitHub/LinkedIn destinations; usable URL fallback if clipboard permission is unavailable |
| F24 | Accessibility and graceful fallback | Skip link; native dialogs/focus/Escape; keyboard rotation; live feedback; static artwork without WebGL; content without JS; paused offscreen/hidden rendering |
| F25 | Metadata and asset repairs | Description/Open Graph, dynamic copyright year, corrected manifest/icon paths; removed missing space.css, empty Instagram destination, and external icon-kit requirement |
| F26 | Temporary live customizer | All 19 switches, All on/off/Reset, feature View links, browser-local preferences, mobile bottom panel. Set `customizationEnabled = false` to remove it and ignore stored overrides |

## Adaptation from the REA reference

| Observed reference mechanic | Personal-site implementation |
|---|---|
| Portrait / helmet WebGL hero | Original procedural blue knot; no portrait/depth-map assets were supplied |
| Helmet variant showcase | Three original geometric studies with lit materials and rotation |
| Rive/GSAP navigation and transitions | Native modal dialog, CSS entrance/stagger, Web Animations section wipes |
| Lenis / ScrollTrigger | Native anchor scrolling, IntersectionObserver reveals/render gating |
| Fluid cursor distortion | Lightweight particle trail and pointer-driven sculpture; not a fluid simulation |
| On Track / Off Track | Selected Work / About, grounded in existing content |
| Calendar/results | Repository milestone timeline; no race data or invented personal schedule |
| Photo collage / huge type / rolling statements | Original code/note collage, serif/grotesk typography, marquee |
| Merchandise/sponsor/newsletter sections | Project links and original social destinations; no fake store, sponsor, signup service, or contact form |

This is a broad working interpretation, not a reproduction of every Lando animation or technology. No reference code or assets are shipped. Runtime resources remain local, with no package/CDN/font dependencies. WebGL DPR is capped at 1.5 and rendering pauses offscreen/when hidden. Test packages are development-only.

## Evidence and checks

Reference: https://landonorris.com/ . Exact REA records:

- `ev_3970ff098b27d6a1ec1fa77f8d6fcf23dfbfef9c11e75dc5485e83d4a4efc0c4`: reference page/code/resources/screenshot.
- `ev_10cc7b60d02dd0ba06ffd8562c03f8c4c0bca8cead3fb5e7a01313511bbb19d4`: expanded reference bundle analysis.
- `ev_1f75324c1587fe660e20b59e8f071a9ff81aa14bb512d2680dcd899e0c0a299e`: original Ben website and its missing stylesheet/manifest.
- `ev_b59653ce5c3762996f71221524d389b722c7dfbba051ae8d7761f9f97997628e`: working preview flow, menu → section transition → Python filter → details/Escape → Ribbon → motion pause. All actions completed, with no captured page error.

Validation: **45 portfolio checks plus 31 customization/menu checks passed**. These cover live switches, persistence/reset, removal/restoration of sections, mobile panel sizing, matching close animation, rapid toggle reversal, focus restoration, and reduced motion. No captured JavaScript errors; no missing local resources in the portfolio suite. Syntax and `git diff --check` passed. Desktop 1440 × 1000 and mobile 390 × 844 screenshots were visually inspected. Viewport checks do not establish physical-device GPU performance or Core Web Vitals.

Delivery: review branch/draft pull request plus local preview. No production merge or GitHub Pages deployment was performed during this initial feature-review pass.
