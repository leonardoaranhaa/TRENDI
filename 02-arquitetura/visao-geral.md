# ARQUITETURA — Visão Geral

## A decisão que define tudo

Ambiente próprio: os dois vídeos passam pela infraestrutura da TRENDI e são **compostos em um único stream no servidor**.

Consequência crítica: **os dois lados assistem exatamente ao mesmo quadro no mesmo instante.** Nenhum competidor e nenhuma torcida tem vantagem de latência. É isso que legitima o julgamento por voto — e é impossível de garantir com players embutidos de terceiros.

## Pipeline de vídeo

```
Competidor A (navegador, WebRTC/WHIP) ─┐
                                        ├─→ SFU → Composição → ┬→ WebRTC (baixa latência)
Competidor B (navegador, WebRTC/WHIP) ─┘      (canvas único)   └→ LL-HLS (escala/CDN)
                                                    │
                                                    └→ Gravação → Clipes
```

| Etapa | Decisão |
|---|---|
| **Captação** | WebRTC direto do navegador via `getUserMedia` + WHIP. Zero download. |
| **Servidor de mídia** | SFU **gerenciado**. Operar SFU próprio exige um time inteiro de infraestrutura. |
| **Composição** | Servidor monta split-screen com placar, barulhômetro e overlays num canvas único. |
| **Distribuição** | WebRTC para competidores e primeira fila; LL-HLS via CDN para o grosso da audiência (latência 2–5s, custo muito menor). |
| **Gravação** | Tudo gravado — viabiliza os clipes, que são produto premium. |

> ⚠️ **Fornecedor ainda não escolhido.** Bloqueio L-03. Não escrever código de vídeo antes disso.

## Realidade de custo

O custo dominante é **banda de saída**, que cresce com *espectadores × minutos × qualidade* — não com número de duelos. A monetização precisa escalar junto com a audiência, senão sucesso vira prejuízo.

Mitigações iniciais: 720p, LL-HLS para a maioria, teto de espectadores simultâneos por duelo.

## Camadas do sistema

```
┌─────────────────────────────────────────────────┐
│  CLIENTE WEB (navegador)                         │
│  Estádio, chats, votação, captação WebRTC        │
├─────────────────────────────────────────────────┤
│  TEMPO REAL (WebSocket)                          │
│  Chat, barulhômetro, estado do duelo, votos      │
├─────────────────────────────────────────────────┤
│  API (HTTP)                                      │
│  Identidade, fila, catálogo, ranking, pagamentos │
├─────────────────────────────────────────────────┤
│  MÍDIA (fornecedor gerenciado)                   │
│  Ingestão, composição, distribuição, gravação    │
├─────────────────────────────────────────────────┤
│  DADOS                                           │
│  PostgreSQL · Redis · Object Storage · CDN       │
└─────────────────────────────────────────────────┘
```
