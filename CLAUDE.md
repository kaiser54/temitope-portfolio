# Portfolio

## Writing Notes (build logs)

Notes explain one piece of work: what it does, why it moves the way it does, and every value needed to rebuild it. **The primary model is Raphael Salaja's work pages** (raphaelsalaja.com/work/glass-menu, /genie, /progressive-blur, /motion-blur, /command-menu, /notifications). Ayomidé Daniel's write-ups (dahnizzy.com/card-to-dialog, /notifications) are second, used only where noted. The reference note is `apps/web/src/notes/ThemeSwitcherNote.tsx`, which follows this guide; copy its structure.

### Where things go
- Page component: `apps/web/src/notes/<Name>Note.tsx`. Prose is JSX. Code snippets are template-string consts at the top, rendered with `<CodeBlock title="file.tsx" code={...} />`. Export the agent prompt as a const and register it with the body.
- Register each note in `BODIES` in `apps/web/src/components/NotePage.tsx`: `{ Body, prompt, source }`. The page header renders Copy Prompt, Copy Link and View Source (`source` is a GitHub URL for the component), and the closing "Source: GitHub" line.
- Building blocks live in `apps/web/src/components/NoteKit.tsx`:
  - `C` for inline values and `Ext` for external links.
  - `Fig` for a numbered figure (`title`, `aside` for a legend or control, `caption`), with `Key` for legend entries.
  - `Tiles` for comparisons.
  - `Segmented` for controls.
  - `Ref` and `Footnotes` for citations.
  - Tables use `<table className="note-table">` inside `.note-table-wrap`.
- Demos: `apps/web/src/components/NoteDemos.tsx` (or `@repo/ui` for a real component), lazy-loaded where heavy. `RollDemo` is the reference demo: the `.note-demo` stage, then `.note-tweaks` rows and the Bounds/Reset row under it.
- Entry: `notes` in `apps/web/src/content.ts`. It takes `title`, `slug`, `tags: ['build-log']`, `summary`, and a `date` (ISO) only once the note is published. A note without a date shows as "Soon".
- The Notes list shows each note as a card (`.note-card` in `components/Notes.tsx`). Opening one morphs the card into the page, and leaving morphs it back (View Transitions; `apps/web/src/noteMorph.ts`, CSS under "Note morph"). A new note needs nothing extra: NotePage's `.note-sheet` and `.note-title` carry the page side. Keep the page `<h1>` as the note title, because it's where the card's title lands.
- A card can carry an animated thumbnail: a stageshow scene in `apps/web/src/components/thumbs/`, registered in `THUMBS` in `components/Notes.tsx`. Each is lazy-loaded and client-only. Import kit parts from their own files under `src/stageshow/kit/`, not its index. `ThemeSwitchThumb` (with its `REHEARSAL.md`) is the reference: a close-up of the real component, the site's own colours, and a loop whose reset is its last click.

### Titles and listing copy
- Titles are short, in Title Case, and can be playful ("The Genie Effect", "The Apple Doesn't Fall Far From the Tree").
- The summary (the dek) is one fragment ending in a period: what it is, then how it was made. "iOS 27's soft scroll edge, measured and ported." "The macOS minimise, rebuilt from the Dock's own code." "Linear's command menu, as one frame." Verbs that fit: measured, ported, rebuilt, recreated.
- The page shows the dek under the title as "3 November 2026" (day, month name, year), followed by the intro.

### Shape (in this order; drop what doesn't apply)
1. **Intro**, with no heading, in 1–3 short paragraphs. Open with the claim or a question ("How does iOS 27 grow a menu out of a glass button?", "I rebuilt the macOS Genie minimise for the web from the Dock's own code."). Credit whoever found it first, in the first lines, with a footnote. Then say what the page covers ("This page is how I found that function, what it does, and the two ways I found to draw it"). End by inviting the reader to try the demo ("Try changing its status… then press Backspace").
2. **Demo**: the real thing, in the column, with its caption.
3. **Honest framing** where needed: "I've never worked at Linear, so I can't tell you what they were thinking, but I can show what I found and why I think they made each choice."
4. **How I Looked at It / How I Measured It**: the method, such as inspect element, Sources tab, Simulator, screen recording at 120 Hz, frame counting. Readers learn the method as much as the result.
5. **Anatomy**: the parts, each with one job, with sizes ("Rows are 46 tall, and so is the field"). Use an exploded figure.
6. **Mechanism sections**, one H2 per idea, titled as the idea ("Put the Source Inside the Glass", "Two Shapes and a Field", "Height", "The Tint", "Five Patterns"). Inside each: what you see, then what is actually happening, then why I think they did it.
7. **The Numbers**: a table of every value (springs as response, damping and start; or durations and curves).
8. **What I Tried / How I Got Here** when there were dead ends: the attempts in order, and why each failed ("the blur reads as out of focus rather than fast"), with a figure comparing them on the same subject.
9. **On the Web / Porting It**: what changed from native to browser, and the measured gap (scores, px error).
10. **In Code**: an install line plus the smallest usage snippet, and an options table if it's a package.
12. **When to Use It**: one paragraph with where I'd use it and where I'd skip it, concretely ("skip it for text links, long menus and anything opened many times a minute, where three quarters of a second is long"). Then state what isn't done yet ("…aren't in the package yet").
13. **Footnotes**: every citation is a numbered footnote, not a References list. Cite the original creators, Apple docs, MDN, talks and papers. Add one footnote pointing to where every value is recorded, "with the guesses marked".
14. **Source**: a closing link to the code.

Section headings are Title Case. Reduced motion goes in its own short paragraph or under When to Use It, never skipped.

