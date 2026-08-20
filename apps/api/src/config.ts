/**
 * Configuração por ambiente. Nenhum segredo em código — convenção 5 de
 * 02-arquitetura/convencoes.md. O que cada variável significa está no
 * `.env.example`.
 */

export interface ApiConfig {
  readonly nodeEnv: string;
  readonly isProduction: boolean;
  /** Onde o cliente web roda. Para onde o login volta, e quem pode chamar a API. */
  readonly webOrigin: string;
  /** Endereço público da API. Base das URLs de callback do OAuth. */
  readonly publicUrl: string;
  /** Domínio do cookie de sessão. Vazio = domínio da própria resposta. */
  readonly cookieDomain: string | undefined;
  readonly realtimeTicketSecret: string;
  /** Liga o provedor falso, que permite entrar sem Google nem Discord. */
  readonly fakeProviderEnabled: boolean;
  readonly google: OAuthCredentials | undefined;
  readonly discord: OAuthCredentials | undefined;
}

export interface OAuthCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
}

function credentials(prefix: string): OAuthCredentials | undefined {
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  if (clientId === undefined || clientId === '') return undefined;
  if (clientSecret === undefined || clientSecret === '') return undefined;
  return { clientId, clientSecret };
}

export function loadConfig(env = process.env): ApiConfig {
  const nodeEnv = env['NODE_ENV'] ?? 'development';
  const isProduction = nodeEnv === 'production';

  const secret = env['REALTIME_TICKET_SECRET'];
  if (isProduction && (secret === undefined || secret === '')) {
    throw new Error('REALTIME_TICKET_SECRET é obrigatória em produção');
  }

  return {
    nodeEnv,
    isProduction,
    webOrigin: env['WEB_ORIGIN'] ?? 'http://localhost:3000',
    publicUrl: env['API_PUBLIC_URL'] ?? 'http://localhost:3001',
    cookieDomain: env['SESSION_COOKIE_DOMAIN'],
    realtimeTicketSecret: secret ?? 'segredo-de-desenvolvimento',
    // Em produção o provedor falso não existe, aconteça o que acontecer com
    // a variável de ambiente: seria uma porta para entrar como qualquer um.
    fakeProviderEnabled: !isProduction && env['AUTH_FAKE_PROVIDER'] === '1',
    google: credentials('GOOGLE'),
    discord: credentials('DISCORD'),
  };
}
