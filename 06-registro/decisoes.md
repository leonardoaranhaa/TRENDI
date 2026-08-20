# REGISTRO DE DECISÕES

Decisões já tomadas. **Não reabrir sem motivo novo.** Este arquivo existe para você não refazer discussão vencida seis meses depois.

Formato: o que foi decidido, quando, por quê, e o que foi descartado.

---

## D-01 — Ambiente próprio, não integração com plataformas existentes
**Data:** — **Status:** travada

**Decisão:** a TRENDI hospeda o vídeo. Não embutimos lives de Twitch, YouTube ou Kick.

**Por quê:** com players de terceiros é impossível garantir latência simétrica entre os dois competidores. Como o produto inteiro depende do público julgar desempenho, latência assimétrica torna o julgamento ilegítimo. Compondo os dois vídeos no servidor, os dois lados veem o mesmo quadro no mesmo instante.

**Descartado:** integração via iframe oficial das plataformas — mais barato e rápido, mas quebra a premissa central.

**Custo da decisão:** infraestrutura muito mais cara e complexa. Aceito conscientemente.

---

## D-02 — Voto cruzado com normalização por proporção
**Data:** — **Status:** travada

**Decisão:** 50% voto da torcida rival, 35% da Geral, 15% da própria torcida. Sempre normalizado por proporção de cada arquibancada, nunca por volume absoluto.

**Por quê:** se cada torcida vota no seu ídolo, ganha sempre a torcida maior — o mesmo defeito do TikTok, trocando dinheiro por número de fãs. Com voto cruzado, para vencer é preciso converter quem torce contra. A normalização por proporção permite que um criador de 100 espectadores vença um de 10.000.

**Descartado:** voto simples por maioria; julgamento por IA (removido por não fazer sentido para desafios subjetivos).

**Efeito colateral desejado:** muda o comportamento do competidor — ele passa a jogar para a plateia adversária, que é onde nasce o momento viral.

---

## D-03 — Dinheiro nunca decide resultado
**Data:** — **Status:** travada

**Decisão:** voto de resultado é sempre gratuito e igual para todos. Presentes e itens pagos afetam atmosfera, cosmético e escolha de desafio — nunca o placar.

**Por quê:** três razões que se reforçam. Competitiva: se dinheiro decide, viramos o TikTok e perdemos o diferencial inteiro. Jurídica: pagamento que influencia resultado com prêmio em dinheiro aproxima o produto do regime de promoção comercial da Lei 5.768/1971, exigindo autorização da SPA/MF. De credibilidade: o ranking só vale se as pessoas acreditarem que mede habilidade.

**Consequência no código:** a tabela `voto_resultado` não tem coluna de peso pago. Ver `02-arquitetura/modelo-de-dados.md`.

---

## D-04 — Chats expostos com escrita restrita
**Data:** — **Status:** travada

**Decisão:** os três chats ficam visíveis para todos, mas cada pessoa só escreve na sua arquibancada.

**Por quê:** a exposição gera a tensão competitiva que o produto quer (decisão do Leonardo). A restrição de escrita preserva 100% dessa tensão enquanto remove o canal direto de ataque pessoal entre torcidas rivais, que é o mecanismo por trás da maior parte do assédio em formatos de confronto.

**Descartado:** chats totalmente separados (mais seguro, menos vivo); chat único (mais caótico, perde a metáfora de estádio).

**Custo da decisão:** carga de moderação significativamente maior. Precisa estar no orçamento operacional desde o dia 1.

---

## D-05 — Barulhômetro é atmosfera, não placar
**Data:** — **Status:** travada

**Decisão:** medidor de interação em tempo real entre os chats, normalizado por tamanho de torcida, visualmente inconfundível com o placar.

**Por quê:** a normalização impede que a torcida maior domine sempre e mate a graça do recurso. A separação visual do placar protege os três pilares: diferencial competitivo, segurança jurídica e credibilidade do ranking.

---

## D-06 — Estimativa de idade em vez de reconhecimento facial
**Data:** — **Status:** travada (sujeita a confirmação em L-02)

**Decisão:** usar estimativa de idade (analisa e descarta) como padrão de acesso. Reservar verificação de identidade com documento apenas para recursos de saque, onde é exigência de compliance financeiro de qualquer forma.

**Por quê:** biometria é dado pessoal sensível na LGPD, e biometria de menores é a categoria de maior exposição jurídica do projeto. Estimativa de idade resolve o problema de portão etário com uma fração do risco e do custo.

---

## D-07 — Sem prêmio em dinheiro no lançamento
**Data:** — **Status:** travada (revisar após L-02)

**Decisão:** o vencedor leva ranking, status e visibilidade. Sem prêmio em dinheiro nas fases iniciais.

**Por quê:** é exatamente assim que as PK Battles operam no Brasil hoje sem enquadramento como aposta. Remove a principal fonte de risco regulatório enquanto o formato é validado. Se for reintroduzido depois, precisa ser custeado pela plataforma, com valor fixo independente da arrecadação.

---

## D-08 — Fase 1 com uma única categoria: Aura
**Data:** — **Status:** travada

