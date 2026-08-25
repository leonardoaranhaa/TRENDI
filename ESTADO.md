# ESTADO ATUAL DO PROJETO

> **Atualizar ao fim de toda sessão de trabalho.**

**Última atualização:** 2026-08-25
**Fase atual:** Fase 0 quase fechada — o portão só espera nome, CNPJ e parecer jurídico. A frente técnica da Fase 1 corre em paralelo.
**Nome de trabalho:** TRENDI *(não confirmado — depende de L-01)*

---

## FRENTE ATIVA

O que está sendo trabalhado agora:

| ID | Tarefa | Executor | Status |
|---|---|---|---|
| L-01 | Verificar disponibilidade do nome TRENDI | Leonardo | ⬜ |
| L-02 | Consulta jurídica (monetização, biometria, música) | Leonardo | ⬜ |
| L-03 | Fornecedor de vídeo: **Amazon IVS** (D-20) | Claude Code, autorizado | ✅ |
| L-06 | Regras da plataforma: três de conduta (D-21) | Claude Code | ✅ |
| L-19 | Criar conta AWS e habilitar IVS | Leonardo | ⬜ **nova** |
| C-03 | Integrar o SDK de vídeo | Claude Code | ✅ |
| C-04 | Captação WebRTC do navegador | Claude Code | ✅ |
| C-05 | Composição split-screen no servidor | Claude Code | ✅ **nova** |
| C-06 | Sala de duelo: página do estádio | Claude Code | ✅ **nova** |
| C-38 | A API avisa o tempo real quando o duelo muda de estado | Claude Code | ✅ **nova** |
| C-10 | Desafio fixo da categoria Aura | Claude Code | ⬜ próxima |
| C-39 | Identidade da marca aplicada ao cliente web | Claude Code | ✅ **nova** |
| L-20 | Enviar o logotipo em vetor (SVG) | Leonardo | ⬜ **nova** |
| C-01 | Repositório, stack base, convenções | Claude Code | ✅ |
| C-08 | Máquina de estados do duelo | Claude Code | ✅ |
| C-14 | Fórmula do voto cruzado | Claude Code | 🟡 fórmula e casos-limite prontos; falta plugar em C-09 e C-12 |
| C-02 | Identidade: cadastro, login, perfil mínimo | Claude Code | ✅ |
| C-37 | Conta nativa: cadastro, login, verificação, recuperação | Claude Code | ✅ **nova** |
| L-17 | Registrar apps OAuth no Google e no Discord | Leonardo | ⬜ |
| L-18 | Contratar provedor de e-mail transacional | Leonardo | ⬜ **nova** |
| C-07 | Chat único por WebSocket | Claude Code | ✅ |
| C-09 | Votação simples (sem peso cruzado) | Claude Code | ✅ |

---

## BLOQUEIOS ABERTOS

| Bloqueio | Trava o quê | Como destravar |
|---|---|---|
| L-19 pendente | Vídeo de verdade (o código anda com fornecedor falso) | Criar conta AWS, habilitar IVS, guardar credenciais |
| L-02 pendente | Monetização e verificação etária | Contratar consulta jurídica |
| L-05 pendente | Pagamentos e contratos | Abrir CNPJ |
| L-17 pendente | Entrar pelo atalho do Google/Discord e publicar o protótipo (C-36) | Registrar os apps e guardar client id/secret |
| L-18 pendente | Link de verificação e de recuperação chegar por e-mail | Contratar provedor de e-mail transacional |

---

## DECISÕES AGUARDANDO LEONARDO

0. Criar a conta AWS (L-19), registrar os apps OAuth (L-17) e contratar provedor de e-mail (L-18)
1. Confirmar nome definitivo após L-01
2. ~~Escolher fornecedor de vídeo~~ — feito: Amazon IVS (D-20)
3. Definir se haverá prêmio em dinheiro (recomendação atual: não no lançamento)
4. Definir split do revenue share com criadores

---

## PRÓXIMOS 3 PASSOS

1. **L-19** — criar a conta AWS e habilitar o IVS. É o que separa o fornecedor falso do vídeo de verdade.
2. **L-01** — verificar domínio, INPI e redes para "TRENDI". É barato, rápido, e destrava identidade visual e CNPJ.
3. **L-02** — agendar consulta jurídica. Demora a acontecer, então começar cedo.

