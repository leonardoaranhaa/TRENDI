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
**Data:** 2026-08-20 **Status:** revista no mesmo dia — ver D-19

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

---

## D-19 — Conta nativa é a porta da frente; OAuth é atalho
**Data:** 2026-08-20 **Status:** travada (revisa a D-15)

**Decisão:** dá para criar conta na TRENDI com e-mail e senha. Google e Discord continuam, como caminho rápido para quem prefere.

**Por quê:** decisão do Leonardo, e ela resolve um problema real da D-15: depender só de provedor externo é entregar a porta de entrada para terceiro. Se o Discord cair ou mudar de política, ninguém novo entra. Parte do público-alvo também não quer amarrar a conta de rede social a uma plataforma nova — e essa fricção aparece justamente no cadastro, que é onde menos se pode perder gente.

**Como a senha é guardada:** `scrypt`, que vem no Node, com sal por senha e os parâmetros de custo gravados no próprio registro para poder endurecer depois sem invalidar o que já existe. Nada de dependência nativa para compilar.

**Política de senha:** mínimo de 10 caracteres, teto de 200, recusa das mais tentadas do mundo e da senha igual ao e-mail. Sem exigir maiúscula, número e símbolo — regra de composição empurra todo mundo para `Senha@123`, e a recomendação atual do NIST é justamente tamanho em vez de composição.

**Quando conta nativa e OAuth se juntam:** só quando os dois lados provaram ser donos do e-mail — o provedor diz que verificou, e a conta daqui verificou também. Sem essa trava, bastaria cadastrar com o e-mail de outra pessoa e esperar ela entrar pelo Google para herdar a conta dela.

**Custo da decisão:** senha é superfície de ataque e trabalho contínuo — limite de tentativas, recuperação, e um provedor de e-mail para os links (tarefa L-18). Aceito conscientemente: a alternativa era depender de terceiro para existir.

---

## D-20 — Fornecedor de vídeo: Amazon IVS
**Data:** 2026-08-20 **Status:** travada (fecha L-03)

**Decisão:** Amazon IVS. Real-Time (stage) para captação dos dois competidores e composição no servidor; Low-Latency Streaming (channel) para a plateia; gravação composta em S3.

**Quem decidiu:** o Leonardo autorizou explicitamente o Claude Code a escolher — "te autorizo a decidir conforme a necessidade". O `CLAUDE.md` proíbe escolher fornecedor de vídeo por conta própria, e essa proibição continua valendo para tudo o que não for esta decisão.

**Por quê, na ordem que pesou:**

1. **Região no Brasil, com preço publicado.** Foi a única candidata em que confirmei presença na América do Sul. O produto é brasileiro e vive de duelo ao vivo. Rotear a mídia para a Virgínia manteria a latência simétrica (a D-01 sobreviveria), mas pioraria a sensação para todo mundo.
2. **Composição no servidor, gerenciada.** Stage com os dois → composição em grade, que é o split-screen → channel HLS para a audiência. Sem operar encoder, que é o que `stack.md` chama de "preferir gerenciado; o recurso escasso é tempo".
3. **Gravação sai no caminho** — composite recording para S3 é a matéria-prima dos clipes (`C-21`).
4. **Um fornecedor só** para mídia, storage e CDN.

**Números levantados, região América do Sul:** participante no stage $0,084/h; composição HD $0,30/h; entrega HD $0,084 por espectador-hora, SD $0,042. Um duelo de 30 minutos com 200 espectadores em HD dá ~$0,25 de captação e composição e ~$8,40 de entrega — **a entrega é 97% da conta**, exatamente como `visao-geral.md` já avisava.

**Descartado: LiveKit Cloud.** Aceita WHIP, é open source (com saída de auto-hospedagem) e a composição dele renderiza uma página web, o que permitiria overlays embutidos no vídeo. Perdeu por não ter presença confirmada na América do Sul — a documentação lista us-east, eu-central e ap-south. Para este produto, é o critério errado de perder. Também descartados: Cloudflare Realtime (não faz composição gerenciada de dois participantes) e os demais candidatos de `04-leonardo/fornecedores.md`, que não somam região no Brasil e composição gerenciada.

**Onde os overlays vivem:** placar e barulhômetro ficam em DOM, sobre o vídeo composto — não queimados no quadro. É melhor para o produto: a D-05 exige que o barulhômetro seja visualmente inconfundível com o placar, e isso se itera em CSS, não em template de composição. Os clipes queimam os overlays na renderização (`C-21`).

**Gatilho de revisão:** quando a entrega passar do patamar que `L-04` vai definir, reavaliar LiveKit auto-hospedado ou CDN própria. A distribuição é HLS nos dois casos, então a troca fica contida na camada de entrega.

**A conferir na criação da conta (`L-19`):** disponibilidade de IVS Real-Time em `sa-east-1`, o comportamento da grade de composição com dois participantes, e os preços — pesquisa de preço envelhece.

