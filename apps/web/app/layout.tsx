import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TRENDI',
  description: 'Duelos ao vivo entre criadores',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-neutral-950 text-neutral-100 antialiased">{children}</body>
    </html>
  );
}
