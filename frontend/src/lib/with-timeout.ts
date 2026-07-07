export class AITimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "AITimeoutError";
  }
}

/**
 * Races a promise against a timeout. Throws AITimeoutError on timeout so
 * callers can distinguish "took too long" from other failures and show
 * a retry-able message instead of a generic error.
 *
 * Works on any Promise — raw fetch() or an opaque TanStack Start server-fn
 * proxy — since it races the returned promise rather than instrumenting
 * the transport.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 25000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AITimeoutError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}
