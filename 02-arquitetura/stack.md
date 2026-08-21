# STACK TÉCNICA

> O que está em **negrito** já está montado e rodando. A camada de vídeo tem
> fornecedor decidido (D-20) e espera a conta AWS (`L-19`) para sair do papel.

Monorepo com npm workspaces, TypeScript em modo estrito, Vitest como runner.
Ver decisão D-14.

## Frontend

| Item | Escolha | Motivo |
|---|---|---|
| Framework | **Next.js 16** (React 19) | SSR para SEO dos clipes e perfis; ecossistema maduro |
| Estilo | **Tailwind 4** | Velocidade de iteração |
| Tempo real | **`ws`** (WebSocket nativo) | Chat, barulhômetro, estado do duelo. Socket.io descartado em D-14 |
| Vídeo | **SDK Web do Amazon IVS** | Publicação pelo navegador, sem download — decisão D-20 |

## Backend

| Item | Escolha | Motivo |
|---|---|---|
| Runtime | Node.js (TypeScript) | Mesma linguagem do frontend — crítico para dev solo |
| API | **Fastify** | Escolhido em D-14: cabe na cabeça inteiro |
| Tempo real | Servidor WebSocket dedicado | Isolar carga de chat da API |
| Fila | BullMQ sobre Redis | Matchmaking, renderização de clipes, moderação |
| Identidade | **Conta nativa (e-mail e senha) + OAuth com `arctic`** | A porta da frente é nossa; provedor é atalho — decisão D-19 |
| Senha | **`scrypt` do próprio Node** | Sal por senha e custo gravado no registro; sem dependência nativa |
| Sessão | **Token opaco em cookie httpOnly** | Revogável na hora; hash no banco — decisão D-16 |

**Por que TypeScript em tudo:** projeto solo não comporta troca de contexto entre linguagens. Tipos compartilhados entre cliente e servidor eliminam uma classe inteira de bugs.

## Dados

| Item | Uso |
|---|---|
| **PostgreSQL** (via **Prisma**) | Usuários, duelos, votos consolidados, ranking, financeiro. Schema em D-18 |
| **Redis** | Fila de matchmaking, contagem de votos em tempo real, barulhômetro, limitação de taxa, presença |
| **Object Storage (S3 ou equivalente)** | Gravações, clipes, assets |
| **CDN** | Vídeo e clipes |

## Infraestrutura

| Item | Escolha |
|---|---|
| Cliente web | **Vercel** |
| API e tempo real | **Fly.io**, região no Brasil — a Vercel não segura WebSocket |
| Banco | **Supabase** (São Paulo), só o Postgres |
| Vídeo | **Amazon IVS** (Real-Time + Low-Latency Streaming), região São Paulo |
| Observabilidade | Logs estruturados + monitoramento de erro desde o dia 1 |

Ver decisão D-17 para o porquê de cada uma e o que conferir antes de contratar.

**Regra para projeto solo:** preferir sempre serviço gerenciado a self-hosted, mesmo custando mais. Seu recurso escasso é tempo, não dinheiro de infraestrutura.

## IA

| Função | Abordagem |
|---|---|
| Moderação de chat | Camadas: lista de bloqueio → LLM barato com prompt em PT-BR → fila humana |
| Extração de sugestões do chat | Agregação de termos + LLM para consolidar |
| Estimativa de idade | Serviço especializado — **não** construir do zero |
| Curadoria de clipes | Detecção de pico no barulhômetro |

**Evitar:** Perspective API do Google — encerra em dezembro de 2026.
