/** Bundlers (Vite) turn an imported .svg into its URL. */
declare module '*.svg' {
  const src: string
  export default src
}