### Voice (Raphael)
- First person throughout ("I rebuilt", "I opened", "I'd use it where"). Past tense for the investigation, present tense for how it works.
- Plain, exact and calm. Long technical sentences broken up by short ones ("Done badly, it turns it into a smudge."). No hype words.
- Hedge honestly where it's inference: "My guess is…", "The way I read it…", "I haven't checked whether…", "I think they did this so…". Never present a guess as fact.
- Every number, with its unit and source ("2.88 points at its strongest, about a tenth of the 32 the stacked version reaches"). Give the arithmetic when it explains something (34 + 46 + 6 + 5 × 46 + 6 = 322).
- Explain why the original made the choice, not only what it is ("An inset pill reads like something you move with the arrow keys").
- Say what failed and what was dropped ("so I dropped it"). State the limits at the end.
- British spelling is fine (colour, minimise), but stay consistent within a page.

### Page design (measured from raphaelsalaja.com)
Use our tokens (`--fg/--muted/--faint/--line`) and never pure white, but keep these proportions.
- **Column**: 640px, with 96px top padding. Body text is 14px with a 24px line height; paragraphs are 12px apart; body colour is a near-black (fg at about 90%), and secondary text is about 55%.
- **Header**: the title (14px, regular weight, fg), then the date under it (muted). Top-right of the header row sits a group of three 16px icon buttons with tooltips: **Copy Prompt** (the agent prompt for the work, replacing the "Use it" section), **Copy Link** and **View Source**.
- **H2**: 14px, regular weight, fg, 40px above. The heading is a flex row with a 16px gap and a 1px hairline (`::after`, fg at 7%) filling the rest of the width. Size never changes; the hairline and the space do the separating.
- **Inline code**: 12px mono, `padding: 1px 5px`, 6px radius, a faint fill and a 1px border at fg 7%.
- **Links**: plain text with a thin underline.
- **Footnote refs**: superscript, 10px, muted, with 4px of left padding.
- **Footnotes**: a hairline above, then a numbered list (number in the left gutter, 14px muted text), each with a ↩ back-link.
- No contents rail, no tags and no reading time.

### Figures
All figures sit in the 640px column, 32px below the text above them.
- **Header row**: "Figure 1" (muted) and a two-space gap, then the title in Title Case (fg), e.g. "Figure 2  Morph Phases". The legend sits right-aligned in the same row (a short line or swatch plus a label: "— Progress  — Field blur  - - Lens"). A 1px hairline sits under the header, and another closes the figure. There's no panel fill or border box.
- **Caption** below the bottom hairline: centred, 12px, muted, one or two sentences describing what's shown ("Progress in every recorded frame, against the straight line fitted through it.").
- **Figure kinds**:
  - **Comparison tiles**: 2–3 tiles in a row, each a 12px-radius box with a 1px hairline, with a label (fg) and one-line spec (muted) under it ("Button as Source / One shape, no field"). Use it for before/after and the attempts.
  - **Phase charts**: line charts, often side by side (Opening | Closing), with dotted lines at 0 and 100%. Axes have only a few tick labels (0, 200 ms, 400 ms; or "start/done", "0/0.5/1 progress"). Lines are black solid for the main value, with blue and grey dashed for the others. Key moments are annotated on the chart with a dotted vertical line and a label ("0.50, as the bottom edge reaches the slot"). Put the measurement in the subtitle ("495 ms, 0.21% off a straight line").
  - **Exploded anatomy**: an isometric line drawing with layers stacked bottom to top. Labels on the left use leader lines and a dot; each label is a name (fg) plus a spec line (muted), e.g. "Surface / 520 × 68 · r14 · two shadows". It's grey linework with a single accent colour.
  - **Dimension diagrams**: wireframe skeletons (grey bars for text, a soft blue highlight row) with measurement brackets and the formula printed above.
  - **Tables**: header row muted, values right-aligned, 1px hairline row dividers, about 40px rows, no fills.

### Code blocks
- **Outer shell**: a faint fill and 12px radius. The header row has a 14px file icon and the filename (muted), plus a copy icon button on the right.
- **Inner card**: the code sits on a raised inner card in the bg colour, inset 4px, 8px radius, `box-shadow: 0 1px 3px oklch(0 0 0 / .08), 0 0 0 1px oklch(0 0 0 / .02)`, 12px padding.
- **Type**: 12px mono with 18px line height. Restrained syntax colours (keywords red, functions purple, strings dark blue, comments grey).
- **Install lines** use a tab row (npm, pnpm, yarn, bun) in place of the filename, with the active tab raised.
- **Length**: snippets are short and are the real code, simplified. Each one says in the prose above it what it does.

### The demo
The demo sits in the column: a stage (640px wide, 12px radius, 1px hairline, bg fill) with the real component in it. **The controls sit directly under the card, always visible. There's no Debug button and no wide debugger panel**; the user removed it and asked for the controls under the card. Below the card come value rows (the `Scrubber` sliders: Duration, Stagger, Travel, Blur, Curve…), then a row with display toggles as `Segmented` (e.g. Bounds Off/On) and a Reset on the right, then the caption. The caption says what to do: "Every value it ships with. Drag a row, or focus it and use the arrow keys. Turn on Bounds to see the box."
- Speed controls for comparison figures go in the figure header's `aside`.
- Big demo text (28px) needs a relative `line-height` (1.3). The note body sets a fixed 24px line height, and `.roll` is `1lh` tall, so without it the descenders get clipped.
- Controls styling: 8–10px radii and 28–38px heights. No pills.

### Agent prompt
Every note has a prompt with every value, written in sections (Open/Enter, Close/Leave, Interruptible, Details, Reduced motion). It's exposed through the header's **Copy Prompt** button, not as a section at the end.
