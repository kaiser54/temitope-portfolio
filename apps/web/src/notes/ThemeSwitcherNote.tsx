import { CodeBlock } from '../components/CodeBlock'
import { InterruptDemo, RollDemo, ShakeDemo, TimelineDemo } from '../components/NoteDemos'
import { C, Ext, Footnotes, Ref } from '../components/NoteKit'

const TIMINGS = `.roll {
  --in: 300ms;        /* letters settle; opacity and blur take 80% of it */
  --stagger: 18ms;    /* between letters */
  --travel: 70%;      /* how far below a letter starts */
  --blur: 2px;
  --ease: cubic-bezier(0.23, 1, 0.32, 1);
}
/* Leaving is two thirds of arriving: 200ms, 12ms apart, fade in 160ms. */`

const KEEP_MOUNTED = `// New text: the current word stays mounted and flips to "out";
// the next one is added beside it and enters via @starting-style.
setWords((ws) => [...ws, { id, text, enter: true }])

<span className="roll-word" data-out={!isCurrent || undefined}>`

const ONE_FRAME = `root.classList.add('theme-switching')
root.dataset.theme = dark ? 'dark' : undefined
requestAnimationFrame(() =>
  requestAnimationFrame(() => root.classList.remove('theme-switching')))

/* everything except the letters and their box */
.theme-switching *:not(.roll, .roll-letter) { transition: none !important; }`

/** Behind the note's Copy Prompt button: every value on the page, for a coding agent. */
export const THEME_SWITCHER_PROMPT = `Build a theme switch for a site footer that is a word, not an icon. Each click cycles Light → Dark → System. React and plain CSS, no animation library.

Letters
- Split each word into inline-block letters, aria-hidden. Name the button like "Theme: Light. Switch to Dark".

Enter
- Incoming letters start 70% below, at opacity 0 with blur(2px).
- They settle over 300ms; opacity and blur finish in 240ms. Curve: cubic-bezier(0.23, 1, 0.32, 1).
- 18ms between letters.

Leave
- Outgoing letters roll up 70% and fade: 200ms movement, 160ms fade and blur, 12ms between letters. Leaving is two thirds of arriving.

Interruptible
- Use CSS transitions with @starting-style, not @keyframes, so a click mid-roll carries on from where the letters are instead of restarting.
- Keep the current word mounted and flip a data-out attribute on it; add the next word beside it. Remove words once they've left (about 400ms).

Width
- Measure the incoming word in a layout effect and transition the button's width to it on the same 300ms curve.
- Position every word absolutely against the right edge, the edge that doesn't move. Don't stack them in a grid cell: the column stays as wide as the widest word, so the text clips, then jumps.
- Give the box height: 1lh and overflow: hidden, with box-sizing: content-box and a 2px gutter (padding, cancelled by negative margin) so blurred letters aren't clipped.

Colour
- Switch every other colour in one frame: add a class to <html> for two animation frames that sets transition: none on everything except the letters and the box.

Reduced motion
- Letters only fade, over 150ms with no stagger. The width jumps.`

