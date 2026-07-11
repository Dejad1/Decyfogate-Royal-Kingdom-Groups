import './globals.css';

export const metadata = {
  title: 'DecyfoGate School Platform',
  description: 'A production-shaped school safety and attendance platform for modern institutions.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
