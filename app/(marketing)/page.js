import Link from 'next/link';

const proofPoints = [
  'Teacher taps mark attendance in seconds and fire a parent-ready alert flow.',
  'School admins can view a rolling attendance report and low-attendance flags.',
  'The platform is already structured for group, school, class, and subject-level operations.'
];

export default function MarketingPage() {
  return (
    <main>
      <section className="container hero">
        <div>
          <p style={{ color: '#37b8ff', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Royal Kingdom Group of Schools demo</p>
          <h1>When a teacher taps “present,” parents know their child is safely in class.</h1>
          <p>DecyfoGate turns school attendance into a trusted safety loop: a teacher marks a child, a parent receives a clear signal, and the school gains a live record for reporting and follow-up.</p>
          <div className="hero-actions">
            <Link href="/signin" className="button">Request a live demo</Link>
            <Link href="/dashboard" className="button-secondary">Preview the dashboard</Link>
          </div>
        </div>
        <div className="hero-card">
          <h3 style={{ marginTop: 0 }}>The hero moment</h3>
          <ul>
            {proofPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="container grid-3">
          <article className="panel">
            <h3>Live school safety</h3>
            <p>Form teachers, subject teachers, and school admins all work from one shared attendance system with clearly scoped permissions.</p>
          </article>
          <article className="panel">
            <h3>Parent reassurance</h3>
            <p>Notifications are simulated and visible in the demo so decision-makers can see the exact user experience without a live SMS provider.</p>
          </article>
          <article className="panel">
            <h3>Built for expansion</h3>
            <p>The architecture already supports identity, directory, attendance, notifications, and billing modules for future growth.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="panel">
            <h3>Flagship proof case</h3>
            <div className="quote">
              <p>“Royal Kingdom Group of Schools needed one coherent story for attendance, parent communication, and school administration. DecyfoGate delivered a demo that feels like a live institution, not a static mockup.”</p>
              <strong>— Demo narrative</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
