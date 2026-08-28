export {};

declare global {
  interface Window {
    vemetrics?: {
      track: (event: string, props?: Record<string, unknown>) => void;
    };
    vmtrc?: (
      command: string,
      event: string,
      payload?: { eventData?: Record<string, unknown> },
    ) => void;
    __vemetricsQueue?: [string, Record<string, unknown>?][];
  }
}
