# ThemeSwitchThumb: rehearsal notes

The animated thumbnail on the "Rolling a Theme Switcher, Letter by Letter" note card.

## Where it came from
- **Starting point:** stageshow's `close-up` example: one control at 1.3x with its window's chrome, inset at the top and sides, running off the bottom, with the subject row whole.
- **Kit:** copied to `src/stageshow/kit`. This scene imports only `stage`, `window` and `act`, not the kit's index.

## What changed from the example
- **Window:** a quiet browser window on `temitopeagboola.com`. Inside it, the site's own footer, drawn with the real `RollingText` and the site's light and dark colours (`#f9f9f9` / `#090909`).
- **Story:** three clicks, Light → Dark → System → Light, about 10s per loop. The page flips colour in the frame of the click, as the note describes. The last click brings it back to where it began, so the reset has a seen cause.
- **Poster:** Dark (the payoff), shown under reduced motion.
- **Cursor:** the large style, to match the zoom. It rests on empty footer between the name and the switch, measured from the footer row so it doesn't drift as the word changes width. It starts at the same point, so the loop seam is clean.
- **Browser chrome:** follows the site's theme (the stage's `theme`). The page inside keeps its own story.
- **Ground:** the card thumbnail has a slightly sunken fill with a hairline under it, so the window bleeds off a picture rather than mid-card.

## Film lines left in, and why
- **`hard edge` on `.roll-letter`:** the letters are clipped by the roll box as they roll. That's the real switch's design, the one the note documents.
- **`vanishes with no exit` on `.roll-word`:** a false positive. The word's letters have already faded to 0 when the empty word is removed.
- **`dark slab`:** the page going dark inside a light browser is the story.
- **`steps in its box`, at 390 only:** the notes panel's own page-load entrance (a 6px fade-up) moving the card. Nothing in the scene.

## Checked
- `--gate` passes at the desktop width and at 390.
- The first click, frame by frame.
- Stills in both site themes.
- Production build: the scene is a lazy chunk (about 17 kB of JS and 6 kB of CSS, gzipped), loaded after hydration.

## Not checked
- WebKit and Firefox.
- A real phone.
- Reduced motion on a live page (the poster is set, but I haven't looked at it there).
- The card morph with the thumbnail mid-animation, beyond a click-through.
