import { useEffect, useState } from 'react';
import Link from 'next/link';
import { call } from '../lib/api';
import { getSelectedClubId } from '../lib/club';

type SpecialType = 'birthday' | 'anniversary' | 'holiday' | 'memorial' | 'event' | string;
type RangeKey = '7d' | '30d' | '1y' | '2y';
type DepartedFilter = 'include' | 'hide' | 'only';
type TypeFilter = 'all' | 'birthday' | 'anniversary' | 'holiday' | 'memorial' | 'event';

type SpecialItem = {
  id: string;
  summary: string;
  type: SpecialType;
  label?: string;            // for memorial/event
  contactId?: string;
  feedId?: string;
  start: string;
  end: string;
  memberStatus?: 'active' | 'departed' | string;
};
type SpecialsResp = { clubId: string; count: number; days: number; items: SpecialItem[] };

export default function Specials() {
  const [hydrated, setHydrated] = useState(false);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<SpecialItem[]>([]);
  const [range, setRange] = useState<RangeKey>('30d');
  const [depFilter, setDepFilter] = useState<DepartedFilter>('include');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
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
    return 730;
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

  const filtered = items.filter((it) => {
    // departed filter
    if (it.memberStatus) {
      const departed = it.memberStatus.toLowerCase() === 'departed';
      if (depFilter === 'hide' && departed) return false;
      if (depFilter === 'only' && !departed) return false;
    } else if (depFilter === 'only') {
      return false; // holidays etc. have no memberStatus
    }
    // type filter
    if (typeFilter !== 'all' && it.type !== typeFilter) return false;
    return true;
  });

  return (
    <div style={{ padding: 20 }}>
      <h1>Upcoming Specials</h1>
      <p>{hydrated ? (selectedClub ? `Selected club: ${selectedClub}` : 'No club selected') : '\u00A0'}</p>
      <p>
        <Link href="/clubs">Pick a club</Link> · <Link href="/">Home</Link>
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <label htmlFor="range">Range:</label>
        <select id="range" value={range} onChange={(e) => setRange(e.target.value as RangeKey)} disabled={loading}>
          <option value="7d">Next 7 days</option>
          <option value="30d">Next 30 days</option>
          <option value="1y">Next 1 year</option>
          <option value="2y">Next 2 years</option>
        </select>

        <label htmlFor="type">Type:</label>
        <select id="type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)} disabled={loading}>
          <option value="all">All</option>
          <option value="birthday">Birthdays</option>
          <option value="anniversary">Anniversaries</option>
          <option value="memorial">Memorials</option>
          <option value="holiday">Holidays</option>
          <option value="event">Other significant</option>
        </select>

        <label htmlFor="dep">Departed:</label>
        <select id="dep" value={depFilter} onChange={(e) => setDepFilter(e.target.value as DepartedFilter)} disabled={loading}>
          <option value="include">Include</option>
          <option value="hide">Hide</option>
          <option value="only">Only departed</option>
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
            <th>Label</th>
            <th>Member status</th>
            <th>Contact ID</th>
            <th>Feed</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((it) => (
            <tr key={it.id} style={it.memberStatus === 'departed' ? { opacity: 0.75 } : undefined}>
              <td>{it.start}</td>
              <td>{it.summary}</td>
              <td>{it.type}</td>
              <td>{it.label || ''}</td>
              <td>{it.memberStatus || ''}</td>
              <td>{it.contactId || ''}</td>
              <td>{it.feedId || ''}</td>
            </tr>
          ))}
          {!filtered.length && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', opacity: 0.7 }}>
                {loading ? 'Loading…' : 'No items to show'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