/** Build log: the footer theme switch. */
export function ThemeSwitcherNote() {
  return (
    <>
      <p>
        The theme switch in this site's footer is a word, not an icon. Press it and the letters of the old word roll up
        and out, the next word rolls in from below, and the button eases to the new width. That's three animations that
        have to read as one, at any speed and from any point, in plain CSS.
      </p>
      <p>
        This page is how I got the letters, the width and the colour to agree, and what went wrong on the way. Its shape
        is borrowed from Raphael Salaja.
        <Ref n={1} /> Click the word below, then change any value under it.
      </p>

      <RollDemo />

      <h2>Anatomy</h2>
      <p>
        It's three parts, each with one job: the letters, the word they belong to and the box that holds the words.
      </p>
      <p>
        Each word is split into inline-block letters, hidden from screen readers. The button itself is named “Theme:
        Light. Switch to Dark”, so it reads as one control and not five letters.
      </p>
      <p>
        The box is <C>height: 1lh</C> with <C>overflow: hidden</C>, so a letter more than a line away is out of sight.
        It uses <C>content-box</C> sizing with a <C>2px</C> gutter, padding cancelled by a negative margin, so a blurred
        letter isn't shaved at the edge.
      </p>

      <h2>Letters In, Letters Out</h2>
      <p>
        A letter starts <C>70%</C> below its line, at opacity 0 behind a <C>2px</C> blur, and settles over{' '}
        <C>300ms</C>, <C>18ms</C> after the one before it. Opacity and blur finish early, at <C>240ms</C>, so a letter
        is sharp before it lands.
      </p>
      <p>
        Leaving is two thirds of arriving: <C>200ms</C>, <C>12ms</C> apart. The old word should be out of the way
        before the new one asks to be read, and a shorter exit gets it there.
      </p>
      <p>
        One curve, <C>cubic-bezier(0.23, 1, 0.32, 1)</C>, drives the letters and the width alike. It starts fast, so
        the press answers at once, and spends the rest of its time arriving. Freezing the roll at a chosen millisecond,
        below, is an idea I took from Ayomidé Daniel.
        <Ref n={2} />
      </p>
      <TimelineDemo />
      <CodeBlock title="index.css" code={TIMINGS} />
      <p>
        Every timing is a variable,
        <Ref n={3} /> so the rows under the demo at the top drive the real component, not a copy. They're modelled on
        Fluid Functionalism's slider.
        <Ref n={4} />
      </p>

      <h2>The Numbers</h2>
      <div className="note-table-wrap">
        <table className="note-table">
          <thead>
            <tr>
              <th>Part</th>
              <th>Duration</th>
              <th>Fade</th>
              <th>Stagger</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Letters in</td><td>300 ms</td><td>240 ms</td><td>18 ms</td></tr>
            <tr><td>Letters out</td><td>200 ms</td><td>160 ms</td><td>12 ms</td></tr>
            <tr><td>Width</td><td>300 ms</td><td>–</td><td>–</td></tr>
            <tr><td>Colour</td><td>1 frame</td><td>–</td><td>–</td></tr>
            <tr><td>Reduced motion</td><td>–</td><td>150 ms</td><td>0 ms</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Letters travel <C>70%</C> of a line and blur by <C>2px</C>, and everything that moves uses the same curve.
      </p>

      <h2>How I Got Here</h2>
      <p>
        The first version used <C>@keyframes</C> and took about <C>520ms</C>. It looked right on one click and fell
        apart on the second.
      </p>

      <h3>Keyframes</h3>
      <p>
        People click again before the roll ends. With <C>@keyframes</C>, changing the animation restarts it, so a word
        interrupted on its way out flashed back to full before leaving. An interface should let you change your mind
        while something is still moving,
        <Ref n={5} /> and this one didn't.
      </p>
      <p>
        Transitions carry on from wherever the letters are, so nothing is replayed. The current word stays mounted and
        flips a <C>data-out</C> attribute; the next word is added beside it and enters through{' '}
        <C>@starting-style</C>.
        <Ref n={6} />
      </p>
      <CodeBlock title="RollingText.tsx" code={KEEP_MOUNTED} />
      <InterruptDemo />

      <h3>The Shake</h3>
      <p>Once it was fast, the text shook while the button resized: it clipped, then jumped into place.</p>
      <p>
        The words sat in one inline-grid cell, and a grid column stays as wide as the widest word on screen. As the box
        narrowed past it, the words aligned to the column's edge, outside the box, so they clipped, then jumped when the
        old word was removed.
      </p>
      <p>
        Now every word is absolutely positioned against the right edge, the one edge that never moves, and the box's
        width eases to the measured incoming word on the same <C>300ms</C> curve.
      </p>
      <ShakeDemo />

      <h3>Colour in One Frame</h3>
      <p>
        The button's colour faded over <C>150ms</C> while the rest of the page snapped, so it lagged behind its own
        theme. Now every other transition is off for two frames, so colour flips at once and only the letters move. The
        blur came down from <C>3px</C> to <C>2px</C> in the same pass.
      </p>
      <CodeBlock title="ThemeToggle.tsx" code={ONE_FRAME} />

      <h2>When to Use It</h2>
      <p>
        I'd use it for a short label that cycles through a few states, where seeing the change is the point: a theme, a
        status, Play turning into Pause (the button in Figure 1 uses the same component). I'd skip it for anything
        longer than a word or two, for text someone is reading while it changes, and for numbers, where rolling letters
        add motion without adding meaning.
      </p>
      <p>
        With reduced motion, the letters only fade, over <C>150ms</C> with no stagger, and the width jumps.
      </p>

      <Footnotes>
        {[
          <>
            <Ext href="https://www.raphaelsalaja.com/work/glass-menu">The Glass Menu</Ext>, Raphael Salaja: the shape of
            this page.
          </>,
          <>
            <Ext href="https://www.dahnizzy.com/card-to-dialog">Card to dialog</Ext>, Ayomidé Daniel: the frame-by-frame
            timeline.
          </>,
          <>
            Every value is a variable at the top of <C>.roll</C> in <C>apps/web/src/index.css</C>.
          </>,
          <>
            <Ext href="https://www.fluidfunctionalism.com/docs/slider">Slider</Ext>, Fluid Functionalism.
          </>,
          <>
            <Ext href="https://developer.apple.com/videos/play/wwdc2018/803/">Designing Fluid Interfaces</Ext>, Apple,
            WWDC 2018.
          </>,
          <>
            <Ext href="https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style">
              <C>@starting-style</C>
            </Ext>
            , MDN.
          </>,
        ]}
      </Footnotes>
    </>
  )
}