**A fila de código segue andando.** `C-06` fechou, e é a primeira vez que o
produto existe para quem não está duelando: o estádio junta o quadro montado
no servidor, o chat e a votação — três coisas que estavam prontas e não se
falavam. **Assistir não pede conta** (D-23); falar e votar, sim.

O buraco que a `C-06` revelou está fechado: **a `C-38` ligou a API ao tempo
real**. Quando o duelo muda de estado, o aviso sai de dentro da mesma
transação que grava a transição (D-26) — então a janela de votação abre no
mesmo instante para todo mundo, que é o que a legitima. Está provado em
navegador: a tela vira de EXECUÇÃO para VOTAÇÃO sem recarregar.

O caminho segue em `C-10` (o desafio da categoria Aura). Nada espera você:
sem a conta AWS, a tela diz na cara que não há vídeo saindo dali.

**A plataforma agora tem a cara da marca (D-25).** Preto de verdade, azul
`#0132FF` e Montserrat, com o escuro subindo em azul-noite — nada de cinza
genérico. Os lados do duelo ficaram azul contra branco, dentro da paleta,
como você escolheu; para os dois não parecerem ter pesos diferentes, os dois
são preenchimento sólido e os dois acendem.

Uma coisa apareceu ao medir: **o azul da marca não serve para texto** sobre
preto (2,9:1 de contraste, abaixo do legível). Ele preenche — botão, chip,
brilho. Onde o texto precisa ser azul, entra o mesmo azul clareado. Tem teste
para não se perder.

**`L-20`, sua e rápida:** mandar o logotipo em **vetor (SVG)**. O que está no
ar foi extraído do quadro de identidade em 615px — serve para tela, não para
impressão nem para ampliar.

**Entrou item no seu `L-19`:** criar a *encoder configuration* de 720p (é ela
que fixa a qualidade e o custo da entrega) e conferir, com a conta na mão, que
o lado A aparece mesmo à esquerda. O código manda o parâmetro certo; só a AWS
respondendo prova a ordem.

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
| 2026-08-25 | C-38: o aviso de estado atravessa da API ao tempo real pelo Postgres, dentro da transação (D-26) | C-10 — desafio Aura |
| 2026-08-25 | C-39: identidade da marca aplicada ao cliente web — paleta, tipografia, logotipo e os lados do duelo (258 testes + 15 de navegador) | C-38 — aviso de estado |
| 2026-08-24 | C-06: estádio — visitante assiste, chat conectado, voto na tela e placar só no fim (255 testes + 15 de navegador) | C-38 — aviso de estado |
| 2026-08-24 | C-05: quadro do duelo com lado fixo, qualidade escrita e segunda chance para a composição (238 testes) | C-06 — estádio |
| 2026-08-21 | C-04: tela do competidor, captação sem download, modo local e 5 testes de navegador (233 + 5) | C-05 — composição |
| 2026-08-20 | C-03: camada de mídia atrás de interface, com fornecedor falso e adaptador IVS (220 testes) | C-04 — captação no navegador |
| 2026-08-20 | L-03 e L-06 fechadas: fornecedor é Amazon IVS (D-20), e a plataforma passa a ter três regras de conduta (D-21) | C-03 — integrar o SDK |
| 2026-08-20 | C-09: votação simples, ciclo do duelo persistido e placar revelado só no fim (187 testes) | Fila de código da Fase 1 vazia — segue com L-03 e L-06 |
| 2026-08-20 | C-07: chat do duelo por WebSocket, com ticket, histórico curto e limite por conta (166 testes) | C-09 (votação simples) |
| 2026-08-20 | C-37: conta nativa com senha, verificação de e-mail e recuperação — OAuth virou atalho (D-19) | C-07 (chat) — e L-17, L-18 do lado do Leonardo |
| 2026-08-20 | C-02: login por OAuth, sessão em cookie, perfil mínimo, Prisma e hospedagem escolhida (96 testes) | C-07 (chat) — e L-17 do lado do Leonardo |
| 2026-08-20 | C-01, C-08 e a fórmula do voto cruzado: monorepo, API, tempo real, cliente web, schema e 41 testes | C-02 (identidade) ou C-07 (chat) |
| 2026-08-20 | Cérebro no repo, sincronia com o Projeto e ambiente do Claude Code | Começar a construção pela C-01 |
| — | Cérebro do projeto criado | Começar por L-01 |