---

## D-21 — A plateia julga desempenho; a plataforma julga conduta
**Data:** 2026-08-20 **Status:** travada (fecha L-06, em forma diferente da prevista)

**Decisão:** a TRENDI não escreve regra sobre o que é um bom desempenho. Escreve três regras de conduta, que valem para todos e em qualquer categoria: **pudor**, **respeito** e **segurança e legalidade**. Estão em `01-conceito/regras-da-plataforma.md`.

**Por quê:** decisão do Leonardo, e ela é coerente com a espinha do produto. O julgamento é da arquibancada — é para isso que existe o voto cruzado (D-02). Regra de plataforma sobre execução de desafio seria a plataforma virando júri, e júri não precisa de arquibancada.

**O que muda em relação ao previsto:** `L-06` era "escrever as regras dos 10 desafios". Cada desafio continua tendo nome, faixa de tempo e critério visível, mas **critério visível não é regra de julgamento**: é a frase que diz à plateia o que ela está julgando. As regras que a plataforma faz cumprir são as três de conduta.

**Cada regra vem com o que ela não proíbe.** Isso é parte da decisão, não redação: regra sem limite escrito vira moderação por gosto pessoal, e no caso da regra de respeito, mataria a provocação entre torcidas — que é o clima que faz o produto existir, e que `servicos.md` já mandava a moderação preservar.

**Consequência no código:** a moderação (`C-22`) implementa três regras, não dez catálogos. Quem é encerrado por infração perde por conduta, não por voto — o placar continua significando desempenho, que é o que o ranking mede.

## D-22 — O quadro do duelo tem lado fixo
**Data:** 2026-08-24 **Status:** travada

**Decisão:** o lado A ocupa a esquerda e o lado B a direita, em **todo** duelo. A ordem não depende de quem conectou primeiro. A regra mora em `COMPOSITION_LAYOUT`, no contrato de `@trendi/video`, junto com as outras três de montagem do quadro: lado parado continua na tela, sem faixa entre os dois, cortando para preencher.

**Por quê:** a composição em grade, sem ordenação explícita, ordena por chegada ao palco. Isso quebra três coisas ao mesmo tempo. A plateia perde a referência — "o da esquerda" deixa de significar alguém. Placar e barulhômetro ficam em DOM sobre o vídeo (D-20) e são fixos por lado: com o vídeo trocando, o overlay passa a apontar para o competidor errado, e aí o placar mente. E o clipe (`C-21`) herda o defeito, que é justamente o que sai da plataforma para as outras redes.

**Onde a regra fica:** no contrato do fornecedor, não no adaptador. A D-20 nasceu com gatilho de revisão escrito; quando ele disparar, trocar de fornecedor deve ser traduzir estas quatro linhas, não redescobrir a regra.

**O que ainda não está provado:** que o IVS de fato coloca `'a'` à esquerda. O teste prova que mandamos `participantOrderAttribute: 'side'`; a ordem só a AWS responde, e a conta existe depois de `L-19` — onde isso virou item de checklist.

## D-23 — Assistir não pede conta; falar e votar pedem
**Data:** 2026-08-24 **Status:** travada

**Decisão:** o estádio abre para qualquer pessoa. Visitante vê o duelo, o estado, quem está duelando e o resultado. Conta só entra em cena para escrever no chat e para votar.

**Por quê:** decisão do Leonardo. A plataforma cresce por link e por clipe — é o que a `C-21` existe para produzir —, e link que morre numa tela de cadastro não cresce nada. A fricção fica onde há contrapartida: para votar, a conta é o que sustenta "uma conta, um voto" e o antifraude das regras §6.

**O custo, escrito para não ser esquecido:** pico de espectador anônimo consome entrega, que é ~97% da conta (D-20) e vira conta sem virar conta de usuário. Se isso apertar, o lugar de mexer é teto de espectador simultâneo por duelo — que a `visao-geral.md` já lista como mitigação —, não a porta do estádio.

**Consequência no código:** `GET /duels/:duelId` responde sem sessão, e o estádio nunca redireciona para o login. A parede só aparece onde existe ação atrás dela: é o que `situacaoDaPlateia` decide, e o que os testes de navegador provam abrindo a página sem cookie nenhum.

## D-24 — Player do IVS para a plateia
**Data:** 2026-08-24 **Status:** travada, com o mesmo gatilho da D-20

**Decisão:** quem assiste usa o `amazon-ivs-player`, do fornecedor já escolhido na D-20, isolado em `apps/web/lib/ivs-player.ts` com `import()` dinâmico. Os binários de worker e wasm são servidos por nós, copiados no build — não pelo CDN do fornecedor.

**Por quê:** o player do IVS entende LL-HLS de verdade, e latência é o que legitima o voto — plateia atrasada julga outro instante (princípio 5). A alternativa neutra, `hls.js`, tocaria HLS de qualquer origem, mas com suporte genérico a baixa latência: o ganho de portabilidade sai do lugar errado.

