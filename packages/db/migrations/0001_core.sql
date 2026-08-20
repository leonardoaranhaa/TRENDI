-- Núcleo da Fase 1: identidade, duelo, chat e voto.
--
-- Nomes de tabela e coluna em inglês (02-arquitetura/convencoes.md); o mapa
-- para os termos do cérebro está em packages/db/README.md e na decisão D-10.
--
-- Fora daqui de propósito: idade estimada (C-24, travada em L-08), carteira
-- e transações (Fase 3, travadas em L-02 e L-05), clipes (C-21), penalidade
-- (C-17, parâmetros pendentes em L-09).

CREATE TABLE users (
  id            uuid PRIMARY KEY,
  handle        text NOT NULL UNIQUE,
  email         text NOT NULL UNIQUE,
  role          text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'creator')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Extensão de user. Métricas de reputação; taxa de conclusão é pública
-- (01-conceito/regras-do-duelo.md §5), nível de penalidade não.
CREATE TABLE creators (
  user_id            uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  average_audience   integer NOT NULL DEFAULT 0,
  total_duels        integer NOT NULL DEFAULT 0,
  wins               integer NOT NULL DEFAULT 0,
  losses             integer NOT NULL DEFAULT 0,
  completion_rate    numeric(5, 4),
  ranking_points     integer NOT NULL DEFAULT 0
);

CREATE TABLE challenges (
  id                 uuid PRIMARY KEY,
  category           text NOT NULL,
  name               text NOT NULL,
  rules              text NOT NULL,
  judging_criteria   text NOT NULL,
  -- Piso e teto de duração: o público escolhe dentro da faixa, nunca fora.
  -- É o que impede a torcida rival votar em tempo impossível para sabotar.
  min_duration_s     integer NOT NULL CHECK (min_duration_s > 0),
  max_duration_s     integer NOT NULL,
  duration_options_s integer[] NOT NULL,
  min_age            integer NOT NULL DEFAULT 0,
  needs_material     boolean NOT NULL DEFAULT false,
  needs_music        boolean NOT NULL DEFAULT false,
  active             boolean NOT NULL DEFAULT true,
  CHECK (max_duration_s >= min_duration_s)
);

CREATE TABLE duels (
  id                  uuid PRIMARY KEY,
  creator_a           uuid NOT NULL REFERENCES users (id),
  creator_b           uuid NOT NULL REFERENCES users (id),
  state               text NOT NULL CHECK (state IN (
                        'queued', 'matched', 'accepted', 'choosing',
                        'preparing', 'running', 'voting', 'result', 'cancelled')),
  state_entered_at    timestamptz NOT NULL DEFAULT now(),
  challenge_id        uuid REFERENCES challenges (id),
  chosen_duration_s   integer,
  started_at          timestamptz,
  ended_at            timestamptz,
  winner              text CHECK (winner IN ('a', 'b', 'tie', 'undecided')),
  score_a             numeric(6, 5),
  score_b             numeric(6, 5),
  counts_for_ranking  boolean NOT NULL DEFAULT false,
  recording_url       text,
  CHECK (creator_a <> creator_b)
);

-- Consulta constante: quais duelos estão ao vivo agora.
CREATE INDEX duels_state_idx ON duels (state);

-- Auditoria de toda transição de estado. Requisito, não luxo
-- (02-arquitetura/convencoes.md, regra 3).
CREATE TABLE duel_transitions (
  id             bigserial PRIMARY KEY,
  duel_id        uuid NOT NULL REFERENCES duels (id) ON DELETE CASCADE,
  from_state     text NOT NULL,
  to_state       text NOT NULL,
  event          text NOT NULL,
  reason         text,
  -- Saída depois do ACEITE. É o que aciona penalidade.
  abandonment    boolean NOT NULL DEFAULT false,
  occurred_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX duel_transitions_duel_idx ON duel_transitions (duel_id, occurred_at);

-- Arquibancada do espectador. Trava quando a votação abre.
CREATE TABLE attendance (
  duel_id     uuid NOT NULL REFERENCES duels (id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  stand       text NOT NULL CHECK (stand IN ('a', 'b', 'general')),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  locked      boolean NOT NULL DEFAULT false,
  PRIMARY KEY (duel_id, user_id)
);

CREATE TABLE messages (
  id                  uuid PRIMARY KEY,
  duel_id             uuid NOT NULL REFERENCES duels (id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES users (id),
  -- Lê os três chats, escreve só no seu: a arquibancada da mensagem é a
  -- mesma de attendance. Ver decisão D-04.
  stand               text NOT NULL CHECK (stand IN ('a', 'b', 'general')),
  body                text NOT NULL,
  moderation_status   text NOT NULL DEFAULT 'approved'
                        CHECK (moderation_status IN ('approved', 'held', 'removed')),
  moderation_reason   text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_duel_idx ON messages (duel_id, created_at);

-- Voto de resultado.
--
-- NÃO TEM COLUNA DE PESO PAGO, e não vai ter: decisão D-03. Voto de
-- resultado é sempre gratuito e igual. Presente e item pago afetam
-- atmosfera e escolha de desafio — nunca o placar.
CREATE TABLE result_votes (
  duel_id           uuid NOT NULL REFERENCES duels (id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  voted_for         text NOT NULL CHECK (voted_for IN ('a', 'b')),
  -- Arquibancada de origem, travada na abertura da votação. É o que dá o
  -- peso cruzado: rival 0,50 / geral 0,35 / própria 0,15.
  stand             text NOT NULL CHECK (stand IN ('a', 'b', 'general')),
  annulled          boolean NOT NULL DEFAULT false,
  annulment_reason  text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  -- Uma conta, um voto. A garantia é esta chave.
  PRIMARY KEY (duel_id, user_id)
);
