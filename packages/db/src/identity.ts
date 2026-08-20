import { randomUUID } from 'node:crypto';
import type { PrismaClient, User } from './client.js';
import { findFreeHandle, normalizeHandle } from './handles.js';

/** O que um provedor de OAuth nos conta sobre quem acabou de entrar. */
export interface ProviderProfile {
  readonly provider: string;
  readonly providerAccountId: string;
  readonly email?: string | undefined;
  readonly displayName?: string | undefined;
  readonly avatarUrl?: string | undefined;
  /** Nome sugerido pelo provedor; vira handle depois de normalizado. */
  readonly username?: string | undefined;
}

export interface SignInResult {
  readonly user: User;
  /** Primeira vez desta pessoa aqui. */
  readonly created: boolean;
}

/**
 * Entra com uma conta de provedor: acha o usuário se a conta já é conhecida,
 * cria os dois se não é.
 *
 * A chave é (provider, provider_account_id), não o e-mail. E-mail muda, pode
 * vir vazio, e casar contas por e-mail é como se entrega a conta de alguém
 * para quem registrou o mesmo endereço em outro serviço.
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
