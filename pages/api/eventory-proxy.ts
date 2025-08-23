// pages/api/eventory-proxy.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

type Tenant = { gasUrl: string; secret: string };
type TenantMap = Record<string, Tenant>;
type ProxyBody = { method?: string; data?: unknown; clubId?: string };

function getTenant(clubId?: string): Tenant {
  if (!clubId) throw new Error('Missing clubId');
  const raw = process.env.TENANT_MAP;
  if (!raw) throw new Error('TENANT_MAP not configured');
  const map = JSON.parse(raw) as TenantMap;
  const t = map[clubId];
  if (!t) throw new Error(`Unknown clubId: ${clubId}`);
  return t;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ORIGIN = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Use POST' });
    return;
  }

  try {
    const body: ProxyBody =
      typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as ProxyBody || {});
    const { method, data, clubId } = body;

    const { gasUrl, secret } = getTenant(clubId);
    const ts = Date.now();

    // Sign {method, data} exactly as verified in GAS
    const canonical = JSON.stringify({ method, data });
    const sig = crypto.createHmac('sha256', secret).update(canonical).digest('base64');

    const upstream = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ method, data, sig, ts }),
    });

    const text = await upstream.text();
    res.status(upstream.status).send(text);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ ok: false, error: message });
  }
}
