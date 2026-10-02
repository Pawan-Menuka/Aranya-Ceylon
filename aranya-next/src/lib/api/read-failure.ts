import { DEMO_MODE } from "../demo";

// Keep deliberate preview fallbacks; production transport failures must offer retry.
export function rethrowReadFailure(error: unknown): void {
  const status = (error as { status?: number })?.status;
  if (!DEMO_MODE && ((status !== undefined && status >= 500) || error instanceof TypeError)) throw error;
}
