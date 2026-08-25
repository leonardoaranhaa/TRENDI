import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TRENDI',
  description: 'Duelos ao vivo entre criadores. Tendências que movem. Estilo que fica.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      {/*
        Preto de verdade, não cinza escuro: é o fundo dos quadros da marca, e
        é o que faz o azul acender. O degradê no topo é o mesmo brilho que
        aparece atrás do logotipo em toda peça.
      */}
      <body className="min-h-dvh bg-preto font-sans text-branco antialiased">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(1,50,255,0.28),transparent_70%)]"
        />
        <div className="relative">{children}</div>
      </body>
    </html>
  );
}
