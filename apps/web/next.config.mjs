const apiOrigin = process.env.API_PUBLIC_URL ?? 'http://localhost:3001';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A API responde em outro host (Fly), mas o navegador só enxerga /api/*
  // aqui mesmo. É isso que mantém o cookie de sessão como cookie de primeira
  // parte enquanto não existe domínio próprio — ver decisão D-16.
  //
  // WebSocket não passa por rewrite: o servidor de tempo real é acessado
  // direto, com ticket assinado (C-07).
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/:path*` }];
  },
};

export default nextConfig;
