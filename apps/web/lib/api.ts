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
  email: string | null;
  emailVerified: boolean;
  /** Falso em quem entrou só por Google ou Discord e nunca criou senha. */
  hasPassword: boolean;
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

export interface DuelView {
  id: string;
  state: string;
  creatorA: string;
  creatorB: string;
  winner: string | null;
  scoreA: number | null;
  scoreB: number | null;
  countsForRanking: boolean;
  playbackUrl: string | null;
}

export interface PublishCredential {
  side: 'a' | 'b';
  token: string;
  ingestEndpoint: string;
  expiresAt: string;
}

/** O duelo como o servidor o vê agora. `null` quando não existe. */
export async function getDuel(duelId: string): Promise<DuelView | null> {
  const cookieHeader = (await cookies()).toString();

  try {
    const response = await fetch(`${API_INTERNAL_URL}/duels/${encodeURIComponent(duelId)}`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return ((await response.json()) as { duel: DuelView }).duel;
  } catch {
    return null;
  }
}

/** Qual lado do duelo esta pessoa é, se for algum. */
export function ladoDoCompetidor(duel: DuelView, userId: string): 'a' | 'b' | null {
  if (duel.creatorA === userId) return 'a';
  if (duel.creatorB === userId) return 'b';
  return null;
}

/**
 * Estados em que faz sentido o competidor estar com a câmera ligada: do
 * aceite até o fim da execução. Depois disso quem trabalha é a plateia.
 */
const ESTADOS_DE_PALCO = new Set(['accepted', 'choosing', 'preparing', 'running']);

export function podePublicar(duel: DuelView): boolean {
  return ESTADOS_DE_PALCO.has(duel.state);
}
