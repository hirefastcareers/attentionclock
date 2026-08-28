export {};

declare global {
  interface Window {
    vemetrics?: {
      track: (event: string, props?: Record<string, unknown>) => void;
    };
  }
}
