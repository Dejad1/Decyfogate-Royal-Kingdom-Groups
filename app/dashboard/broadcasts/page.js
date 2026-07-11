'use client';

import { useState } from 'react';

export default function BroadcastsPage() {
  const [message, setMessage] = useState('Parents and guardians, please confirm your child\'s attendance for today.');
  const [sent, setSent] = useState(false);
  const [queue, setQueue] = useState([
    'Parents: attendance reminder for Primary 5A',
    'Guardians: school transport update shared at 7:10 AM'
  ]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setQueue((prev) => [message, ...prev].slice(0, 6));
    setSent(true);
  };

  return (
    <div>
      <div className="table-card" style={{ marginBottom: '1rem' }}>
        <div className="header-row">
          <div>
            <p style={{ color: '#37b8ff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.16em' }}>Broadcast centre</p>
            <h2 style={{ margin: '0.25rem 0 0' }}>School-wide and unit-level messaging</h2>
          </div>
        </div>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>The demo now shows how a school admin can queue parent-focused notices and track the simulated delivery log.</p>
      </div>

      <div className="table-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Compose broadcast</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.8rem' }}>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows="4"
            style={{ width: '100%', borderRadius: '0.9rem', padding: '0.9rem', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)' }}
          />
          <button className="button" type="submit" style={{ width: 'fit-content' }}>Queue broadcast</button>
          {sent ? <p style={{ color: '#2cc78d', margin: 0 }}>Broadcast queued for the Royal Kingdom parent contact list.</p> : null}
        </form>
      </div>

      <div className="table-card">
        <h3 style={{ marginTop: 0 }}>Delivery log</h3>
        <ul style={{ color: 'var(--muted)', margin: 0, paddingLeft: '1rem', lineHeight: 1.7 }}>
          {queue.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
        </ul>
      </div>
    </div>
  );
}
