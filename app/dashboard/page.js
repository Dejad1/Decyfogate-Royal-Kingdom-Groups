'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
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
    return <div className="table-card">Loading Royal Kingdom school overview…</div>;
  }

  const institution = overview?.institution || {};
  const classes = overview?.classes || [];
  const teachers = overview?.teachers || [];
  const stats = [
    { label: 'Students on roll', value: overview?.stats?.studentCount ?? 0, note: 'Seeded Royal Kingdom demo roster' },
    { label: 'Attendance rate', value: `${overview?.stats?.attendanceRate ?? 0}%`, note: 'Based on recent simulated marks' },
    { label: 'Alerts queued', value: '24', note: 'Simulated SMS + WhatsApp log' }
  ];

  return (
    <div>
      <div className="header-row">
        <div>
          <p style={{ color: '#37b8ff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.16em' }}>School admin overview</p>
          <h2 style={{ margin: '0.25rem 0 0' }}>{institution.name || 'Royal Kingdom Group of Schools'}</h2>
        </div>
        <a href="/signin" className="button-secondary">Switch role</a>
      </div>

      <section className="stats-grid">
        {stats.map((stat) => (
          <article className="stats-card" key={stat.label}>
            <div style={{ color: 'var(--muted)' }}>{stat.label}</div>
            <div className="value">{stat.value}</div>
            <div style={{ color: 'var(--muted)' }}>{stat.note}</div>
          </article>
        ))}
      </section>

      <section className="table-card" style={{ marginBottom: '1rem' }}>
        <div className="header-row">
          <h3 style={{ marginTop: 0 }}>Class units</h3>
          <span style={{ color: 'var(--muted)' }}>Live demo data from the Express backend</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Class</th>
              <th>Teacher</th>
              <th>Students</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.teacher_name || 'Unassigned'}</td>
                <td>{row.student_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="table-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Staff roster</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((person) => (
              <tr key={person.id}>
                <td>{person.name}</td>
                <td>{person.role}</td>
                <td>{person.phone_number || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="table-card">
        <h3 style={{ marginTop: 0 }}>Operational pulse</h3>
        <p style={{ color: 'var(--muted)', margin: '0 0 0.8rem' }}>The demo is now showing school-wide operations, staffing, and the seeded guardian communication loop.</p>
        <ul style={{ color: 'var(--muted)', margin: 0, paddingLeft: '1rem', lineHeight: 1.7 }}>
          <li>Attendance rollups are generated from the backend seed records.</li>
          <li>Admission and broadcast actions are ready for the next step.</li>
          <li>Switch roles to experience the teacher-scoped class view.</li>
        </ul>
      </section>
    </div>
  );
}
