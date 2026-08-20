import type { FastifyBaseLogger } from 'fastify';
import type { ApiConfig } from '../config.js';

/**
 * Envio de e-mail de autenticação.
 *
 * Ainda não há provedor contratado — é a tarefa L-18, que depende do domínio
 * (L-01). Até lá o link é registrado no log, e em ambiente que não é produção
 * ele também volta na resposta, para o cadastro poder ser exercido de ponta a
 * ponta sem caixa de entrada nenhuma.
 *
 * Em produção sem provedor, o link só existe no log: melhor um cadastro que
 * trava do que um token de redefinição de senha voltando pela API.
 */

export type AuthEmailKind = 'email_verification' | 'password_reset';

const PATHS: Record<AuthEmailKind, string> = {
  email_verification: '/verificar-email',
  password_reset: '/redefinir-senha',
};

export interface SentAuthEmail {
  /** Presente só fora de produção. */
  readonly link?: string;
}

export function buildAuthLink(config: ApiConfig, kind: AuthEmailKind, token: string): string {
  const url = new URL(PATHS[kind], config.webOrigin);
  url.searchParams.set('token', token);
  return url.toString();
}

export function sendAuthEmail(
  config: ApiConfig,
  logger: FastifyBaseLogger,
  kind: AuthEmailKind,
  email: string,
  token: string,
): SentAuthEmail {
  const link = buildAuthLink(config, kind, token);

  logger.info(
    { kind, email, link: config.isProduction ? '(oculto)' : link },
    'e-mail de autenticação pendente de provedor (L-18)',
  );

  return config.isProduction ? {} : { link };
}
