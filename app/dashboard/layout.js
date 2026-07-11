import Link from 'next/link';

const links = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/attendance', label: 'Attendance' },
  { href: '/dashboard/classroom', label: 'Classroom' },
  { href: '/dashboard/broadcasts', label: 'Broadcasts' }
];

export default function DashboardLayout({ children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-badge">DG</span>
          <span>Royal Kingdom</span>
        </div>
        <nav>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={link.href === '/dashboard' ? 'active' : ''}>
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
