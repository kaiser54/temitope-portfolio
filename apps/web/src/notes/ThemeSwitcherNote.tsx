import type { ReactNode } from 'react'
import { InterruptDemo, PromptBlock, ShakeDemo, TweakDemo } from '../components/NoteDemos'

const C = ({ children }: { children: ReactNode }) => <code className="note-inline">{children}</code>

const PROMPT = `Build a theme switch for a site footer that is a word, not an icon: each click cycles Light → Dark → System.

Use /emil-design-eng and /apple-design for the motion decisions, and /animation-vocabulary to name the effect (a staggered letter roll with a blur-in).

- Split each word into inline-block letters. Incoming letters start 70% below, at opacity 0 with a 2px blur, and settle in 300ms (opacity and blur in 240ms) on cubic-bezier(0.23, 1, 0.32, 1), 18ms apart.
- Outgoing letters roll up 70% and fade: 200ms movement, 160ms fade, 12ms apart.
- Use CSS transitions with @starting-style, not @keyframes. Keep the current word mounted and flip a data-out attribute, so a second click mid-roll retargets instead of restarting.
- Animate the button's width to the measured incoming word on the same 300ms curve. Position every word absolutely against the right edge (the edge that doesn't move), give the box height: 1lh, and box-sizing: content-box with a 2px gutter so blurred letters aren't clipped.
- Switch every other colour in one frame: add a class to <html> for two frames that sets transition: none on everything except the letters and the box.
- Reduced motion: letters only fade (150ms), the width jumps.
- Accessible name like "Theme: Light. Switch to Dark"; the letters are aria-hidden.

Then run /review-animations on the result, fix what it finds with /improve-animations, and check the details against /userinterface-wiki.`

/** Build log: the footer theme switch. Short; the demos carry the detail. */
export function ThemeSwitcherNote() {
  return (
    <>
      <p>
        The theme switch in the footer is a word. Click it and the letters roll out, the next word rolls in, and the
        button eases to the new width. Three animations that have to read as one.
      </p>

      <TweakDemo />

      <h2>Transitions, not keyframes</h2>
      <p>
        With <C>@keyframes</C>, interrupting a word restarts its exit, so it flashes back to full before leaving.
        Transitions continue from wherever the letters are.
      </p>
      <InterruptDemo />

      <h2>Pin the words</h2>
      <p>
        In a grid, the column stays as wide as the longest word on screen, so the text clips and then jumps. Pinned to
        the right edge, which never moves, it holds still.
      </p>
      <ShakeDemo />

      <h2>One frame for colour</h2>
      <p>
        Every other transition is off for two frames while the theme flips, so only the letters animate.
      </p>

      <h2>Recreate it</h2>
      <PromptBlock prompt={PROMPT} />
    </>
  )
}
