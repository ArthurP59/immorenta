import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: "Rentab'Immo",
  description: 'Simulez, comparez et pilotez vos investissements locatifs.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#f3f4f6',
          color: '#111827',
          fontFamily: 'Arial, sans-serif',
          overflowX: 'hidden',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        {children}
      </body>
    </html>
  );
}