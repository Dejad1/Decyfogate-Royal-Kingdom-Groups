import Link from 'next/link';

export default function MarketingLayout({ children }) {
  return (
    <div>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link href="/" className="brand">
            <span className="brand-badge">DG</span>
            <span>DecyfoGate</span>
          </Link>
          <nav className="nav-links">
            <Link href="/">Product</Link>
            <Link href="/signin">Sign in</Link>
            <Link href="/dashboard" className="button-secondary">Open demo</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="footer">
        <div className="container">
          <p>Built for school safety, attendance visibility, and parent reassurance.</p>
        </div>
      </footer>
    </div>
  );
}
