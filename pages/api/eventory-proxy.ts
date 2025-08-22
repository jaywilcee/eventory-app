import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ORIGIN = process.env.CORS_ORIGIN || '*';
  const GAS_URL = process.env.EVENTORY_GAS_URL!;
  const SECRET  = process.env.EVENTORY_SHARED_SECRET!;

  // CORS for browsers that hit this API
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST' });

  // Normalize body
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const { method, data } = body;
  const ts = Date.now();

  // Sign exactly {method, data}
  const canonical = JSON.stringify({ method, data });
  const sig = crypto.createHmac('sha256', SECRET).update(canonical).digest('base64');

  // Forward to GAS as text/plain (keeps things simple there)
  const upstream = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ method, data, sig, ts })
  });

  const text = await upstream.text();
  res.status(upstream.status).send(text);
}
