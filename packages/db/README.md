# Banco de dados

PostgreSQL com Prisma. O schema é `prisma/schema.prisma` (decisão D-18), e as
migrations são SQL numerado em `prisma/migrations/`, aplicável com `psql`.

## Como mexer no schema

1. Edite `prisma/schema.prisma`.
2. Escreva a migration correspondente em `prisma/migrations/000N_nome/migration.sql`.
3. `npm test` — o teste de deriva compara o banco criado pelas migrations com
   o schema e reprova se os dois contarem histórias diferentes.
4. `npm run generate -w @trendi/db` para atualizar o cliente.

```bash
# aplicar num banco existente
psql "$DATABASE_URL" -f packages/db/prisma/migrations/0001_core/migration.sql
psql "$DATABASE_URL" -f packages/db/prisma/migrations/0002_identity/migration.sql
```

O Prisma não gera as migrations por dois motivos: geração exige banco sombra,
e SQL escrito à mão continua legível para quem abrir o repo daqui a um ano.

## Como os testes acham um banco

`src/testing.ts` resolve isso sozinho:

| Ambiente | O que acontece |
|---|---|
| `DATABASE_URL` definida (CI, ou `docker compose up -d`) | Cria um banco por suíte no Postgres de verdade e o derruba no fim |
| Sem `DATABASE_URL` | Sobe um PGlite — Postgres em WebAssembly — num socket TCP |

Os mesmos testes rodam nos dois. Máquina sem Docker não fica sem teste de
integração, e o CI ainda valida contra o Postgres que vai para produção.

## Mapa de nomes

O código é em inglês, o cérebro é em português (decisão D-10).

| Cérebro | Banco |
|---|---|
| `usuario` | `users` |
| `conta_provedor` | `accounts` |
| `sessao` | `sessions` |
| `criador` | `creators` |
| `duelo` | `duels` |
| (transição de estado) | `duel_transitions` |
| `desafio` | `challenges` |
| `presenca` | `attendance` |
| `arquibancada` | `stand` (`a`, `b`, `general`) |
| `mensagem` | `messages` |
| `voto_resultado` | `result_votes` |
| `sinal_barulho` | `noise_signals` (C-13) |
| `desistencia` / `penalidade` | `abandonments` / `penalties` (C-17) |
| `carteira` / `transacao` | `wallets` / `transactions` (Fase 3) |

## O que ainda não está aqui, de propósito

| Tabela ou coluna | Espera |
|---|---|
| Idade estimada em `users` | `C-24`, travada em `L-08` → `L-02` |
| Senha em `users` | Não vem: login é só por OAuth (`D-15`) |
| `noise_signals` | `C-13` |
| `abandonments`, `penalties` | `C-17` — parâmetros numéricos pendentes em `L-09` |
| `wallets`, `transactions` | Fase 3 — travadas em `L-02` e `L-05` |

Três testes guardam essas ausências: nenhuma coluna de peso pago em
`result_votes` (D-03), nenhuma de idade ou biometria em `users`, e nenhuma de
senha. Coluna que aparecer de carona numa migration distraída reprova o PR.
