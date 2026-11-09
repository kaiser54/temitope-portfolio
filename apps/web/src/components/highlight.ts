/**
 * A tiny, dependency-free highlighter for the code and prompts in notes. It only needs to cover
 * what notes show (CSS, TS/TSX, and plain-English prompts), so it's a handful of regexes rather
 * than a grammar. Runs at prerender time and in the browser, so output must be deterministic.
 */
export type Lang = 'code' | 'prompt'
export type Token = { text: string; kind?: TokenKind }
export type TokenKind =
  | 'comment'
  | 'string'
  | 'keyword'
  | 'number'
  | 'prop'
  | 'var'
  | 'at'
  | 'fn'
  | 'tag'
  | 'attr'
  | 'selector'
  | 'heading'
  | 'marker'
  | 'value'

/** Earlier groups win when two could match at the same position. */
const CODE_RULES: [TokenKind, string][] = [
  ['comment', String.raw`\/\*[\s\S]*?\*\/|\/\/[^\n]*`],
  ['string', String.raw`'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|` + '`(?:\\\\.|[^`\\\\])*`'],
  ['tag', String.raw`<\/?[A-Za-z][\w.]*|(?<![=\s])\/?>`],
  ['at', String.raw`@[\w-]+`],
  ['var', String.raw`--[\w-]+`],
  ['keyword', String.raw`\b(?:const|let|var|return|if|else|new|import|export|from|function|true|false|undefined|null|typeof|await|async)\b|!important`],
  ['number', String.raw`(?<![\w-])\d+(?:\.\d+)?(?:ms|px|%|lh|rem|em|deg|s)?(?![\w])`],
  // CSS property, or an object key: a word at the start of a line or after { ; ( , followed by ": "
  ['prop', String.raw`(?<=(?:^|[{;(,])\s*)[a-z][\w-]*(?=\s*:\s)`],
  ['attr', String.raw`\b[\w-]+(?==[{"'])`],
  ['fn', String.raw`\b[A-Za-z_$][\w$-]*(?=\()`],
  // .class, but not a property access like root.classList
  ['selector', String.raw`(?<![\w$)\].])\.[A-Za-z_][\w-]*|\*(?=[:.\s{])`],
]

const PROMPT_INLINE: [TokenKind, string][] = [
  ['string', String.raw`"[^"\n]*"`],
  ['at', String.raw`@[\w-]+`],
  ['tag', String.raw`<[\w-]+>`],
  ['fn', String.raw`\b[a-z][\w-]*\([^)\n]*\)`],
  // CSS declarations written inline: "height: 1lh", "overflow: hidden"
  ['value', String.raw`\b(?:height|width|overflow|opacity|transition|box-sizing|position|display)\s*:\s*[\w-]+`],
  ['number', String.raw`(?<![\w-])\d+(?:\.\d+)?(?:ms|px|%|lh|rem|em|deg)(?![\w])`],
  // hyphenated identifiers read as code: inline-block, data-out, aria-hidden
  ['value', String.raw`\b[a-z]+(?:-[a-z]+)+\b`],
]

function compile(rules: [TokenKind, string][]) {
  return { kinds: rules.map(([k]) => k), re: new RegExp(rules.map(([, src]) => `(${src})`).join('|'), 'gm') }
}
const CODE = compile(CODE_RULES)
const INLINE = compile(PROMPT_INLINE)

function scan(src: string, { kinds, re }: ReturnType<typeof compile>, out: Token[]) {
  let last = 0
  re.lastIndex = 0
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m[0] === '') {
      re.lastIndex++
      continue
    }
    if (m.index > last) out.push({ text: src.slice(last, m.index) })
    const group = m.findIndex((g, i) => i > 0 && g !== undefined)
    out.push({ text: m[0], kind: kinds[group - 1] })
    last = m.index + m[0].length
  }
  if (last < src.length) out.push({ text: src.slice(last) })
}

/** Prompts: short lines without a full stop are section headings, "- " is a list marker. */
function prompt(src: string): Token[] {
  const out: Token[] = []
  src.split('\n').forEach((line, i, lines) => {
    const isHeading = line.length > 0 && line.length < 32 && !/[.:]$/.test(line) && !line.startsWith('- ') && i > 0
    if (isHeading) out.push({ text: line, kind: 'heading' })
    else if (line.startsWith('- ')) {
      out.push({ text: '- ', kind: 'marker' })
      scan(line.slice(2), INLINE, out)
    } else scan(line, INLINE, out)
    if (i < lines.length - 1) out.push({ text: '\n' })
  })
  return out
}

export function highlight(src: string, lang: Lang): Token[] {
  if (lang === 'prompt') return prompt(src)
  const out: Token[] = []
  scan(src, CODE, out)
  return out
}
