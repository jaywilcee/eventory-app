// pages/index.tsx
import { useState } from 'react';
import Link from 'next/link';
import { call } from '../lib/api';
import { getSelectedClubId } from '../lib/club';

type PingResult = { pong: boolean; at: number };
type ContactRow = { contactId: string; displayName: string; primaryEmail?: string; primaryPhone?: string };

export default function Home() {
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [status, setStatus] = useState<string>('');

  function ensureClub(): string {
    const id = getSelectedClubId();
    if (!id) throw new Error('No club selected. Go to /clubs and select one.');
    return id;
  }

  async function testPing() {
    try {
      const clubId = ensureClub();
      const data = await call<PingResult>('PING', {}, clubId);
      setStatus(JSON.stringify(data));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('Error: ' + msg);
    }
  }

  async function loadContacts() {
    setStatus('Loading contacts...');
    try {
      const clubId = ensureClub();
      const data = await call<ContactRow[]>('LIST_CONTACTS', {}, clubId);
      setRows(data);
      setStatus(`Loaded ${data.length} contacts`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('Error: ' + msg);
    }
  }

  async function syncToFirestore() {
    setStatus('Syncing to Firestore...');
    try {
      const clubId = ensureClub();
      const data = await call<{ count: number; clubId: string }>('SYNC_CONTACTS', {}, clubId);
      setStatus(`Synced ${data.count} contacts to club ${data.clubId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('Error: ' + msg);
    }
  }

  async function publishSpecials() {
    setStatus('Publishing birthdays & anniversaries to calendar...');
    try {
      const clubId = ensureClub();
      // pass {dryRun:true} to test without writing; remove or set false to write
      const data = await call<{ ok: boolean; bdayCount: number; annivCount: number }>(
        'PUBLISH_SPECIALS',
        { dryRun: false },
        clubId
      );
      setStatus(`Published: ${data.bdayCount} birthdays, ${data.annivCount} anniversaries`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('Error: ' + msg);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Eventory — Home</h1>
      <p>
        <Link href="/clubs">Pick a club</Link> (first time)
      </p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <button onClick={testPing}>Test PING</button>
        <button onClick={loadContacts}>Load from Google Contacts</button>
        <button onClick={syncToFirestore}>Sync into Firestore</button>
        <button onClick={publishSpecials}>Publish Birthdays & Anniversaries</button>
      </div>
      <p>{status}</p>
      <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Phone</th><th>Id</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.contactId}>
              <td>{r.displayName}</td>
              <td>{r.primaryEmail || ''}</td>
              <td>{r.primaryPhone || ''}</td>
              <td>{r.contactId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
