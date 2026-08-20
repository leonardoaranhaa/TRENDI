# Banco de dados

PostgreSQL. Migrations numeradas em `migrations/`, aplicadas em ordem.

## Como aplicar

```bash
psql "$DATABASE_URL" -f packages/db/migrations/0001_core.sql
```

Ainda não há runner de migration nem ORM — ver decisão D-12. Enquanto o
schema cabe em `psql`, uma ferramenta a mais é peso sem retorno.

O teste `migrations.test.ts` aplica todas as migrations num Postgres em
memória (PGlite) a cada `npm test`: SQL quebrado não passa em PR.

## Mapa de nomes

O código é em inglês, o cérebro é em português (decisão D-10).

| Cérebro | Banco |
|---|---|
| `usuario` | `users` |
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

| Tabela | Espera |
|---|---|
| Idade estimada em `users` | `C-24`, travada em `L-08` → `L-02` |
| `noise_signals` | `C-13` |
| `abandonments`, `penalties` | `C-17` — parâmetros numéricos pendentes em `L-09` |
| `wallets`, `transactions` | Fase 3 — travadas em `L-02` e `L-05` |
