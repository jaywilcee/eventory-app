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

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST' });

  try {
    const body: ProxyBody =
      typeof req.body === 'string' ? JSON.parse(req.body) : ((req.body as ProxyBody) || {});
    const { method, data, clubId } = body;

    const { gasUrl, secret } = getTenant(clubId);
    if (!gasUrl || !secret) throw new Error(`Tenant config incomplete for clubId="${clubId}".`);

    const ts = Date.now();
    const canon = JSON.stringify({ method, data }); // exact string we sign
    const sig = crypto.createHmac('sha256', secret).update(canon).digest('base64');

    const upstream = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ method, data, sig, ts, canon }), // <-- include canon
    });

    const text = await upstream.text();
    try {
      const json = JSON.parse(text);
      res.status(upstream.status).json(json);
    } catch {
      res.status(502).json({ ok: false, error: 'Upstream returned non-JSON', snippet: text.slice(0, 200) });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ ok: false, error: message });
  }
}
