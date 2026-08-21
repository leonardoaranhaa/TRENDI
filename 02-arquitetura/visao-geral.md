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
| **Servidor de mídia** | **Amazon IVS Real-Time** (stage). SFU gerenciado — operar SFU próprio exige um time inteiro de infraestrutura. |
| **Composição** | IVS compõe o split-screen no servidor. Placar e barulhômetro ficam em DOM sobre o vídeo, não queimados no quadro — ver D-20. |
| **Distribuição** | WebRTC no stage para os competidores; channel LL-HLS para o grosso da audiência (latência 2–5s, custo muito menor). |
| **Gravação** | Tudo gravado — viabiliza os clipes, que são produto premium. |

> ✅ **Fornecedor escolhido: Amazon IVS** (decisão D-20, 2026-08-20). Falta criar a conta — `L-19`. Até lá, o código roda contra um fornecedor falso.

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