**Decisão:** o protótipo implementa só a categoria Aura / Presença.

**Por quê:** é o público-alvo do lançamento e é a categoria mais simples tecnicamente — não exige material nem ferramenta na tela. Permite validar o formato com o mínimo de código.

---

## D-10 — Código em inglês, cérebro em português, com mapa entre os dois
**Data:** 2026-08-20 **Status:** travada

**Decisão:** tabelas, tipos e funções em inglês, como manda `02-arquitetura/convencoes.md`. O cérebro continua em português. A tradução dos termos do domínio fica registrada em dois lugares que ninguém precisa procurar: `packages/shared/src/domain.ts` e a tabela de nomes em `packages/db/README.md`.

**Por quê:** `02-arquitetura/modelo-de-dados.md` descreve as entidades em português (`voto_resultado`, `arquibancada`), e a convenção manda escrever em inglês. Sem um mapa explícito, cada tarefa reinventaria a tradução — `stand`, `bleacher`, `crowd` — e a busca por um termo pararia de funcionar.

**Descartado:** tabelas em português, que casaria com o cérebro mas brigaria com toda biblioteca; e traduzir o cérebro, que é onde o Leonardo pensa.

---

## D-11 — O cérebro fica na raiz do repositório, não em `/docs`
**Data:** 2026-08-20 **Status:** travada

**Decisão:** `01-conceito/` a `06-registro/` e o `ESTADO.md` ficam na raiz. O `/docs` previsto em `convencoes.md` não existe.

**Por quê:** mover o cérebro para `/docs` quebraria `sync/projeto.manifest`, os caminhos do `CLAUDE.md`, os hooks e os comandos — tudo isso por um ganho estético. O `convencoes.md` foi corrigido para descrever o que é verdade.

---

## D-12 — Máquina de estados: as duas leituras que o arquivo de regras não fixa
**Data:** 2026-08-20 **Status:** travada

**Decisão:** duas lacunas de `01-conceito/regras-do-duelo.md` §1 resolvidas assim:

1. **Pareamento não aceito em 60s cancela o duelo.** Quem ainda quiser duelar volta para a fila num duelo novo. A alternativa — voltar de PAREADO para FILA — violaria a unidirecionalidade, que é o que torna a auditoria confiável.
2. **Desistência conta do ACEITE até a EXECUÇÃO.** Depois que a EXECUÇÃO termina, o criador que fecha a aba não interrompe nada: a votação segue e o resultado sai. Por isso o evento de abandono nem é aceito em VOTAÇÃO.

**Por quê:** o arquivo diz "sair depois do ACEITE é desistência, sempre". Ao pé da letra, fechar a aba durante a apuração puniria alguém por um duelo que já aconteceu por inteiro — punição sem dano.

**Custo da decisão:** se a intenção original era punir também nesse caso, muda uma linha em `packages/shared/src/duel-state.ts` e o teste que a cobre.

---

## D-13 — Sem ORM e sem runner de migration por enquanto
**Data:** 2026-08-20 **Status:** revista em C-02 — ver D-18

**Decisão:** o schema são arquivos `.sql` numerados em `packages/db/migrations/`, aplicados com `psql`. Nenhum ORM escolhido.

**Por quê:** escolher Prisma ou Drizzle agora seria decidir sem uso real — `C-02` é a primeira tarefa que escreve consulta de verdade, e é lá que a escolha se paga ou se paga caro. Enquanto isso, SQL puro não trava nada.

**Como isso não vira dívida silenciosa:** os testes aplicam todas as migrations num Postgres em memória (PGlite) a cada `npm test`. SQL quebrado não passa de PR.

---

## D-14 — Stack concretizada: Fastify, Next 16, npm workspaces, Vitest
**Data:** 2026-08-20 **Status:** travada (a camada de vídeo continua aberta em L-03)

**Decisão:** dos "ou" que `02-arquitetura/stack.md` deixava em aberto: **Fastify** (não NestJS), **`ws`** puro no servidor de tempo real (não Socket.io), **npm workspaces** (não pnpm ou Turborepo), **Vitest** como runner.

**Por quê:** projeto solo. Fastify e `ws` cabem na cabeça inteiros; NestJS cobra estrutura antes de existir tamanho que justifique. npm workspaces já vem instalado. Vitest roda TypeScript sem etapa de build.

**Next 16, não 15:** o 15 entra com três vulnerabilidades altas herdadas de `sharp`. Em projeto novo não há custo de migração.

**O que continua em aberto:** vídeo (`L-03`), hospedagem e Postgres gerenciado (`L-05`), ORM (`D-13`).

---

## D-15 — Login só por OAuth, sem senha
**Data:** 2026-08-20 **Status:** travada

**Decisão:** entra-se na TRENDI por Google ou Discord. Não existe cadastro com senha.

**Por quê:** senha que não existe não vaza, não precisa de política, de recuperação, nem de rate limit em tela de esqueci-minha-senha. O público-alvo já tem as duas contas — Discord é onde a comunidade de criador vive. E a identidade fica sendo a conta do provedor, não o e-mail: e-mail muda, pode vir vazio no Discord, e casar contas por e-mail entrega a conta de alguém para quem registrou o mesmo endereço em outro serviço.

