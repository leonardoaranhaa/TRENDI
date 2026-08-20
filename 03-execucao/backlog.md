# BACKLOG — Todas as Tarefas

**Legenda de status:** ⬜ não iniciado · 🟡 em andamento · ✅ concluído · 🔴 bloqueado

**Legenda de executor:** `[L]` Leonardo (mundo real) · `[C]` Claude Code (construção)

---

## FASE 0 — DEFINIÇÃO

| ID | Tarefa | Exec | Status | Depende de |
|---|---|---|---|---|
| L-01 | Verificar nome TRENDI: domínio, INPI, redes | L | ⬜ | — |
| L-02 | Consulta jurídica: monetização, biometria, música | L | ⬜ | — |
| L-03 | Pesquisa e escolha do fornecedor de vídeo | L | ⬜ | — |
| L-04 | Modelar custo por espectador-hora | L | ⬜ | L-03 |
| L-05 | Abrir CNPJ e definir regime tributário | L | ⬜ | L-01 |
| L-06 | Escrever regras dos 10 desafios | L | ⬜ | — |
| L-07 | Mapear organizadores de batalha de aura | L | ⬜ | — |
| L-08 | Escolher serviço de estimativa de idade | L | ⬜ | L-02 |
| L-09 | Definir parâmetros numéricos da penalidade | L | ⬜ | — |
| L-10 | Definir split do revenue share | L | ⬜ | L-04 |

---

## FASE 1 — PROTÓTIPO FECHADO

| ID | Tarefa | Exec | Status | Depende de |
|---|---|---|---|---|
| C-01 | Montar repositório, stack base, convenções | C | ✅ | — |
| C-02 | Identidade: cadastro, login, perfil mínimo | C | ✅ | C-01 |
| C-03 | Integrar SDK do fornecedor de vídeo | C | 🔴 | **L-03** |
| C-04 | Captação WebRTC do navegador (sem download) | C | ⬜ | C-03 |
| C-05 | Composição split-screen no servidor | C | ⬜ | C-04 |
| C-06 | Sala de duelo: página do estádio, versão mínima | C | ⬜ | C-05 |
| C-07 | Chat único por WebSocket | C | ⬜ | C-01 |
| C-08 | Máquina de estados do duelo | C | ✅ | C-01 |
| C-09 | Votação simples (sem peso cruzado) | C | ⬜ | C-08 |
| C-10 | Desafio fixo da categoria Aura | C | ⬜ | L-06 |
| C-37 | Conta nativa: cadastro, login, verificação e recuperação | C | ✅ | C-02 |
| L-17 | Registrar apps OAuth no Google e no Discord | L | ⬜ | — |
| L-18 | Contratar provedor de e-mail transacional | L | ⬜ | L-01 |
| C-36 | Publicar o protótipo (Vercel + Fly + Supabase) | C | ⬜ | C-02, L-01, L-17 |

> `C-37` fez do login por senha a porta da frente (decisão D-19): dá para criar
> conta e entrar sem depender de Google nem Discord. O que falta é o carteiro —
> `L-18`, provedor de e-mail, para os links de verificação e de recuperação
> saírem daqui. Fora de produção eles voltam na própria resposta da API.
>
> `C-02` está construída e testada com um provedor falso. Para entrar com a
> conta do Google ou do Discord de verdade falta `L-17`, que é cadastro nos
> dois portais. Nada de código depende disso.

---

## FASE 2 — MVP PRIVADO

> `C-14` está 🟡: a fórmula e os casos-limite estão em `packages/shared/src/cross-vote.ts`
> com teste para cada linha da tabela do arquivo de regras. Falta plugar no
> serviço de votação (`C-09`) e nas arquibancadas travadas (`C-12`).

| ID | Tarefa | Exec | Status | Depende de |
|---|---|---|---|---|
| C-11 | Três chats com escrita restrita ao próprio lado | C | ⬜ | C-07 |
| C-12 | Sistema de arquibancadas e travamento na votação | C | ⬜ | C-11 |
| C-13 | Barulhômetro: coleta, normalização, publicação | C | ⬜ | C-12 |
| C-14 | Voto cruzado completo com todos os casos-limite | C | 🟡 | C-09, C-12 |
| C-15 | Antifraude de voto | C | ⬜ | C-14 |
| C-16 | Fila e matchmaking por faixa de audiência | C | ⬜ | C-08 |
| C-17 | Penalidade progressiva e reabilitação | C | ⬜ | C-16, L-09 |
| C-18 | Fluxo de contestação de desistência | C | ⬜ | C-17 |
| C-19 | Escolha de desafio + tempo pelo público | C | ⬜ | C-10, C-12 |
| C-20 | Catálogo com 3 a 5 categorias | C | ⬜ | L-06 |
| C-21 | Geração e download de clipe | C | ⬜ | C-05 |
| C-22 | Moderação em camadas | C | ⬜ | C-11 |
| C-23 | Fila humana de revisão de moderação | C | ⬜ | C-22 |
| C-24 | Estimativa de idade no cadastro | C | 🔴 | **L-08** |
| C-25 | Painel de duelos ao vivo | C | ⬜ | C-16 |

---

## FASE 3 — BETA ABERTO

| ID | Tarefa | Exec | Status | Depende de |
|---|---|---|---|---|
| C-26 | Catálogo completo com 10 categorias | C | ⬜ | L-06 |
| C-27 | Ranking e temporadas | C | ⬜ | C-14 |
| C-28 | Assinatura de espectador | C | 🔴 | **L-02, L-05** |
| C-29 | Ferramentas premium de clipe | C | ⬜ | C-21, L-05 |
| C-30 | Presentes como gorjeta (sem efeito no placar) | C | 🔴 | **L-02** |
| C-31 | Motor de tendências: YouTube + Twitch + chat | C | ⬜ | C-22 |
| C-32 | Biblioteca de música licenciada na interface | C | 🔴 | **L-11** |
| L-11 | Contratar biblioteca de música licenciada | L | ⬜ | L-02 |
| L-12 | Contratar gateway de pagamento | L | ⬜ | L-05 |
| L-13 | Redigir Termos de Uso e Política de Privacidade | L | ⬜ | L-02 |
| L-14 | Nomear encarregado de dados (DPO) | L | ⬜ | L-05 |

---

## FASE 4 — ESCALA

| ID | Tarefa | Exec | Status | Depende de |
|---|---|---|---|---|
| C-33 | Revenue share automatizado | C | ⬜ | L-10, L-12 |
| C-34 | Patrocínio nativo por categoria | C | ⬜ | C-26 |
| C-35 | Desafios criados pela comunidade | C | ⬜ | C-31 |
| L-15 | Negociação ECAD / música comercial | L | ⬜ | L-11 |
| L-16 | Avaliar prêmio em dinheiro com estrutura jurídica | L | ⬜ | L-02 |
