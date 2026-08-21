import { randomUUID } from 'node:crypto';
import type { PrismaClient, User } from './client.js';
import { findFreeHandle, normalizeHandle } from './handles.js';

/** O que um provedor de OAuth nos conta sobre quem acabou de entrar. */
export interface ProviderProfile {
  readonly provider: string;
  readonly providerAccountId: string;
  readonly email?: string | undefined;
  /** O provedor afirma que o dono do e-mail provou ser dono. */
  readonly emailVerified?: boolean | undefined;
  readonly displayName?: string | undefined;
  readonly avatarUrl?: string | undefined;
  /** Nome sugerido pelo provedor; vira handle depois de normalizado. */
  readonly username?: string | undefined;
}

export interface SignInResult {
  readonly user: User;
  /** Primeira vez desta pessoa aqui. */
  readonly created: boolean;
  /** O provedor foi ligado a uma conta que já existia, com o mesmo e-mail. */
  readonly linked?: boolean;
}

/**
 * Entra com uma conta de provedor: acha o usuário se a conta já é conhecida,
 * liga ao dono do e-mail quando é seguro, e cria conta nova se não é nem um
 * nem outro.
 *
 * A chave é (provider, provider_account_id), não o e-mail. Casar contas por
 * e-mail sem mais nada entrega a conta de alguém para quem registrou o mesmo
 * endereço em outro serviço.
 *
 * A exceção é o caso em que os dois lados provaram ser donos do e-mail: o
 * provedor diz que verificou, e a conta daqui verificou também. Aí ligar é
 * seguro — e não ligar seria pior, porque quem criou conta nativa e depois
 * clica em "entrar com Google" espera cair na própria conta.
 */
export async function signInWithProvider(
  prisma: PrismaClient,
  profile: ProviderProfile,
): Promise<SignInResult> {
  const existing = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    include: { user: true },
  });

  if (existing !== null) {
    const user = await prisma.user.update({
      where: { id: existing.userId },
      data: {
        displayName: profile.displayName ?? existing.user.displayName,
        avatarUrl: profile.avatarUrl ?? existing.user.avatarUrl,
      },
    });
    return { user, created: false };
  }

  // Mesma pessoa, provada dos dois lados: liga o provedor à conta que já existe.
  const claimable = await claimableAccount(prisma, profile);
  if (claimable !== null) {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        userId: claimable.id,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    });

    const user = await prisma.user.update({
      where: { id: claimable.id },
      data: {
        displayName: claimable.displayName ?? profile.displayName ?? null,
        avatarUrl: claimable.avatarUrl ?? profile.avatarUrl ?? null,
      },
    });
    return { user, created: false, linked: true };
  }

  const handle = await findFreeHandle(
    normalizeHandle(profile.username ?? profile.displayName ?? ''),
    async (candidate) => (await prisma.user.findUnique({ where: { handle: candidate } })) !== null,
  );

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      handle,
      // O e-mail é conveniência de contato, não identidade — e é único no
      // banco, então um e-mail já usado por outra conta entra como nulo.
      email: (await isEmailFree(prisma, profile.email)) ? profile.email : null,
      displayName: profile.displayName ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      accounts: {
        create: {
          id: randomUUID(),
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      },
    },
  });

  return { user, created: true };
}

/**
 * A conta daqui que pode receber este provedor: mesmo e-mail, verificado dos
 * dois lados. Sem verificação, quem registrasse a conta nativa com o e-mail
 * de outra pessoa herdaria a conta dela no primeiro login por Google.
 */
async function claimableAccount(
  prisma: PrismaClient,
  profile: ProviderProfile,
): Promise<User | null> {
  if (profile.email === undefined || profile.email === '') return null;
  if (profile.emailVerified !== true) return null;

  const user = await prisma.user.findUnique({ where: { email: profile.email } });
  if (user === null || user.emailVerifiedAt === null) return null;
  return user;
}

async function isEmailFree(prisma: PrismaClient, email: string | undefined): Promise<boolean> {
  if (email === undefined || email === '') return false;
  return (await prisma.user.findUnique({ where: { email } })) === null;
}

export type ProfileProblem = 'handle_em_uso';

/** Perfil mínimo: o handle e o nome que aparece na tela. */
export async function updateProfile(
  prisma: PrismaClient,
  userId: string,
  changes: { handle?: string; displayName?: string | null },
): Promise<{ user: User } | { problem: ProfileProblem }> {
  if (changes.handle !== undefined) {
    const owner = await prisma.user.findUnique({ where: { handle: changes.handle } });
    if (owner !== null && owner.id !== userId) return { problem: 'handle_em_uso' };
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(changes.handle === undefined ? {} : { handle: changes.handle }),
      ...(changes.displayName === undefined ? {} : { displayName: changes.displayName }),
    },
  });
  return { user };
}
