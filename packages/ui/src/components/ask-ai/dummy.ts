/**
 * Stand-in for Ship's AI enhance endpoint: canned replies after a short wait, abortable like the real call.
 * The letter and the replies to "you're my confidant" are the ones in the Figma file (Daash Restaurant,
 * "AI - For text").
 */

export type EnhanceRequest =
  | { action: 'improve'; text: string }
  | { action: 'fix-spelling'; text: string }
  | { action: 'tone'; text: string; tone: string }
  | { action: 'prompt'; text: string; prompt: string }

export type Respond = (req: EnhanceRequest, signal: AbortSignal) => Promise<string>

export const SAMPLE_LETTER = [
  'From the moment you entered my life, you brought with you a light that I never knew I was missing. It’s as though you’ve painted my world with colors I’d never seen before, and every day with you feels like the beginning of a beautiful masterpiece.',
  'I often find myself in awe of you—the way you smile, the sound of your laughter, the way your eyes light up when you’re excited. It’s in these little moments that I realize how lucky I am to call you mine. You’re not just the person I love; you’re my confidant, my biggest inspiration, and the one who makes my heart race with a simple glance.',
]

/** Paragraph rewrites, used when "Improve" runs on (most of) a paragraph. */
const IMPROVED_PARAGRAPHS = [
  'From the moment you came into my life, you brought a light I never knew I was missing. You painted my world in colours I had never seen, and every day with you feels like the first stroke of a masterpiece.',
  'I’m still in awe of you: your smile, your laugh, the way your eyes light up when something excites you. Those small moments remind me how lucky I am to call you mine. You’re not only the person I love; you’re my confidant, my greatest inspiration, and the one whose glance still makes my heart race.',
]

/** Short selections, matched on a keyword. From the Figma states. */
const SHORT: { match: RegExp; improve: string; longer: string }[] = [
  {
    match: /confidant/i,
    improve: 'you’re my trusted friend',
    longer:
      'You are truly my confidant, the one I can always rely on to share my deepest thoughts and secrets without fear of judgment.',
  },
  {
    match: /inspiration/i,
    improve: 'my greatest inspiration',
    longer: 'my biggest inspiration, the reason I keep reaching for more than I ever thought I could',
  },
  {
    match: /masterpiece/i,
    improve: 'the first stroke of a masterpiece',
    longer: 'the beginning of a beautiful masterpiece that I hope we keep painting together for the rest of our lives',
  },
]

const TONES: Record<string, string> = {
  Romantic: 'you’re the keeper of my heart and every secret in it',
  Warm: 'you’re the person I always want to tell everything to',
  Playful: 'you’re my partner in crime and my favourite secret-keeper',
  Sincere: 'you’re the one I trust most in the world',
  Sweet: 'you’re my safe place and my best friend',
  Thoughtful: 'you’re the one who listens, really listens, and understands',
  Gentle: 'you’re where my thoughts can rest',
  Passionate: 'you’re the one I’d share every breath and every secret with',
}

const TYPOS: [RegExp, string][] = [
  [/\bbecuase\b/g, 'because'],
  [/\bdefinately\b/g, 'definitely'],
  [/\balot\b/g, 'a lot'],
  [/\buntill\b/g, 'until'],
  [/\brecieve\b/g, 'receive'],
  [/\bteh\b/g, 'the'],
  [/\bi\b/g, 'I'],
]

const fixSpelling = (s: string) => TYPOS.reduce((t, [re, fix]) => t.replace(re, fix), s)

function reply(req: EnhanceRequest): string {
  const short = SHORT.find((s) => s.match.test(req.text) && req.text.split(/\s+/).length <= 12)
  switch (req.action) {
    case 'fix-spelling':
      return fixSpelling(req.text)
    case 'improve': {
      if (short) return short.improve
      const i = SAMPLE_LETTER.findIndex((p) => p.includes(req.text) || req.text.includes(p))
      return i >= 0 && req.text.length > SAMPLE_LETTER[i].length / 2 ? IMPROVED_PARAGRAPHS[i] : fixSpelling(req.text)
    }
    case 'tone':
      return TONES[req.tone] ?? req.text
    case 'prompt':
      return short?.longer ?? `${req.text.replace(/[.\s]+$/, '')}, and I hope you know how much that means to me.`
  }
}

/** Resolves with a canned reply after ~1.4s; rejects with an AbortError if cancelled. */
export const fakeRespond: Respond = (req, signal) =>
  new Promise((resolve, reject) => {
    const id = setTimeout(() => resolve(reply(req)), 1200 + Math.random() * 500)
    signal.addEventListener('abort', () => {
      clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
