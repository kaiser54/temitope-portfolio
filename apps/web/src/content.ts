export type CompanyKey = keyof typeof companies

export const companies = {
  quality: {
    og: '/og/quality.jpg' as string | undefined, // site preview image, resized to 640px
    name: 'Quality',
    initial: 'Q',
    logo: '/logos/quality.svg' as string | undefined,
    href: 'https://usequality.app' as string | undefined,
    role: 'Co-founder',
    years: '2025—now',
    blurb: 'Visual feedback and QA for software teams — feedback right where it happens.',
  },
  passpoint: {
    og: '/og/passpoint.jpg' as string | undefined, // site preview image, resized to 640px
    name: 'Passpoint',
    initial: 'P',
    logo: '/logos/passpoint.png' as string | undefined,
    logoOnTile: true, // transparent mark: draw it on a white tile like the others
    href: 'https://mypasspoint.com' as string | undefined,
    role: 'Frontend Engineer', // TODO: confirm your title
    years: '2026',
    blurb: 'Currently building at Passpoint.', // TODO: one line on what you work on
  },
  ipc: {
    og: '/og/ipc.jpg' as string | undefined, // site preview image, resized to 640px
    name: 'IPC-Africa',
    initial: 'I',
    logo: '/logos/ipc.png' as string | undefined,
    href: 'https://ipc-africa.com',
    role: 'Frontend Engineer → Product Lead',
    years: '2022—26',
    blurb: 'Led Daash, a multi-tenant business platform, and built GoSource, a B2B food procurement marketplace.',
  },
  acumen: {
    og: '/og/acumen.jpg' as string | undefined, // site preview image, resized to 640px
    name: 'Acumen Digital',
    initial: 'A',
    logo: '/logos/acumen.png' as string | undefined,
    href: 'https://www.acumen.digital' as string | undefined,
    role: 'Frontend Engineer',
    years: '2024—25',
    blurb: 'Client products across lending, BNPL, FX, savings, real estate and agritech.',
  },
  swing: {
    og: '/og/swing.jpg' as string | undefined, // site preview image, resized to 640px
    name: 'Swing',
    initial: 'S',
    logo: '/logos/swing.png' as string | undefined,
    href: 'https://www.overlap.work' as string | undefined,
    role: 'Frontend Engineer, contract · London (remote)',
    years: '2024',
    blurb: 'Real-time project and task collaboration for Overlap.',
  },
}

/** Intro paragraphs. Strings are plain text; `{ company }` renders an inline company chip. */
export type IntroSegment = string | { company: CompanyKey }

export const profile = {
  name: 'Temitope Agboola',
  role: 'Frontend & Product Engineer',
  location: 'Lagos, Nigeria',
  timeZone: 'Africa/Lagos',
  intro: [
    ['Co-founder of ', { company: 'quality' }, ' — visual feedback and QA for software teams.'],
    ['I build frontends for products that move money and run businesses — across fintech, commerce and procurement.'],
    [
      'Currently shaping the world of digital payment infrastructures at ',
      { company: 'passpoint' },
      '. Previously led product engineering at ',
      { company: 'ipc' },
      ', and shipped with ',
      { company: 'acumen' },
      ' and ',
      { company: 'swing' },
      '.',
    ],
  ] satisfies IntroSegment[][],
}

export type LinkItem = { label: string; href: string }

/** Shown under the intro in two columns */
export const contact: { title: string; links: LinkItem[]; hidden?: boolean }[] = [
  {
    title: 'Elsewhere',
    hidden: true, // hidden for now — set to false to show again
    links: [
      { label: '@kaiser_major on X', href: 'https://x.com/kaiser_major' },
      { label: 'kaiser54 on GitHub', href: 'https://github.com/kaiser54' },
    ],
  },
  {
    title: 'Get in touch',
    hidden: true, // hidden for now — set to false to show again
    links: [
      { label: 'Write an email', href: 'mailto:agboolatemitope070@gmail.com' },
      { label: 'Connect on LinkedIn', href: 'https://www.linkedin.com/in/agboola-temitope/' },
    ],
  },
]

export type Project = {
  name: string
  kind: string
  year: string
  stat?: string
  points: string[]
}

