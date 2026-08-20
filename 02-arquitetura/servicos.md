# SERVIÇOS DO BACKEND

| Serviço | Função | Fase |
|---|---|---|
| **Identidade** | Cadastro, login, verificação de idade, perfis | 1 |
| **Duelo** | Máquina de estados: fila → aceite → escolha → execução → votação → resultado | 1 |
| **Mídia** | Integração com fornecedor: criar sala, ingestão, composição, gravação | 1 |
| **Chat** | WebSocket, três salas por duelo, regra de leitura total e escrita restrita | 1 |
| **Votação** | Recebe votos, aplica pesos cruzados, normaliza, antifraude | 1 |
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
