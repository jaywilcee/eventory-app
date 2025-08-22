const API_URL = '/api/eventory-proxy';

// Call GAS via your Vercel proxy
export async function call(method: string, data: any) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, data }),
  });

  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Unknown error');
  return json.data;
}
