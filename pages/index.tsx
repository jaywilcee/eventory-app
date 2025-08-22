import { useState } from 'react';
import { call } from '../lib/api';

export default function Home() {
  const [result, setResult] = useState<string>("");

  async function testPing() {
    try {
      const data = await call('PING', {}); // same method you tested with curl
      setResult(JSON.stringify(data));
    } catch (err: any) {
      setResult("Error: " + err.message);
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
