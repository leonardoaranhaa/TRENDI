# CONVENÇÕES DE CÓDIGO

## Idioma

- **Código, nomes de variáveis, funções e tabelas:** inglês
- **Documentação, comentários e mensagens de commit:** português
- **Textos de interface:** português brasileiro, tom Gen Z, sem formalidade

Motivo: código em inglês por convenção universal e compatibilidade com bibliotecas; documentação em português porque o cérebro do projeto é lido por você.

## Estrutura de pastas do repositório

```
/apps
  /web          ← Next.js
  /api          ← backend HTTP
  /realtime     ← servidor WebSocket
/packages
  /shared       ← tipos, constantes, fórmulas compartilhadas
  /db           ← schema e migrations
/docs           ← este cérebro
```

## Regras não negociáveis

1. **A fórmula do voto cruzado vive em `/packages/shared`**, em um único lugar, com testes. Nunca duplicada.
2. **Nenhum valor monetário influencia `voto_resultado`.** Se um PR tocar nisso, está errado.
3. **Toda transição de estado do duelo é registrada.** Auditoria é requisito, não luxo.
4. **Timeout em tudo que é tempo real.** Estado travado sem timeout = duelo fantasma.
5. **Sem segredo em código.** Variáveis de ambiente sempre.

## Commits

```
tipo(escopo): descrição em português

feat(duelo): adiciona máquina de estados
fix(voto): corrige normalização quando geral está vazia
docs(cerebro): atualiza ESTADO
```

## Testes

Prioridade para projeto solo — testar só o que quebra silenciosamente e custa caro:

1. Fórmula do voto cruzado e todos os casos-limite
2. Máquina de estados do duelo
3. Cálculo de penalidade e reabilitação
4. Normalização do barulhômetro

Interface e fluxo visual: teste manual é suficiente na fase inicial.

## Ao concluir tarefa

1. Marcar em `03-execucao/backlog.md`
2. Atualizar `ESTADO.md`
3. Decisão técnica relevante → `06-registro/decisoes.md`
