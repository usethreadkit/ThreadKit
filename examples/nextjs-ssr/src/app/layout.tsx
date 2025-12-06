import type { Metadata } from 'next';
import '@threadkit/react/styles.css';

export const metadata: Metadata = {
  title: 'ThreadKit SSR Example',
  description: 'Example of ThreadKit with server-side rendering for SEO',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
