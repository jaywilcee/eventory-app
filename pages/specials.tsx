import { useEffect, useState } from 'react';
import Link from 'next/link';
import { call } from '../lib/api';
import { getSelectedClubId } from '../lib/club';

type SpecialItem = {
  id: string;
  summary: string;
  type: 'birthday' | 'anniversary' | 'holiday' | string;
  contactId?: string;
  feedId?: string;
  start: string;
  end: string;
};
type SpecialsResp = { clubId: string; count: number; days: number; items: SpecialItem[] };
type RangeKey = '7d' | '30d' | '1y' | '2y';

export default function Specials() {
  const [hydrated, setHydrated] = useState(false);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<SpecialItem[]>([]);
  const [range, setRange] = useState<RangeKey>('30d');
  const [loading, setLoading] = useState(false);

  function ensureClub(): string {
    const id = getSelectedClubId();
    if (!id) throw new Error('No club selected. Go to /clubs and select one.');
    return id;
  }

  function daysForRange(r: RangeKey): number {
    if (r === '7d') return 7;
    if (r === '30d') return 30;
    if (r === '1y') return 365;
    return 730; // '2y'
  }

  async function load() {
    setLoading(true);
    setStatus(`Loading next ${range}...`);
    try {
      const clubId = ensureClub();
      const days = daysForRange(range);
      const data = await call<SpecialsResp>('GET_UPCOMING_SPECIALS', { days }, clubId);
      setItems(data.items);
      setStatus(`Found ${data.count} items for next ${data.days} days`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('Error: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setHydrated(true);
    setSelectedClub(getSelectedClubId());
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, hydrated]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Upcoming Specials</h1>
      <p>{hydrated ? (selectedClub ? `Selected club: ${selectedClub}` : 'No club selected') : '\u00A0'}</p>
      <p>
        <Link href="/clubs">Pick a club</Link> · <Link href="/">Home</Link>
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <label htmlFor="range">Range:</label>
        <select id="range" value={range} onChange={(e) => setRange(e.target.value as RangeKey)} disabled={loading}>
          <option value="7d">Next 7 days</option>
          <option value="30d">Next 30 days</option>
          <option value="1y">Next 1 year</option>
          <option value="2y">Next 2 years</option>
        </select>
        <button onClick={load} disabled={loading}>Refresh</button>
      </div>

      <p>{status}</p>

      <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', marginTop: 12, width: '100%' }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Title</th>
            <th>Type</th>
            <th>Contact ID</th>
            <th>Feed</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>{it.start}</td>
              <td>{it.summary}</td>
              <td>{it.type}</td>
              <td>{it.contactId || ''}</td>
              <td>{it.feedId || ''}</td>
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', opacity: 0.7 }}>
                {loading ? 'Loading…' : 'No items in this window'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
