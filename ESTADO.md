# ESTADO ATUAL DO PROJETO

> **Atualizar ao fim de toda sessão de trabalho.**

**Última atualização:** 2026-08-20
**Fase atual:** Fase 0 — Definição *(com a frente técnica da Fase 1 correndo em paralelo, pelo que não depende de bloqueio)*
**Nome de trabalho:** TRENDI *(não confirmado — depende de L-01)*

---

## FRENTE ATIVA

O que está sendo trabalhado agora:

| ID | Tarefa | Executor | Status |
|---|---|---|---|
| L-01 | Verificar disponibilidade do nome TRENDI | Leonardo | ⬜ |
| L-02 | Consulta jurídica (monetização, biometria, música) | Leonardo | ⬜ |
| L-03 | Pesquisa e escolha do fornecedor de vídeo | Leonardo | ⬜ |
| C-01 | Repositório, stack base, convenções | Claude Code | ✅ |
| C-08 | Máquina de estados do duelo | Claude Code | ✅ |
| C-14 | Fórmula do voto cruzado | Claude Code | 🟡 fórmula e casos-limite prontos; falta plugar em C-09 e C-12 |
| C-02 | Identidade: cadastro, login, perfil mínimo | Claude Code | ✅ |
| C-37 | Conta nativa: cadastro, login, verificação, recuperação | Claude Code | ✅ **nova** |
| L-17 | Registrar apps OAuth no Google e no Discord | Leonardo | ⬜ |
| L-18 | Contratar provedor de e-mail transacional | Leonardo | ⬜ **nova** |
| C-07 | Chat único por WebSocket | Claude Code | ✅ |
| C-09 | Votação simples (sem peso cruzado) | Claude Code | ⬜ próxima |

---

## BLOQUEIOS ABERTOS

| Bloqueio | Trava o quê | Como destravar |
|---|---|---|
| L-03 pendente | Toda a camada de vídeo (C-03 a C-06, e C-21) | Rodar a pesquisa comparativa de fornecedores |
| L-02 pendente | Monetização e verificação etária | Contratar consulta jurídica |
| L-05 pendente | Pagamentos e contratos | Abrir CNPJ |
| L-17 pendente | Entrar pelo atalho do Google/Discord e publicar o protótipo (C-36) | Registrar os apps e guardar client id/secret |
| L-18 pendente | Link de verificação e de recuperação chegar por e-mail | Contratar provedor de e-mail transacional |

---

## DECISÕES AGUARDANDO LEONARDO

0. Registrar os apps OAuth (L-17) e contratar provedor de e-mail (L-18)
1. Confirmar nome definitivo após L-01
2. Escolher fornecedor de infraestrutura de vídeo após L-03
3. Definir se haverá prêmio em dinheiro (recomendação atual: não no lançamento)
4. Definir split do revenue share com criadores

---

## PRÓXIMOS 3 PASSOS

1. **L-03** — pesquisa de fornecedor de vídeo. Continua o bloqueio mais pesado: C-03 a C-07 dependem dele, e agora é ele que separa o repositório de um duelo real.
2. **L-01** — verificar domínio, INPI e redes para "TRENDI". É barato, rápido, e destrava identidade visual e CNPJ.
3. **L-02** — agendar consulta jurídica. Demora a acontecer, então começar cedo.

Do lado do código, sem depender de nenhum dos três: **C-09** (votação
simples), que já tem identidade para garantir uma conta, um voto, e máquina de
estados para saber quando a janela abre e fecha.

Do seu lado entraram duas tarefas rápidas: **L-17** (registrar os apps de
OAuth) e **L-18** (provedor de e-mail). Nenhuma das duas trava código — a
conta nativa já funciona de ponta a ponta, e fora de produção os links de
verificação e recuperação voltam na própria resposta da API.

---

## MÉTRICAS DA FASE ATUAL

Fase 0 não tem métrica de produto. O portão de saída é (nada aqui depende de código):
- [ ] Nome confirmado e registrado
- [ ] Fornecedor de vídeo escolhido
- [ ] Parecer jurídico recebido
- [ ] Custo por espectador-hora modelado
- [ ] Regras dos 10 desafios escritas

---

## DIÁRIO DE SESSÕES

> Uma linha por sessão. O mais recente no topo.

| Data | O que foi feito | Próximo passo |
|---|---|---|
| 2026-08-20 | C-07: chat do duelo por WebSocket, com ticket, histórico curto e limite por conta (166 testes) | C-09 (votação simples) |
| 2026-08-20 | C-37: conta nativa com senha, verificação de e-mail e recuperação — OAuth virou atalho (D-19) | C-07 (chat) — e L-17, L-18 do lado do Leonardo |
| 2026-08-20 | C-02: login por OAuth, sessão em cookie, perfil mínimo, Prisma e hospedagem escolhida (96 testes) | C-07 (chat) — e L-17 do lado do Leonardo |
| 2026-08-20 | C-01, C-08 e a fórmula do voto cruzado: monorepo, API, tempo real, cliente web, schema e 41 testes | C-02 (identidade) ou C-07 (chat) |
| 2026-08-20 | Cérebro no repo, sincronia com o Projeto e ambiente do Claude Code | Começar a construção pela C-01 |
| — | Cérebro do projeto criado | Começar por L-01 |
