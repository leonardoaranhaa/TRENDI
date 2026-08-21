import { Discord, Google } from 'arctic';
import type { ProviderProfile } from '@trendi/db';
import type { ApiConfig } from '../config.js';

/**
 * Provedores de OAuth.
 *
 * Login é só por OAuth (decisão D-15): não guardamos senha. Cada provedor
 * responde duas perguntas — para onde mando a pessoa, e quem ela é quando
 * volta.
 */
export interface OAuthProvider {
  readonly name: string;
  /** Google exige PKCE; Discord aceita sem. */
  readonly usesPkce: boolean;
  authorizationUrl(state: string, codeVerifier: string): URL;
  fetchProfile(code: string, codeVerifier: string): Promise<ProviderProfile>;
}

function callbackUrl(config: ApiConfig, provider: string): string {
  return `${config.publicUrl}/auth/${provider}/callback`;
}

/** Claims do id_token. Vem direto do provedor por TLS, então não reverificamos a assinatura. */
function decodeIdToken(idToken: string): Record<string, unknown> {
  const payload = idToken.split('.')[1];
  if (payload === undefined) throw new Error('id_token sem payload');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function googleProvider(config: ApiConfig): OAuthProvider | undefined {
  if (config.google === undefined) return undefined;
  const client = new Google(
    config.google.clientId,
    config.google.clientSecret,
    callbackUrl(config, 'google'),
  );

  return {
    name: 'google',
    usesPkce: true,
    authorizationUrl: (state, verifier) =>
      client.createAuthorizationURL(state, verifier, ['openid', 'profile', 'email']),
    async fetchProfile(code, verifier) {
      const tokens = await client.validateAuthorizationCode(code, verifier);
      const claims = decodeIdToken(tokens.idToken());
      const sub = asString(claims['sub']);
      if (sub === undefined) throw new Error('Google não devolveu sub');

      return {
        provider: 'google',
        providerAccountId: sub,
        email: asString(claims['email']),
        // O Google diz se o dono provou ser dono. É esse campo que autoriza
        // ligar este login a uma conta nativa do mesmo e-mail.
        emailVerified: claims['email_verified'] === true,
        displayName: asString(claims['name']),
        avatarUrl: asString(claims['picture']),
        username: asString(claims['name']),
      };
    },
  };
}

function discordProvider(config: ApiConfig): OAuthProvider | undefined {
  if (config.discord === undefined) return undefined;
  const client = new Discord(
    config.discord.clientId,
    config.discord.clientSecret,
    callbackUrl(config, 'discord'),
  );

  return {
    name: 'discord',
    usesPkce: false,
    authorizationUrl: (state) => client.createAuthorizationURL(state, null, ['identify', 'email']),
    async fetchProfile(code) {
      const tokens = await client.validateAuthorizationCode(code, null);
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${tokens.accessToken()}` },
      });
      if (!response.ok) throw new Error(`Discord respondeu ${response.status}`);

      const user = (await response.json()) as Record<string, unknown>;
      const id = asString(user['id']);
      if (id === undefined) throw new Error('Discord não devolveu id');
      const avatar = asString(user['avatar']);

      return {
        provider: 'discord',
        providerAccountId: id,
        email: asString(user['email']),
        emailVerified: user['verified'] === true,
        displayName: asString(user['global_name']) ?? asString(user['username']),
        avatarUrl:
          avatar === undefined ? undefined : `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`,
        username: asString(user['username']),
      };
    },
  };
}

/**
 * Provedor de mentira para desenvolvimento e teste.
 *
 * Existe porque registrar os apps no Google e no Discord é tarefa do mundo
 * real (L-17), e o código não pode ficar parado esperando. O "código de
 * autorização" aqui é só o perfil codificado — nada sai da máquina.
 */
export function fakeProvider(config: ApiConfig): OAuthProvider {
  return {
    name: 'fake',
    usesPkce: false,
    authorizationUrl(state) {
      const url = new URL(callbackUrl(config, 'fake'));
      url.searchParams.set('state', state);
      url.searchParams.set('code', encodeFakeCode({ sub: `fake-${state.slice(0, 8)}` }));
      return url;
    },
    fetchProfile(code) {
      const profile = decodeFakeCode(code);
      return Promise.resolve({
        provider: 'fake',
        providerAccountId: profile.sub,
        email: profile.email,
        emailVerified: profile.emailVerified ?? false,
        displayName: profile.name,
        username: profile.username ?? profile.name,
      });
    },
  };
}

export interface FakeProfile {
  sub: string;
  email?: string | undefined;
  emailVerified?: boolean | undefined;
  name?: string | undefined;
  username?: string | undefined;
}

export function encodeFakeCode(profile: FakeProfile): string {
  return Buffer.from(JSON.stringify(profile), 'utf8').toString('base64url');
}

function decodeFakeCode(code: string): FakeProfile {
  const parsed = JSON.parse(Buffer.from(code, 'base64url').toString('utf8')) as FakeProfile;
  if (typeof parsed.sub !== 'string') throw new Error('código falso sem sub');
  return parsed;
}

/** Os provedores que este ambiente consegue usar de fato. */
export function availableProviders(config: ApiConfig): Map<string, OAuthProvider> {
  const providers = new Map<string, OAuthProvider>();
  for (const provider of [googleProvider(config), discordProvider(config)]) {
    if (provider !== undefined) providers.set(provider.name, provider);
  }
  if (config.fakeProviderEnabled) providers.set('fake', fakeProvider(config));
  return providers;
}
