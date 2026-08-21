# CATÁLOGO DE DESAFIOS

10 categorias de lançamento. Cada desafio precisa de: nome, regra em uma frase, faixa de tempo, critério visível de julgamento e nível de idade.

> **O que a plataforma faz cumprir são as três regras de conduta** —
> `regras-da-plataforma.md`, decisão D-21. O "critério visível de julgamento"
> abaixo não é regra: é a frase que diz à plateia o que ela está julgando.
> Quem decide se foi bem executado é a arquibancada.

---

## CATEGORIAS

| # | Categoria | Exemplos | Faixa de tempo | Idade |
|---|---|---|---|---|
| 1 | Desenho | Personagem em tempo limitado; desenho às cegas | 30–120s | Livre |
| 2 | Aura / Presença | Aura battle; melhor entrada; encarada | 30–90s | Livre |
| 3 | Agilidade | Digitação; reflexo; empilhar objetos | 20–60s | Livre |
| 4 | Voz | Imitação; beatbox; cantar sem errar a letra | 30–90s | Livre |
| 5 | Memória | Sequência; decorar lista | 30–90s | Livre |
| 6 | Criatividade | Melhor desculpa; história com 3 palavras do chat | 45–120s | Livre |
| 7 | Corpo | Equilíbrio; caretas; dança | 30–90s | A definir |
| 8 | Conhecimento | Quiz relâmpago com perguntas do chat | 60–120s | Livre |
| 9 | Improviso | Vender objeto inútil; convencer a torcida rival | 45–120s | A definir |
| 10 | Caos | Desafios híbridos e absurdos da comunidade | variável | A definir |

---

## MODELO PARA CADA DESAFIO

```
### [Nome do desafio]
**Categoria:**
**Regra:** [uma frase que qualquer pessoa entende em 5 segundos]
**Tempos:** [opções que o público escolhe]
**O que o público julga:** [critério explícito]
**Idade mínima:**
**Precisa de material:** [ex: papel e caneta]
**Precisa de música:** [se sim, depende de licença — ver 04-leonardo/juridico.md]
```

---

## CRESCIMENTO DO CATÁLOGO

1. **Sinal interno** — a IA identifica termos que mais se repetem nos chats e converte em propostas. Fonte mais confiável e mais barata, sem depender de API de ninguém.
2. **Tendências externas** — YouTube Data API e Twitch Helix (gratuitas). TikTok está efetivamente fechado para uso comercial; só via agregador pago, e só depois que o recurso provar valor.

---

## PRIORIDADE DE IMPLEMENTAÇÃO

- **Fase 1:** 1 categoria — Aura / Presença. É o público-alvo do lançamento e a mais simples tecnicamente: não exige material nem ferramenta na tela.

### O desafio da Fase 1

```
### Aura
**Categoria:** Aura / Presença
**Regra:** imponha mais presença que o outro, no tempo que a plateia escolher.
**Tempos:** 30s · 60s · 90s
**O que o público julga:** quem dominou a tela. Sem critério além disso — é
  subjetivo de propósito, e é a arquibancada que resolve.
**Idade mínima:** livre
**Precisa de material:** não
**Precisa de música:** não
```

Sem material e sem música, este desafio não esbarra em licença (`04-leonardo/juridico.md`) nem em nada travado. As regras de conduta valem, como em qualquer duelo.
- **Fase 2:** 3 a 5 categorias
- **Fase 3:** as 10
