# Motion migration

Moving the site's interaction animation onto [Motion](https://motion.dev) (`motion/react`), so new
explorations share one engine: springs that carry velocity, interruptible gestures, enter/exit, layout.

## Rules

- **One engine, loaded lazily.** `LazyMotion` + `m` components, features loaded after hydration, so
  first paint doesn't wait on animation code. `MotionConfig reducedMotion="user"` everywhere.
- **Springs as tokens.** Every spring lives in `apps/web/src/motion.ts`, converted 1:1 from the
  hand-written ones (`k` → stiffness, `c` → damping, mass 1), so the feel doesn't drift.
- **Motion values, not React state,** for anything that moves every frame (drags, underline, string).
- **The engine loads on idle.** Gesture code calls `animate` from `src/animate.ts`, which fetches
  Motion's animation engine after hydration instead of shipping it in the main bundle.
- **Stays CSS (on purpose):**
  - hover / colour / press transitions: no physics, nothing to interrupt;
  - the page entrance (`.enter`): it runs on prerendered HTML before JS loads, which Motion can't;
  - `RollingText` and its note demos: the theme-switcher note documents the CSS technique;
  - the theme-switch colour freeze, image fade-ins, the company mark growing in on hover,
    the row highlight's fade.

Baseline (before): main JS 442.1 kB (143.6 kB gzip) · ask-ai chunk 150.8 kB (49.4 kB gzip).

## Todo

- [x] 0. Ask AI demo: page jumped when the Ask AI input opened (Chrome scroll anchoring on the focused input)
- [x] 1. Set up Motion in the app: dependency, `MotionProvider` (LazyMotion + MotionConfig), spring tokens
- [x] 2. Tab underline (`RubberIndicator`) → two motion-value edges with their own springs
- [x] 3. Swipe between tabs (`useSwipeTabs`) → drag follow, spring back, throw
- [x] 4. Tab panels enter / exit → direction-aware, springy landing after a swipe
- [x] 5. Footer string → motion-value spring
- [x] 6. Project row highlight → spring on y + height
- [x] 7. Project accordion: panel height + plus icon → Motion
- [x] 8. Notes filter: list swap → AnimatePresence
- [x] 9. Select popup + company hover card open / close → Motion
- [x] 10. Timeline demo playback (theme-switcher note) → Motion
- [x] 11. Ask AI demo → `m` + the shared lazy features
- [x] 12. Verify: bundle before/after, prerender, reduced motion, gestures in Chrome, no hydration warnings

## Result

| | Before | After |
|---|---|---|
| Main JS (gzip) | 143.6 kB | 161.7 kB (+18.1: Motion's `m`, AnimatePresence, motion values) |
| Ask AI chunk (gzip) | 49.4 kB | 22.2 kB (shares Motion with the site) |
| Loaded on idle (gzip) | — | 17.1 kB (animation engine + features) |

Checked in Chrome on the production build: tab clicks, slow drag (springs back with overshoot),
fast swipe (old panel thrown on, new one lands), back / forward, footer pluck, row highlight glide,
accordion open / close + icon turn, notes filter menu + list, company hover card, Ask AI demo (no
page jump), timeline playback. Every route hydrates without errors, with and without reduced motion.

## Where things live

- `apps/web/src/motion.tsx`: `MotionProvider`, spring tokens, `prefersReducedMotion()`
- `apps/web/src/animate.ts`: lazy `animate()` (use this, not `motion/react`'s, in app code)
- `packages/ui`: accordion + hover card render `m` elements, so they need `MotionProvider` above them
