// lib/api.ts
type ApiOk<T> = { ok: true; data: T };
type ApiErr   = { ok: false; error: string };
type ApiResp<T> = ApiOk<T> | ApiErr;

const API_URL = '/api/eventory-proxy';

// Generic helper: call<T>() returns data typed as T
export async function call<T = unknown>(method: string, data: unknown): Promise<T> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, data }),
  });

  const json = (await res.json()) as ApiResp<T>;
  if (!json.ok) throw new Error(json.error || 'Unknown error');
  return json.data;
}

