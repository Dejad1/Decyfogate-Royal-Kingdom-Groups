'use client';

import { useEffect, useState } from 'react';

const teacherId = 101;

export default function ClassroomPage() {
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    fetch(`/api/school/teacher/roster/${teacherId}`)
      .then((response) => response.json())
      .then((data) => {
        setRoster(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const markAttendance = async (studentId, status) => {
    const response = await fetch('/api/school/attendance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentId, status })
    });
    const result = await response.json();
    if (result.success) {
      setNotices((prev) => [{ id: Date.now(), text: `${status} marked for student ${studentId}` }, ...prev].slice(0, 5));
    }
  };

  if (loading) {
    return <div className="table-card">Preparing classroom roster…</div>;
  }

  const students = roster?.students || [];
  const classInfo = roster?.classInfo;

  return (
    <div>
      <div className="table-card" style={{ marginBottom: '1rem' }}>
        <div className="header-row">
          <div>
            <p style={{ color: '#37b8ff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.16em' }}>Classroom view</p>
            <h2 style={{ margin: '0.25rem 0 0' }}>{classInfo?.name ? `Form teacher view — ${classInfo.name}` : 'Teacher-led instruction and class focus'}</h2>
          </div>
        </div>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>The class teacher experience now exposes the daily register so attendance can be marked and notifications simulated in the demo.</p>
      </div>

      <div className="table-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Today’s roster</h3>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Guardian</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.name}</td>
                <td>{student.parent_name || '—'}</td>
                <td>{student.today_status || 'NOT_MARKED'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="button-secondary" onClick={() => markAttendance(student.id, 'PRESENT')}>Present</button>
                    <button className="button-secondary" onClick={() => markAttendance(student.id, 'LATE')}>Late</button>
                    <button className="button-secondary" onClick={() => markAttendance(student.id, 'ABSENT')}>Absent</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-card">
        <h3 style={{ marginTop: 0 }}>Notifications sent</h3>
        {notices.length === 0 ? <p style={{ color: 'var(--muted)', margin: 0 }}>No marks yet. Tap a status to simulate a parent alert.</p> : (
          <ul style={{ color: 'var(--muted)', margin: 0, paddingLeft: '1rem', lineHeight: 1.7 }}>
            {notices.map((notice) => <li key={notice.id}>{notice.text}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
