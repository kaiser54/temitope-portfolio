import type { ReactNode } from 'react'
import { InterruptDemo, PromptBlock, ShakeDemo, TimelineDemo, TweakDemo } from '../components/NoteDemos'

const C = ({ children }: { children: ReactNode }) => <code className="note-inline">{children}</code>

function Code({ file, children }: { file: string; children: string }) {
  return (
    <div className="note-code">
      <div className="note-code-file">{file}</div>
      <pre>
        <code>{children}</code>
      </pre>
    </div>
  )
}

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

const PROMPT = `Build a theme switch for a site footer that is a word, not an icon. Each click cycles Light → Dark → System. React and plain CSS, no animation library.

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
        The theme switch in the footer is a word. Press it and the letters roll up and out, the next word rolls in from
        below, and the button eases to the new width. Three animations that have to read as one, at any speed and from
        any point.
      </p>

      <TweakDemo />

      <h2>Problem</h2>
      <p>
        The first version used <C>@keyframes</C> and took about <C>520ms</C>. Click twice and the leaving word jumped
        back to full before it left. The letters wore a heavy <C>3px</C> blur, and the button's colour faded over{' '}
        <C>150ms</C> while the rest of the page snapped, so it lagged behind its own theme.
      </p>
      <p>Then, once it was fast, the text shook while the button resized: it clipped, then jumped into place.</p>

      <h2>Anatomy</h2>
      <p>
        Each word is split into inline-block letters. A letter starts <C>70%</C> below its line, at opacity 0 behind a{' '}
        <C>2px</C> blur, and settles in <C>300ms</C>, <C>18ms</C> after the one before it. Opacity and blur finish
        early, at <C>240ms</C>, so a letter is sharp before it lands.
      </p>
      <p>
        Leaving is two thirds of arriving: <C>200ms</C>, <C>12ms</C> apart. The old word should be out of the way before
        the new one asks to be read.
      </p>
      <Code file="index.css">{TIMINGS}</Code>
      <p>Every timing is a variable, so the playground above drives the real component, not a copy.</p>

      <h2>Frame by frame</h2>
      <p>
        One curve, <C>cubic-bezier(0.23, 1, 0.32, 1)</C>, for letters and width alike. It starts fast, so the press
        answers at once, and spends its time arriving.
      </p>
      <TimelineDemo />

      <h2>Interruptible</h2>
      <p>
        People click again before the roll ends. With <C>@keyframes</C>, changing the animation restarts it, so an
        interrupted word flashes back to full before leaving. Transitions carry on from wherever the letters are.
      </p>
      <p>
        So nothing is replayed. The current word stays mounted and flips a <C>data-out</C> attribute; the next word is
        added beside it and enters through <C>@starting-style</C>.
      </p>
      <Code file="RollingText.tsx">{KEEP_MOUNTED}</Code>
      <InterruptDemo />

      <h2>Pin the words</h2>
      <p>
        The shake came from layout. The words sat in one inline-grid cell, and the column stays as wide as the widest
        word on screen. As the box narrowed past it, the words aligned to the column's edge, outside the box, so they
        clipped, then jumped when the old word was removed.
      </p>
      <p>
        Now every word is absolutely positioned against the right edge, the one edge that never moves, and the box's
        width eases to the measured incoming word on the same <C>300ms</C> curve.
      </p>
      <ShakeDemo />

      <h2>One frame for colour</h2>
      <p>
        The page and the button should change theme together. For two frames every other transition is off, so colour
        flips at once and only the letters move.
      </p>
      <Code file="ThemeToggle.tsx">{ONE_FRAME}</Code>

      <h2>Details</h2>
      <ul>
        <li>
          The box is <C>height: 1lh</C> with <C>content-box</C> sizing and a <C>2px</C> gutter, so blurred letters
          aren't shaved at the edges.
        </li>
        <li>
          With reduced motion, letters only fade over <C>150ms</C> and the width jumps.
        </li>
        <li>
          The button is named “Theme: Light. Switch to Dark”; the letters are <C>aria-hidden</C>.
        </li>
        <li>The Copy button below uses the same component.</li>
      </ul>

      <h2>Use it</h2>
      <p>To build this in your own product, give this prompt to your coding agent. It has every value from this page.</p>
      <PromptBlock prompt={PROMPT} />

      <h2>References</h2>
      <ul>
        <li>
          <a href="https://developer.apple.com/videos/play/wwdc2018/803/" target="_blank" rel="noreferrer">
            Designing Fluid Interfaces
          </a>
          , Apple, WWDC 2018: why motion should be interruptible.
        </li>
        <li>
          <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style" target="_blank" rel="noreferrer">
            @starting-style
          </a>
          , MDN: entry transitions without keyframes.
        </li>
        <li>
          <a href="https://www.fluidfunctionalism.com/docs/slider" target="_blank" rel="noreferrer">
            Slider
          </a>
          , Fluid Functionalism: the scrubber rows in the playground.
        </li>
        <li>
          <a href="https://www.dahnizzy.com/card-to-dialog" target="_blank" rel="noreferrer">
            Card to dialog
          </a>
          , Ayomidé Daniel: the shape of this write-up.
        </li>
      </ul>
    </>
  )
}
