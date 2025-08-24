import { useState } from 'react';
import Link from 'next/link';
import { call } from '../lib/api';
import { getSelectedClubId } from '../lib/club';

type SpecialItem = {
  id: string;
  summary: string;
  type: 'birthday' | 'anniversary' | string;
  contactId: string;
  start: string;
  end: string;
};
type SpecialsResp = { clubId: string; count: number; days: number; items: SpecialItem[] };

export default function Specials() {
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<SpecialItem[]>([]);

  function ensureClub(): string {
    const id = getSelectedClubId();
    if (!id) throw new Error('No club selected. Go to /clubs and select one.');
    return id;
  }

  async function load(days: number) {
    setStatus(`Loading next ${days} days...`);
    try {
      const data = await call<SpecialsResp>('GET_UPCOMING_SPECIALS', { days }, ensureClub());
      setItems(data.items);
      setStatus(`Found ${data.count} items for next ${data.days} days`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('Error: ' + msg);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Upcoming Specials</h1>
      <p>
        <Link href="/clubs">Pick a club</Link> if not selected yet.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => load(7)}>Next 7 days</button>
        <button onClick={() => load(30)}>Next 30 days</button>
      </div>
      <p>{status}</p>

      <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Title</th>
            <th>Type</th>
            <th>Contact ID</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>{it.start}</td>
              <td>{it.summary}</td>
              <td>{it.type}</td>
              <td>{it.contactId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