export const projects: Project[] = [
  {
    name: 'Daash',
    kind: 'Multi-tenant business platform',
    year: '2023—26',
    stat: '₦1.89B storefront GMV',
    points: [
      'Led frontend development after a company restructuring — architecture, technical direction and delivery.',
      'Built the multi-tenant storefront that resolves each business’s branding, catalog and layout at runtime from one codebase, now serving 201 active stores.',
      'Shipped checkout, “Pay for Me” shareable payment links, loyalty, discounts and a referral and affiliate portal.',
      'Redesigned navigation with a collapsible sidebar, global search and command-style navigation, plus real-time orders and invoices across web and mobile.',
    ],
  },
  {
    name: 'GoSource',
    kind: 'B2B food procurement',
    year: '2022—23',
    stat: '₦1.36B revenue',
    points: [
      'One of the first engineers as IPC moved from a traditional procurement business to a technology product.',
      'Built the marketplace, the order request and approval workflow, and admin tools for products, inventory, orders and customers.',
      'Added real-time fulfilment status for customers and operations teams.',
    ],
  },
  {
    name: 'Kaorex',
    kind: 'Peer-to-peer FX & escrow',
    year: '2024—25',
    points: [
      'Set the frontend foundation across the customer and admin apps from the first commit.',
      'Built multi-currency wallets, buy/sell flows and participant messaging with WebSocket-driven transaction updates.',
    ],
  },
  {
    name: 'Tender',
    kind: 'Lending management',
    year: '2024—25',
    points: [
      'Owned the V2 rebuild — restructured the API layer and set clearer application boundaries.',
      'Introduced caching, mutation invalidation, skeleton states and consistent error handling across loan and repayment dashboards.',
    ],
  },
  {
    name: 'Esusu',
    kind: 'Group & target savings',
    year: '2024—25',
    points: [
      'Delivered the frontend independently: contribution cycles, savings goals, KYC and operations dashboards.',
      'Built real-time field-agent tracking with threshold alerts on transaction exposure.',
    ],
  },
  {
    name: 'Oja',
    kind: 'Buy now, pay later',
    year: '2024—25',
    points: [
      'Built KYC onboarding and safeguards that stop concurrent orders from exceeding available stock.',
    ],
  },
  {
    name: 'Overlap',
    kind: 'Real-time team collaboration',
    year: '2024',
    points: [
      'Built project and task management, async updates and activity feeds for a London-based SaaS team.',
    ],
  },
]

export const NOTE_TAGS = [
  { value: 'writing', label: 'Writing', plural: 'Writing', slug: 'writing' },
  { value: 'build-log', label: 'Build log', plural: 'Build logs', slug: 'build-logs' },
] as const
export type NoteTag = (typeof NOTE_TAGS)[number]['value']

export type Note = {
  title: string
  /** URL slug: the note lives at /notes/<slug> once it has a page */
  slug?: string
  /** One or more of NOTE_TAGS */
  tags: NoteTag[]
  /** ISO date (YYYY-MM-DD); omit while the note is still being written */
  date?: string
  summary?: string
  href?: string
}

/** Writing and build logs. Notes without a date show as "Soon". */
export const notes: Note[] = [
  {
    title: 'Rolling a theme switcher, letter by letter',
    slug: 'theme-switcher',
    tags: ['build-log'],
    date: '2026-11-09',
    summary: 'Why the text shook while the button resized, and pinning words to an edge to fix it.',
  },
]

export type Exploration = {
  title: string
  summary: string
  year: string
  href?: string
}

/** Interaction experiments and prototypes. */
export const explorations: Exploration[] = [
  {
    title: 'Rubber-band tab underline',
    summary: 'An underline that stretches toward the pointer with rubber-band resistance, then snaps back and wobbles on two independent springs.',
    year: '2026',
  },
  {
    title: 'Rolling theme switcher',
    summary: 'Light → Dark → System as text: letters roll out and in with a stagger while the button eases to the new word’s width.',
    year: '2026',
  },
  {
    title: 'Sliding project highlight',
    summary: 'One shared hover card that glides between rows and grows to wrap an open project, kept in place while panels animate.',
    year: '2026',
  },
  {
    title: 'Native-style tab select',
    summary: 'A filter that opens over its tab like a macOS select, with the checked option landing exactly on the label.',
    year: '2026',
  },
]