**O que compensa o acoplamento:** o SDK entra por um arquivo só, como o de captação da C-04. Quando o gatilho de revisão da D-20 disparar, trocar de player é trocar esse arquivo.

**Servir os binários daqui** evita que cada espectador dependa de um terceiro para o vídeo abrir. São ~1,6 MB: entram no build (`apps/web/scripts/copiar-player.mjs`), não no repositório.

## D-25 — A identidade da marca aplicada ao produto
**Data:** 2026-08-25 **Status:** travada

**Decisão:** o cliente web veste a identidade da TRENDI — azul `#0132FF`, branco e preto, sobre preto de verdade, com o escuro subindo em azul-noite (`#00061A`) e nunca em cinza-neutro. Tipografia Montserrat, servida por nós. O brilho azul é assinatura, não enfeite: aparece atrás do logotipo em toda peça de marca, e aparece na tela.

**A descoberta que mudou uma coisa:** `#0132FF` sobre preto dá **2,9:1** de contraste — abaixo do mínimo legível para texto. Ele é cor de **preenchimento**: botão, chip, borda acesa, brilho. Onde o texto precisa ser azul, entra o mesmo azul clareado até passar em AA (`#5B82FF`, 6,1:1). Não é desvio da identidade; é o que faz a identidade ser lida em celular no ônibus. Tem teste (`identidade.test.ts`), porque `text-azul` é o que qualquer um escreveria primeiro.

**Os lados do duelo: azul contra branco.** Decisão do Leonardo, mantendo a paleta de três cores intacta em vez de acrescentar um contra-acento quente. O risco que isso corre é assimetria — um lado vestindo a marca e o outro a ausência dela, num produto cuja tese é simetria. A compensação é de peso, e é regra: os dois lados são **preenchimento sólido**, mesmo tamanho, mesma tipografia, e **os dois acendem** (o lado B com brilho branco). Nenhum dos dois é contorno. Se algum dia um lado ganhar tratamento que o outro não tem, isso vira mentira sobre o placar.

**O logotipo é lettering desenhado à mão** — não é fonte, e não se compõe com CSS. Entra como imagem, num componente só (`componentes/marca.tsx`), para a troca pelo vetor ser um arquivo. O arquivo atual foi **extraído do quadro de identidade** em 615px: serve para tela, não para impressão nem ampliação. O SVG é a `L-20`.

**A fonte vem do npm e é servida daqui**, não de `fonts.googleapis.com` — mesmo motivo dos binários do player (D-24): ninguém deveria depender de um terceiro para a página abrir com a cara certa, e build que busca na rede é build que quebra sozinho.

**O que a peça de marca traz e o produto não segue:** o quadro de identidade mostra aplicações em Twitch, YouTube, Kick e TikTok Live. Isso é colateral de marketing. A TRENDI é ambiente próprio — não embutimos live de terceiro (é o princípio nº 4 e a razão da D-01). As peças servem à divulgação; a arquitetura não muda por causa delas.

## D-26 — O aviso de estado atravessa pelo Postgres, não por HTTP
**Data:** 2026-08-25 **Status:** travada

**Decisão:** quando o duelo muda de estado, a API dispara `pg_notify` no canal `duelo_estado`, **dentro da transação que grava a transição**. O servidor de tempo real escuta com uma conexão dedicada e repassa para a sala.

**Por quê, e a razão principal não é a óbvia.** A óbvia é não acrescentar infraestrutura — verdade, mas HTTP também não acrescentaria. A que decide é esta: `pg_notify` numa transação **só é entregue se ela der certo**. Avisar de uma transição que não gravou passa a ser impossível por construção, em vez de depender de alguém manter a ordem certa das chamadas. É este aviso que abre a janela de votação na tela de todo mundo; se ele mentir, o duelo mente.

A segunda razão é escala: com HTTP, a API precisaria conhecer o endereço de cada instância de tempo real. Esquecer uma significaria metade da plateia com a janela atrasada — exatamente o defeito que a `C-38` existe para matar, voltando pela porta dos fundos.

**Vai só o estado final da chamada.** O ACEITE é instantâneo e encadeia transições; um aviso por passagem faria a tela piscar, e quem recebe relê o duelo de qualquer jeito.

**A releitura periódica do estádio fica.** Ela é o piso enquanto a conexão do ouvinte cai e volta. Duas fontes para o mesmo fato não é redundância à toa: é o que a `C-06` já previa.

**Custo aceito:** o tempo real passa a exigir `DATABASE_URL` — antes ele só precisava dela para o histórico do chat, agora sem ela não há aviso nenhum, e o processo recusa subir dizendo isso.

**O que isto não é:** agendador. Timeout automático de estado continua dependendo de alguém clicar até a `C-16`. A `C-38` transporta o aviso; não decide quando o duelo muda.

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
