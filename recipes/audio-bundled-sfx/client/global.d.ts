// Module-shape declarations for non-TS asset imports.
// Vite resolves these at build time to fingerprinted URL strings; the
// type stubs below tell TypeScript "this import yields a string."

declare module "*.wav" {
  const url: string;
  export default url;
}

declare module "*.mp3" {
  const url: string;
  export default url;
}

declare module "*.ogg" {
  const url: string;
  export default url;
}

declare module "*.css" {
  const classes: { [key: string]: string };
  export default classes;
}
