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
  label?: string;
  contactId?: string;
  feedId?: string;
  start: string;
  end: string;
  memberStatus?: 'active' | 'departed' | string;
};
type SpecialsResp = { clubId: string; count: number; days: number; items: SpecialItem[] };

type PublishResp = {
  ok: boolean;
  clubId: string;
  calendarId: string;
  bdayCount: number;
  annivCount: number;
  memorialCount?: number;
  eventCount?: number;
  errors: number;
  members: number;
  dryRun: boolean;
};

export default function Specials() {
  const [hydrated, setHydrated] = useState(false);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  // separate statuses so they don't overwrite each other
  const [listStatus, setListStatus] = useState('');
  const [pubStatus, setPubStatus] = useState('');

  const [items, setItems] = useState<SpecialItem[]>([]);
  const [range, setRange] = useState<RangeKey>('30d');
  const [depFilter, setDepFilter] = useState<DepartedFilter>('include');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [loading, setLoading] = useState(false);

  // publish controls
  const [pubBusy, setPubBusy] = useState(false);
  const [dryRun, setDryRun] = useState(false);

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
    setListStatus(`Loading next ${range}...`);
    try {
      const clubId = ensureClub();
      const days = daysForRange(range);
      const data = await call<SpecialsResp>('GET_UPCOMING_SPECIALS', { days }, clubId);
      setItems(data.items);
      setListStatus(`Found ${data.count} items for next ${data.days} days`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setListStatus('Error: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  async function publishSpecialsNow() {
    setPubBusy(true);
    setPubStatus(dryRun ? 'Dry run: publishing preview…' : 'Publishing specials…');
    try {
      const clubId = ensureClub();
      const data = await call<PublishResp>('PUBLISH_SPECIALS', dryRun ? { dryRun: true } : {}, clubId);
      const mc = data.memorialCount ?? 0;
      const ec = data.eventCount ?? 0;
      setPubStatus(`${dryRun ? 'Dry run' : 'Published'} — 🎂 ${data.bdayCount}, 💍 ${data.annivCount}, 🕯️ ${mc}, ⭐ ${ec} (errors: ${data.errors})`);
      // Refresh list AFTER setting pubStatus; listStatus will change but pubStatus stays
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPubStatus('Error publishing: ' + msg);
    } finally {
      setPubBusy(false);
    }
  }

  // Optional: auto-clear publish note after 10s
  useEffect(() => {
    if (!pubStatus) return;
    const t = setTimeout(() => setPubStatus(''), 10_000);
    return () => clearTimeout(t);
  }, [pubStatus]);

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
    if (it.memberStatus) {
      const departed = it.memberStatus.toLowerCase() === 'departed';
      if (depFilter === 'hide' && departed) return false;
      if (depFilter === 'only' && !departed) return false;
    } else if (depFilter === 'only') {
      return false;
    }
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
        <select id="range" value={range} onChange={(e) => setRange(e.target.value as RangeKey)} disabled={loading || pubBusy}>
          <option value="7d">Next 7 days</option>
          <option value="30d">Next 30 days</option>
          <option value="1y">Next 1 year</option>
          <option value="2y">Next 2 years</option>
        </select>

        <label htmlFor="type">Type:</label>
        <select id="type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)} disabled={loading || pubBusy}>
          <option value="all">All</option>
          <option value="birthday">Birthdays</option>
          <option value="anniversary">Anniversaries</option>
          <option value="memorial">Memorials</option>
          <option value="holiday">Holidays</option>
          <option value="event">Other significant</option>
        </select>

        <label htmlFor="dep">Departed:</label>
        <select id="dep" value={depFilter} onChange={(e) => setDepFilter(e.target.value as DepartedFilter)} disabled={loading || pubBusy}>
          <option value="include">Include</option>
          <option value="hide">Hide</option>
          <option value="only">Only departed</option>
        </select>

        {/* Publish controls */}
        <label htmlFor="dry" style={{ marginLeft: 12 }}>Dry run:</label>
        <input
          id="dry"
          type="checkbox"
          checked={dryRun}
          onChange={(e) => setDryRun(e.target.checked)}
          disabled={loading || pubBusy}
        />
        <button onClick={publishSpecialsNow} disabled={loading || pubBusy || !selectedClub}>
          {pubBusy ? 'Working…' : 'Publish specials now'}
        </button>

        <button onClick={load} disabled={loading || pubBusy}>Refresh</button>
      </div>

      {/* Separate status lines */}
      {pubStatus && (
        <p style={{ marginTop: 6, padding: '6px 10px', borderRadius: 8, background: '#eef9f0' }}>
          {pubStatus}
        </p>
      )}
      <p style={{ marginTop: 6 }}>{listStatus}</p>

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