**Descartado:** link mágico por e-mail (depende de domínio próprio, que pende de L-01, e de provedor de envio); senha (superfície de risco sem ganho).

**Custo da decisão:** dependência de terceiro para entrar. Se o Discord cair, ninguém novo entra — quem já tem sessão continua. E exige registrar os apps nos dois provedores, que virou a tarefa L-17.

**Consequência no código:** `users` não tem coluna de senha, e um teste garante que continue assim.

---

## D-16 — Sessão opaca em cookie, com hash no banco
**Data:** 2026-08-20 **Status:** travada

**Decisão:** ao entrar, o servidor sorteia 32 bytes, guarda **só o hash SHA-256** e devolve o token num cookie `httpOnly`, `SameSite=Lax`, com 30 dias e renovação deslizante.

**Por quê:** dump de banco vazado não vira sessão de ninguém. Comparado a JWT, a sessão opaca pode ser revogada na hora — banir alguém no meio de um duelo precisa ter efeito imediato, e token autoassinado só morre quando vence.

**Consequência de arquitetura:** cookie não atravessa domínio diferente em conexão `wss://`. Então o servidor de tempo real não usa o cookie: quem tem sessão pede à API um **ticket assinado de 60 segundos** e apresenta na conexão. O ticket vive em `@trendi/shared/realtime-ticket` e é conferido sem consultar banco, que é o que aguenta sala cheia entrando de uma vez.

---

## D-17 — Hospedagem: Vercel, Fly.io e Supabase
**Data:** 2026-08-20 **Status:** travada (a camada de vídeo segue aberta em L-03)

**Decisão:** cliente Next na **Vercel**; API e servidor de tempo real na **Fly.io**, em região no Brasil; Postgres no **Supabase** (São Paulo), usando só o banco.

**Por quê:** a Vercel não segura WebSocket — função serverless não mantém conexão viva, e chat, barulhômetro e estado do duelo são conexão longa. Então o backend precisa de processo sempre ligado, e a Fly dá isso com região perto do público, que é o que a votação e o barulhômetro sentem. O banco fica junto da API, não junto do site: quem conversa com o banco é a API.

**Descartado:** tudo na Vercel com Ably ou Pusher para o tempo real (custo por mensagem, justo onde o volume é alto, e a normalização do barulhômetro sairia do nosso controle); Cloud Run (WebSocket com teto por conexão); Railway e Render (sem região no Brasil).

**Consequência no código:** `/api/*` no cliente é reescrito para a API, o que mantém o cookie de sessão como cookie de primeira parte enquanto não existe domínio próprio (L-01). O WebSocket não passa por esse rewrite — vai direto, com o ticket da D-16.

**A conferir antes de contratar:** o plano Hobby da Vercel é para projeto não comercial, e a TRENDI em algum momento vira Pro. A máquina da Fly não pode dormir. E confira o código de região disponível na sua conta.

---

## D-18 — Prisma como fonte da verdade do schema
**Data:** 2026-08-20 **Status:** travada (revisa a D-13)

**Decisão:** `packages/db/prisma/schema.prisma` descreve o banco. As migrations continuam sendo `.sql` numerado, escrito à mão e aplicável com `psql`.

**Por quê:** C-02 foi a primeira tarefa a escrever consulta de verdade, que era o gatilho combinado na D-13. Tipo derivado do schema paga o próprio custo já no primeiro `findUnique`, e o Prisma 7 fala com o Postgres por adapter, sem engine binária no meio.

**O que impede as duas metades divergirem:** um teste roda `prisma migrate diff` entre o banco criado pelas migrations e o schema. Diferença reprova o PR. Foi ele que pegou, no primeiro dia, que as chaves estrangeiras escritas à mão não tinham a mesma ação de referência que o Prisma esperava.

**Descartado:** deixar o Prisma gerar as migrations (exige banco sombra e tira a legibilidade do SQL); Drizzle (schema em TypeScript, duplicando o que o `.sql` já diz).

## MODELO PARA NOVAS DECISÕES

```
## D-XX — [título curto]
**Data:** **Status:** travada | em revisão

**Decisão:**
**Por quê:**
**Descartado:**
**Custo da decisão:**
```

---

## D-09 — Nome da plataforma: TRENDI
**Data:** — **Status:** em revisão (depende de L-01)

**Decisão:** o nome do produto passa a ser TRENDI.

**Por quê:** curto, fácil de falar em português, e amarra com o posicionamento — o produto vive de tendência, tanto no catálogo de desafios (alimentado por trends) quanto no objetivo dos criadores (viralizar).

**Descartado:** AURA (envelhece junto com o meme), Blessed, GERAL, RACHA.

**Risco conhecido:** por derivar de palavra comum do setor, tende a ser classificado como marca sugestiva — registro mais difícil e proteção mais fraca. Ver `04-leonardo/juridico.md`. Status só passa a "travada" após L-01.
