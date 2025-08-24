// pages/clubs.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { call } from '../lib/api';
import { getSelectedClubId, setSelectedClubId } from '../lib/club';

type ClubRow = {
  clubId: string;
  name: string;
  timeZone: string;
  calendarId: string;
  label: string;
  defaultRoles: string[];
};

export default function Clubs() {
  const [rows, setRows] = useState<ClubRow[]>([]);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false); // prevents hydration mismatch

  // Load selected club & list of clubs after the component mounts (client only)
  useEffect(() => {
    setSelected(getSelectedClubId());
    setHydrated(true);

    (async () => {
      try {
        setStatus('Loading clubs...');
        const data = await call<ClubRow[]>('LIST_CLUBS', {}, 'admin');
        setRows(data);
        setStatus(`Loaded ${data.length} clubs`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus('Error loading clubs: ' + msg);
      }
    })();
  }, []);

  function selectClub(id: string) {
    setSelectedClubId(id);
    setSelected(id); // update UI immediately
    setStatus(`Selected club: ${id}`);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Eventory — Clubs</h1>

      {/* Render nothing until hydrated to avoid SSR/CSR mismatch */}
      <p>{hydrated ? (selected ? `Selected club: ${selected}` : 'No club selected') : '\u00A0'}</p>

      <p>{status}</p>

      <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr>
            <th>Club ID</th>
            <th>Name</th>
            <th>Time Zone</th>
            <th>Calendar</th>
            <th>Label</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.clubId}>
              <td>{r.clubId}</td>
              <td>{r.name}</td>
              <td>{r.timeZone}</td>
              <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.calendarId}
              </td>
              <td>{r.label}</td>
              <td>
                <button onClick={() => selectClub(r.clubId)}>Select</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: 12 }}>
        After selecting, go back to the <Link href="/">home page</Link> and run actions for that club.
      </p>
    </div>
  );
}
