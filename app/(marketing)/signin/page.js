'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const portalModes = {
  'school-admin': { label: 'School Admin', sectorType: 'SCHOOL', portalType: 'ADMIN' },
  teacher: { label: 'Teacher', sectorType: 'SCHOOL', portalType: 'TEACHER' },
  'system-admin': { label: 'System Admin', sectorType: 'SUPERADMIN', portalType: 'ADMIN' }
};

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('teacher@decyfo.com');
  const [password, setPassword] = useState('school123');
  const [mode, setMode] = useState('school-admin');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('Authenticating with the DecyfoGate backend…');

    const selectedMode = portalModes[mode];
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('sectorType', selectedMode.sectorType);
    formData.append('portalType', selectedMode.portalType);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!result.ok) {
        setMessage(result.message || 'Authentication failed.');
        setIsSubmitting(false);
        return;
      }

      const target = result.redirectTo || '/dashboard';
      setMessage('Authenticated. Routing to the appropriate dashboard…');
      window.location.assign(target);
    } catch (error) {
      setMessage('The sign-in request could not reach the backend.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="brand" style={{ marginBottom: '1rem' }}>
          <span className="brand-badge">DG</span>
          <span>Royal Kingdom School Portal</span>
        </div>
        <h2 style={{ marginTop: 0 }}>Secure school access</h2>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>Sign in to the web dashboard and review attendance, alerts, and school operations.</p>
        <form onSubmit={handleSubmit}>
          <select value={mode} onChange={(event) => setMode(event.target.value)} style={{ width: '100%', padding: '0.85rem 0.95rem', borderRadius: '0.9rem', border: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text)' }}>
            {Object.entries(portalModes).map(([value, option]) => (
              <option key={value} value={value}>{option.label}</option>
            ))}
          </select>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <div className="helper-row">
            <span>Use school demo credentials</span>
            <Link href="/dashboard" style={{ color: '#37b8ff' }}>Skip to dashboard</Link>
          </div>
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Continue to dashboard'}
          </button>
        </form>
        {message ? <p style={{ color: '#2cc78d', marginTop: '0.85rem' }}>{message}</p> : null}
      </div>
    </main>
  );
}
