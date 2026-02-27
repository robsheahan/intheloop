import { createBrowserClient } from '@supabase/ssr';

const fetchWithTimeout: typeof fetch = (input, init) => {
  // 30s timeout — Supabase free-tier projects can take 20s+ to wake from pause
  const timeoutSignal = AbortSignal.timeout(30_000);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  return fetch(input, { ...init, signal });
};

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a dummy client during build/prerender — it won't be called
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder', {
      global: { fetch: fetchWithTimeout },
    });
  }

  return createBrowserClient(url, key, {
    global: {
      fetch: fetchWithTimeout,
    },
  });
}

export function withTimeout<T>(promise: PromiseLike<T>, ms = 15_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), ms)
    ),
  ]);
}
