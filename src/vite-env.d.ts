/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.jpeg" {
  const src: string;
  export default src;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  /** petition = production shows ONLY the petition page; full = the entire app. */
  readonly VITE_APP_MODE?: string;
  /** Set "false" to disable the frontend AI VOG greeter entirely. */
  readonly VITE_AI_VOG_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
