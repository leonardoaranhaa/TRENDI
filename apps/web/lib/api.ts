import { cookies } from 'next/headers';

/**
 * A API vista pelo cliente web.
 *
 * No navegador tudo passa por `/api/*`, que o `next.config.mjs` reescreve
 * para a API. Isso faz a API parecer mesma origem do site, e é o que mantém
 * o cookie de sessão funcionando mesmo enquanto o domínio próprio não existe
 * (L-01) e mesmo em navegador que bloqueia cookie de terceiro.
 *
 * No servidor, a chamada é direta — não passa pelo próprio rewrite.
 */
export const API_INTERNAL_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

export interface SessionUser {
  id: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
}

/** Quem está logado nesta requisição, ou `null`. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieHeader = (await cookies()).toString();
  if (cookieHeader === '') return null;

  try {
    const response = await fetch(`${API_INTERNAL_URL}/auth/session`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return ((await response.json()) as { user: SessionUser }).user;
  } catch {
    // API fora do ar não pode derrubar a página inteira: quem não tem
    // sessão vê a tela de visitante.
    return null;
  }
}

/** Provedores que este ambiente consegue usar. Vazio enquanto L-17 não sai. */
export async function getProviders(): Promise<string[]> {
  try {
    const response = await fetch(`${API_INTERNAL_URL}/auth/providers`, { cache: 'no-store' });
    if (!response.ok) return [];
    return ((await response.json()) as { providers: string[] }).providers;
  } catch {
    return [];
  }
}

export const PROVIDER_LABELS: Record<string, string> = {
  google: 'Entrar com Google',
  discord: 'Entrar com Discord',
  fake: 'Entrar com provedor de teste',
};
