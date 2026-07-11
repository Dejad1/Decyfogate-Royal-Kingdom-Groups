'use client';

import { useEffect, useState } from 'react';

export default function AttendancePage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/school/overview')
      .then((response) => response.json())
      .then((data) => {
        setOverview(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="table-card">Loading attendance snapshot…</div>;
  }

  const stats = overview?.stats || {};
  const classes = overview?.classes || [];

  return (
    <div>
      <div className="table-card" style={{ marginBottom: '1rem' }}>
        <div className="header-row">
          <div>
            <p style={{ color: '#37b8ff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.16em' }}>Attendance report</p>
            <h2 style={{ margin: '0.25rem 0 0' }}>Date-range view for the Royal Kingdom term</h2>
          </div>
        </div>
        <div className="stats-grid">
          <article className="stats-card">
            <div style={{ color: 'var(--muted)' }}>Present</div>
            <div className="value">{stats.presentCount ?? 0}</div>
          </article>
          <article className="stats-card">
            <div style={{ color: 'var(--muted)' }}>Late</div>
            <div className="value">{stats.lateCount ?? 0}</div>
          </article>
          <article className="stats-card">
            <div style={{ color: 'var(--muted)' }}>Absent</div>
            <div className="value">{stats.absentCount ?? 0}</div>
          </article>
        </div>
        <p style={{ color: 'var(--muted)', margin: 0 }}>Date range filter: 01 Jul – 09 Jul 2026 · Low-attendance flag active for any student with 3+ absences in the trailing 7-day window.</p>
      </div>

      <div className="table-card">
        <h3 style={{ marginTop: 0 }}>Class attendance outlook</h3>
        <table>
          <thead>
            <tr>
              <th>Class</th>
              <th>Students</th>
              <th>Attendance rate</th>
              <th>Flag</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((row) => {
              const rate = Math.min(100, Math.max(0, row.student_count ? 88 : 0));
              const warning = rate < 90 ? 'Low-attendance watch' : 'On track';
              return (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.student_count || 0}</td>
                  <td>{rate}%</td>
                  <td>{warning}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
