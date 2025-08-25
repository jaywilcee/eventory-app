import { useEffect, useState } from 'react';
import Link from 'next/link';
import { call } from '../lib/api';
import { getSelectedClubId } from '../lib/club';

type FeedStatus = 'active' | 'inactive' | 'all';

type HolidayFeed = {
  feedId: string;
  name: string;
  type: 'google' | 'ics' | string;
  sourceId: string;
  active: boolean;
  prefix?: string;
  yearsAhead?: number;
  yearsBack?: number;
  updatedAt?: string;
};

type ListFeedsResp = HolidayFeed[];
type SyncFeedResp = { ok: boolean; clubId: string; calendarId: string; feedId: string; count: number; errors: number; };
type CleanFeedResp = { ok: boolean; clubId: string; calendarId: string; feedId: string; deleted: number; };
type ToggleFeedResp = { ok: boolean; feedId: string; active: boolean };

export default function HolidaysPage() {
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<FeedStatus>('active');
  const [rows, setRows] = useState<HolidayFeed[]>([]);
  const [note, setNote] = useState<string>('');
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  function ensureClub(): string {
    const id = getSelectedClubId();
    if (!id) {
      throw new Error('No club selected. Go to the Clubs page and choose a club first.');
    }
    return id;
  }

  async function loadFeeds(currentStatus: FeedStatus) {
    setLoading(true);
    setNote('Loading feeds…');
    try {
      const clubId = ensureClub();
      const data = await call<ListFeedsResp>('LIST_HOLIDAY_FEEDS', { status: currentStatus }, clubId);
      setRows(data);
      setNote(`Loaded ${data.length} feeds (${currentStatus})`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setNote('Error loading feeds: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  async function syncFeed(feedId: string) {
    setNote(`Syncing "${feedId}"…`);
    try {
      const clubId = ensureClub();
      const data = await call<SyncFeedResp>('SYNC_HOLIDAY_FEED', { feedId }, clubId);
      setNote(`Synced ${data.count} items for "${data.feedId}" (errors: ${data.errors})`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setNote('Error syncing: ' + msg);
    }
  }

  async function toggleActive(feed: HolidayFeed) {
    const newActive = !feed.active;
    setNote(`${newActive ? 'Enabling' : 'Disabling'} "${feed.feedId}"…`);
    try {
      const clubId = ensureClub();
      // Soft toggle; do not auto-clean here. Use the Clean button for that.
      const resp = await call<ToggleFeedResp>(
        'SET_HOLIDAY_FEED_ACTIVE',
        { feedId: feed.feedId, active: newActive, clean: false },
        clubId
      );
      setNote(`Feed "${resp.feedId}" is now ${resp.active ? 'active' : 'inactive'}`);
      // Optimistic refresh
      await loadFeeds(status);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setNote('Error toggling active: ' + msg);
    }
  }

  async function cleanFeed(feedId: string) {
    if (!confirm('Remove all Eventory-managed events for this feed from the club calendar?')) return;
    setNote(`Cleaning "${feedId}"…`);
    try {
      const clubId = ensureClub();
      const data = await call<CleanFeedResp>('CLEAN_HOLIDAY_FEED', { feedId }, clubId);
      setNote(`Deleted ${data.deleted} events for feed "${data.feedId}"`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setNote('Error cleaning: ' + msg);
    }
  }

  /*
  // Optional hard delete (only enable if your GAS router exposes DELETE_HOLIDAY_FEED)
  async function deleteFeed(feedId: string) {
    if (!confirm('This removes the feed config (and will clean its events). Continue?')) return;
    setNote(`Deleting feed "${feedId}"…`);
    try {
      const clubId = ensureClub();
      // @ts-expect-error – only works if your GAS has the route
      await call<{ ok: boolean; feedId: string }>('DELETE_HOLIDAY_FEED', { feedId, clean: true, unsubscribeSource: true }, clubId);
      setNote(`Feed "${feedId}" deleted`);
      await loadFeeds(status);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setNote('Error deleting: ' + msg);
    }
  } 
    */

  // Initial mount: mark hydrated, read club, and load feeds
  useEffect(() => {
    setHydrated(true);
    setSelectedClub(getSelectedClubId());
    // auto-load with default status
    void loadFeeds('active');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When filter changes, reload
  useEffect(() => {
    if (!hydrated) return;
    void loadFeeds(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, hydrated]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Eventory — Holiday Feeds</h1>

      {/* Avoid hydration mismatch: render placeholder until client mounted */}
      <p>{hydrated ? (selectedClub ? `Selected club: ${selectedClub}` : 'No club selected') : '\u00A0'}</p>

      <p>
        <Link href="/clubs">Pick a club</Link> · <Link href="/">Home</Link>
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 12px' }}>
        <label htmlFor="status">Show:</label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as FeedStatus)}
          disabled={loading}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
        <button onClick={() => loadFeeds(status)} disabled={loading}>
          Refresh
        </button>
      </div>

      <p>{note}</p>

      <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', marginTop: 8, width: '100%' }}>
        <thead>
          <tr>
            <th>Feed ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Source ID / URL</th>
            <th>Active</th>
            <th>Window</th>
            <th>Prefix</th>
            <th style={{ minWidth: 300 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => (
            <tr key={f.feedId}>
              <td>{f.feedId}</td>
              <td>{f.name}</td>
              <td>{f.type}</td>
              <td style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.sourceId}</td>
              <td>{f.active ? 'Yes' : 'No'}</td>
              <td>
                −{f.yearsBack ?? 1}y / +{f.yearsAhead ?? 2}y
              </td>
              <td>{f.prefix || ''}</td>
              <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => syncFeed(f.feedId)} title="Fetch & upsert events for this feed">
                  Sync
                </button>
                <button onClick={() => toggleActive(f)} title="Toggle active/inactive">
                  {f.active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => cleanFeed(f.feedId)} title="Remove events created by this feed from the club calendar">
                  Clean
                </button>
                {/* Enable this if your GAS exposes DELETE_HOLIDAY_FEED
                <button onClick={() => deleteFeed(f.feedId)} title="Delete feed config (and clean events)">
                  Delete
                </button>
                */}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', opacity: 0.7 }}>
                {loading ? 'Loading…' : 'No feeds to show'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
