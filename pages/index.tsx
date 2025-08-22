// pages/index.tsx
import { useState } from 'react';
import { call } from '../lib/api';

type PingResult = { pong: boolean; at: number };

export default function Home() {
  const [result, setResult] = useState<string>('');

  async function testPing() {
    try {
      const data = await call<PingResult>('PING', {});
      setResult(JSON.stringify(data));
    } catch (err) {
      // err is unknown; narrow to Error for message
      const msg = err instanceof Error ? err.message : String(err);
      setResult('Error: ' + msg);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Eventory Test</h1>
      <button onClick={testPing}>Test PING</button>
      <p>Result: {result}</p>
    </div>
  );
}
