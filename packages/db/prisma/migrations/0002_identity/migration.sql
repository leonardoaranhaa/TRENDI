-- Identidade: contas de OAuth e sessões (C-02).
--
-- Login é só por OAuth (decisão D-15): não há coluna de senha, nem hash de
-- senha, nem token de recuperação. O que guardamos do provedor é o mínimo
-- para reconhecer a pessoa na próxima vez.
--
-- Continua fora daqui: qualquer dado de idade ou biometria (C-24, travada em
-- L-08 → L-02).

ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD COLUMN display_name text;
ALTER TABLE users ADD COLUMN avatar_url text;
ALTER TABLE users ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE accounts (
  id                    uuid PRIMARY KEY,
  user_id               uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  provider              text NOT NULL,
  provider_account_id   text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Uma conta do provedor pertence a um usuário só. É esta chave que faz o
-- segundo login encontrar a conta em vez de criar outra.
CREATE UNIQUE INDEX accounts_provider_provider_account_id_key
  ON accounts (provider, provider_account_id);
CREATE INDEX accounts_user_id_idx ON accounts (user_id);

CREATE TABLE sessions (
  id           uuid PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  -- Só o hash. O token que o navegador guarda nunca toca o banco, então
  -- vazamento de dump não vira sessão de ninguém (decisão D-16).
  token_hash   text NOT NULL,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX sessions_token_hash_key ON sessions (token_hash);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);
