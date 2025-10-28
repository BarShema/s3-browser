declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module 'react' {
  export * from 'react';
  export namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
