import type { TracesPayload } from './types';

declare global {
  interface Window {
    /** VS Code webview bootstrap flag */
    __CELL_VIEWER_BOOT__?: boolean;
    /** Payload injected by extension host */
    __CELL_VIEWER_PAYLOAD__?: TracesPayload;
  }

  /** VS Code webview API (only in extension webview) */
  function acquireVsCodeApi(): {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
  };
}

export {};
