import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ImmoRenta',
  description: 'Simulez, comparez et pilotez vos investissements locatifs.',
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
          background: '#f3f4f6',
          color: '#111827',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}