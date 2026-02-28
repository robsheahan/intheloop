import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder');
  }

  return createBrowserClient(url, key);
}

/** Race a Supabase query against a timeout. Rejects if the query takes too long. */
export async function queryWithTimeout<T>(
  queryPromise: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  ms = 15_000,
): Promise<T> {
  const result = await Promise.race([
    queryPromise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out — try reloading')), ms),
    ),
  ]);
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}
