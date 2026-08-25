# SERVIÇOS DO BACKEND

| Serviço | Função | Fase |
|---|---|---|
| **Identidade** | Cadastro, login, verificação de idade, perfis | 1 |
| **Duelo** | Máquina de estados: fila → aceite → escolha → execução → votação → resultado | 1 · *entregue em C-08 e C-09; timeout automático espera o agendador de C-16* |
| **Mídia** | Integração com fornecedor: criar sala, ingestão, composição, gravação | 1 · *palco, credencial e ciclo da composição entregues em C-03; o quadro em C-05* |
| **Chat** | WebSocket, três salas por duelo, regra de leitura total e escrita restrita | 1 · *sala única entregue em C-07; as três chegam em C-11* |
| **Votação** | Recebe votos, aplica pesos cruzados, normaliza, antifraude | 1 · *contagem simples entregue em C-09; peso cruzado em C-14* |
| **Matchmaking** | Fila, pareamento por faixa, prioridade e penalidade | 2 |
| **Barulhômetro** | Agrega sinais por lado, normaliza por tamanho de torcida, publica em tempo real | 2 |
| **Moderação** | Pipeline em camadas, fila humana, ações | 2 |
| **Penalidade** | Registro de desistência, escalonamento, reabilitação, contestação | 2 |
| **Clipes** | Recorte, renderização, versões por rede, legendagem | 2 |
| **Ranking** | Pontuação, histórico, temporadas | 3 |
| **Tendências** | Coleta externa + extração do chat | 3 |
| **Pagamentos** | Carteira, assinaturas, repasses, antifraude financeiro | 3 |
| **Notificações** | Push e e-mail | 3 |

---

## Máquina de estados do duelo

O serviço de Duelo é o coração do sistema. Regras:

- Transições são **unidirecionais** — não se volta de VOTAÇÃO para EXECUÇÃO
- Todo estado tem timeout com transição automática
- Saída depois de ACEITE registra desistência, sempre
- Estado é a fonte da verdade para o que o cliente pode fazer: quem está em VOTAÇÃO não pode mais migrar de arquibancada

## Serviço de Mídia — como o quadro é montado

O split-screen é composto **no servidor**, uma vez só, e é o mesmo quadro para todo mundo — é isso que sustenta a latência simétrica (princípio 5, decisão D-01).

Como o quadro fica montado é regra de produto, não parâmetro de fornecedor. Mora em `COMPOSITION_LAYOUT`, no contrato de `@trendi/video`, e o adaptador do IVS só traduz:

| Regra | O que garante |
|---|---|
| **Lado A à esquerda, B à direita, sempre** | Sem isso a ordem é a de chegada ao palco, e o lado troca entre um duelo e outro. Placar e barulhômetro ficam em DOM sobre o vídeo (D-20), fixos por lado — se o vídeo troca, o overlay aponta para o competidor errado. No IVS isso é `participantOrderAttribute`, lendo o `side` que a credencial de publicação já grava. |
| **Câmera cortada continua ocupando o lado dela** | Sumir com metade da tela no meio do duelo confunde mais do que a câmera parada. |
| **Sem faixa entre os dois, cortando para preencher** | Split-screen colado, sem tarja preta: é a imagem do produto. |
| **720p** | A entrega é 97% da conta (D-20). A resolução mora na *encoder configuration* do IVS, criada uma vez — item de `L-19`. |

**Composição que não subiu tem segunda chance.** Quando a mídia falha na transição para EXECUÇÃO, a transição acontece assim mesmo — auditoria vale mais que palco —, e o duelo fica no ar sem ninguém podendo assistir. Sem agendador nesta fase (é a `C-16`), a segunda tentativa acontece quando um competidor pede credencial. Quem perde a corrida desliga a composição que acabou de subir: duas no ar custam dobrado e entregam dois quadros diferentes para a mesma plateia.

## O aviso de estado, que ainda não existe

O servidor de tempo real sabe avisar a sala que o duelo mudou de estado — `publishState`, escrito na `C-07`. **Ninguém chama.** A API é outro processo, e não alcança aquela função em memória.

Enquanto nada escutava, isso era invisível. Com o estádio aberto (`C-06`) passa a não ser: a votação abriria em momentos diferentes para cada pessoa, e a janela é de 30 a 45 segundos.

O estádio já escuta as duas fontes — a mensagem `state` do WebSocket e uma releitura periódica do duelo, que é o piso. Ligar a API ao tempo real é a **`C-38`**, e quando chegar o cliente não muda uma linha.

## Serviço de Votação — ordem de operações

```
1. Validar: conta verificada? tempo mínimo assistido? já votou?
2. Registrar voto com arquibancada de origem
3. Ao fechar a janela:
   a. Descartar arquibancadas com < 10 votantes, redistribuir pesos
   b. Calcular proporção por arquibancada
   c. Aplicar pesos (0,50 rival / 0,35 geral / 0,15 própria)
   d. Rodar antifraude; anular votos suspeitos e recalcular
   e. Verificar quórum de 30 votantes para valer no ranking
   f. Publicar resultado
```

## Serviço de Moderação — camadas

```
Mensagem → [1] lista de bloqueio + regex   → bloqueio imediato
         → [2] LLM com prompt PT-BR        → aprovada | retida
         → [3] fila humana (se retida)     → decisão final
```

O prompt da camada 2 precisa entender que **provocação esportiva entre torcidas é parte do jogo** — o alvo é assédio, ódio e ataque pessoal, não zoeira.
