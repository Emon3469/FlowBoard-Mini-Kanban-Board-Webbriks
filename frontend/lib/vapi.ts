// Lazy loader for the Vapi Web SDK. Imported dynamically so it never runs during
// SSR (the SDK touches window/navigator) and stays out of the initial bundle.
// Only the PUBLIC key reaches the browser; the private key stays on the server.

export type VapiInstance = {
  start: (assistant: unknown) => Promise<unknown>;
  stop: () => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  on: (event: string, cb: (payload?: unknown) => void) => void;
  removeAllListeners: () => void;
};

export async function loadVapi(publicKey: string): Promise<VapiInstance> {
  const mod = await import('@vapi-ai/web');
  const Vapi = mod.default;
  return new Vapi(publicKey) as unknown as VapiInstance;
}
