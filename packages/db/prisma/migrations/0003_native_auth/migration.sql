-- Conta nativa: cadastro e login com e-mail e senha (C-37).
--
-- OAuth passa a ser atalho, não a única porta — ver decisão D-19, que revisa
-- a D-15. Quem entra por Google ou Discord continua sem senha nenhuma:
-- password_hash é nulo nesse caso.
--
-- Continua fora daqui: idade e biometria (C-24, travada em L-08 -> L-02).

-- Hash de senha, nunca a senha. Formato em packages/db/src/passwords.ts.
ALTER TABLE users ADD COLUMN password_hash text;

-- Quando o dono do e-mail provou que é dono. É o que autoriza ligar uma
-- conta de OAuth a uma conta nativa do mesmo e-mail.
ALTER TABLE users ADD COLUMN email_verified_at timestamptz;

-- Token de uso único para verificar e-mail e redefinir senha.
--
-- Mesma disciplina da sessão (D-16): guardamos só o hash. O token que vai no
-- link do e-mail não existe no banco.
CREATE TABLE auth_tokens (
  id           uuid PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  purpose      text NOT NULL,
  token_hash   text NOT NULL,
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX auth_tokens_token_hash_key ON auth_tokens (token_hash);
CREATE INDEX auth_tokens_user_id_purpose_idx ON auth_tokens (user_id, purpose);
