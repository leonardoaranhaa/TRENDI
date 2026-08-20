# REGRAS DO DUELO — Especificação Funcional

Fonte da verdade para a mecânica. Divergência entre código e este arquivo é bug.

---

## 1. CICLO DE VIDA DO DUELO

```
FILA → PAREADO → ACEITE → ESCOLHA → PREPARO → EXECUÇÃO → VOTAÇÃO → RESULTADO
```

| Estado | O que acontece | Duração |
|---|---|---|
| FILA | Criador aguardando pareamento | variável |
| PAREADO | Sistema propôs adversário | 60s para aceitar |
| ACEITE | Ambos confirmaram — **compromisso travado** | instantâneo |
| ESCOLHA | Público vota em desafio + tempo | 30s |
| PREPARO | Contagem regressiva, regras na tela | 15s |
| EXECUÇÃO | Duelo acontecendo | definido pelo público |
| VOTAÇÃO | Janela fechada de voto | 30–45s |
| RESULTADO | Placar revelado, ranking atualizado | — |

**Ponto de não retorno:** o estado ACEITE. Sair depois disso é desistência e aciona penalidade.

---

## 2. PAREAMENTO

- Por faixa de audiência média (não parear 50 espectadores contra 5.000)
- Considerar histórico: evitar repetir o mesmo adversário em sequência curta
- Criadores com penalidade ativa entram em faixa reduzida (ver seção 5)

---

## 3. ESCOLHA DE DESAFIO E TEMPO

O sistema sugere de 3 a 5 desafios. Cada um vem com opções de duração — dificuldade inversamente proporcional ao tempo.

```
Desenhar o Pikachu
  • 90s — tranquilo
  • 60s — apertado
  • 30s — no desespero
```

Votam as três arquibancadas. Maioria simples decide o pacote *desafio + tempo*.

**Limites de segurança:** o catálogo define piso e teto por categoria. O público escolhe dentro da faixa, nunca fora — evita a torcida rival votar em tempo impossível para sabotar.

---

## 4. JULGAMENTO — VOTO CRUZADO

### Fórmula

```
Pontuação(A) =
    0,50 × (votos em A dentro da Torcida B ÷ votantes da Torcida B)
  + 0,35 × (votos em A dentro da Geral    ÷ votantes da Geral)
  + 0,15 × (votos em A dentro da Torcida A ÷ votantes da Torcida A)
```

Mesmo cálculo para B. Maior pontuação vence. Resultado sempre entre 0 e 1.

### Por que esses pesos

- **50% torcida rival** — converter quem torce contra é o sinal mais honesto. Induz o comportamento certo: para vencer, impressione quem não gosta de você.
- **35% Geral** — sem viés, mas menor engajamento.
- **15% própria torcida** — não zerar mantém a torcida votando, mas ela nunca decide sozinha.

### Casos-limite

| Situação | Tratamento |
|---|---|
| Arquibancada com menos de 10 votantes | Descartada; peso redistribuído proporcionalmente |
| Geral vazia | Rival passa a 0,77; própria torcida a 0,23 |
| Empate | Desempate pela proporção da torcida rival isolada. Persistindo, empate registrado |
| Torcedor de A vota em B | Permitido e valorizado — entra no balde rival de B, peso 0,50 |
| Menos de 30 votantes totais | Vale para diversão e clipe, mas não pontua no ranking |

### Antifraude

- Voto só com conta verificada
- Tempo mínimo assistindo antes de poder votar
- 1 conta = 1 voto, com limitação de taxa
- Detecção de padrões coordenados (picos anômalos, contas em lote, mesma rede)
- Votos anulados são registrados e o ranking recalculado

O voto cruzado já é defesa estrutural: manipular a própria torcida rende no máximo 15%.

---

## 5. PENALIDADE PROGRESSIVA

Janela de contagem: 30 dias.

| Reincidência | Espera adicional | Pareamento |
|---|---|---|
| 1ª | Leve | Normal |
| 2ª | Moderada | Faixa de audiência reduzida |
| 3ª | Alta | Faixa bem reduzida, horários de baixo movimento |
| 4ª+ | Severa | Baixa prioridade até reabilitação |

Somado a: perda da receita do duelo e do bônus de participação.

**Reabilitação (obrigatório).** Cada duelo concluído reduz o nível. Contagem zera após período limpo. Punição sem saída expulsa criador da plataforma.

**Transparência.** Perfil exibe taxa de conclusão — informação de reputação, sem rótulo humilhante.

**Exceções.** Queda de conexão, falha técnica verificável, emergência declarada. Precisa de fluxo de contestação com resposta rápida.

> ⚠️ Parâmetros numéricos exatos (horas por nível) ainda não definidos — tarefa L-09.

---

## 6. BARULHÔMETRO

**Entradas:** velocidade de mensagens por lado, rajadas de emotes e cânticos, reações rápidas, presentes enviados.

**Normalização obrigatória:** intensidade medida em relação ao tamanho da própria torcida, não em absoluto. Sem isso a torcida maior domina sempre e o recurso perde a graça.

**Separação do placar — inegociável.** Cor, posição e linguagem distintas do resultado. Três motivos:
1. Competitivo: se barulho decide, ganha a torcida maior e viramos o TikTok
2. Jurídico: presente pago movendo algo que parece placar aproxima o produto de concurso pago
3. Credibilidade: o ranking só vale se as pessoas acreditarem que mede habilidade

---

## 7. ARQUIBANCADAS

- Ao entrar, o espectador escolhe um lado ou fica na Geral
- Pode migrar até a janela de votação abrir — aí trava
- **Lê os três chats, escreve só no seu**
- Geral é o eleitorado sem viés e tem peso alto no julgamento
