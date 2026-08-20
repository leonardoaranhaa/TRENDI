# PROMPTS PARA O CLAUDE CODE

Comandos prontos, na ordem certa. Cada um assume que o repositório contém este cérebro e que o `CLAUDE.md` está na raiz.

**Antes de qualquer prompt:** confira em `03-execucao/dependencias.md` se a tarefa está desbloqueada.

---

## ABERTURA DE SESSÃO

Use este no início de toda sessão nova:

```
Leia ESTADO.md, CLAUDE.md e 03-execucao/backlog.md.
Me diga em que ponto o projeto está, quais tarefas [C] estão
desbloqueadas agora, e qual você recomenda fazer primeiro e por quê.
Não escreva código ainda.
```

---

## FASE 1

### C-01 — Repositório e stack base
```
Tarefa C-01 do backlog.
Leia 02-arquitetura/stack.md e 02-arquitetura/convencoes.md.
Monte a estrutura do monorepo conforme as convenções: apps/web,
apps/api, apps/realtime, packages/shared, packages/db.
Configure TypeScript, lint e formatação. Nada de lógica de negócio ainda.
Ao terminar, atualize o backlog e o ESTADO.
```

### C-08 — Máquina de estados do duelo
```
Tarefa C-08.
Leia 01-conceito/regras-do-duelo.md, seção 1.
Implemente a máquina de estados do duelo em packages/shared.
Requisitos: transições unidirecionais, timeout em todo estado com
transição automática, registro de toda transição para auditoria,
e o estado ACEITE como ponto de não retorno.
Escreva testes cobrindo cada transição válida e cada tentativa inválida.
```

### C-14 — Fórmula do voto cruzado
```
Tarefa C-14.
Leia 01-conceito/regras-do-duelo.md, seção 4.
Implemente a fórmula do voto cruzado em packages/shared, num único
lugar, como função pura.
Cubra TODOS os casos-limite da tabela: arquibancada com menos de 10
votantes, geral vazia, empate, voto cruzado de torcedor, quórum de 30.
Escreva teste para cada linha daquela tabela.
Esta função é o coração do produto — trate com o rigor correspondente.
```

### C-07 — Chat por WebSocket
```
Tarefa C-07.
Implemente o servidor WebSocket em apps/realtime com um chat único
por duelo. Ainda não os três chats.
Requisitos: entrada por duelo, limitação de taxa por usuário,
histórico curto ao entrar, e estrutura preparada para receber
múltiplas salas depois (C-11).
```

### C-03 a C-06 — Camada de vídeo
```
⚠️ BLOQUEADO por L-03. Não iniciar antes de o fornecedor estar escolhido
e registrado em 06-registro/decisoes.md.
```

---

## FASE 2

### C-11 — Três chats com escrita restrita
```
Tarefa C-11.
Leia 01-conceito/regras-do-duelo.md, seção 7.
Expanda o chat para três salas por duelo: torcida_a, torcida_b, geral.
Regra central: o usuário LÊ as três salas, mas só ESCREVE na sua.
A validação de escrita é no servidor, nunca só no cliente.
```

### C-13 — Barulhômetro
```
Tarefa C-13.
Leia 01-conceito/regras-do-duelo.md, seção 6.
Implemente a coleta e agregação de sinais de interação por arquibancada.
CRÍTICO: a intensidade é normalizada pelo tamanho da própria torcida,
nunca em valores absolutos.
Publique via WebSocket em janelas curtas.
Na interface, o barulhômetro precisa ser visualmente inconfundível com
o placar — cor, posição e linguagem distintas.
```

### C-17 — Penalidade progressiva
```
Tarefa C-17.
Leia 01-conceito/regras-do-duelo.md, seção 5.
Implemente o escalonamento por reincidência em janela de 30 dias,
com as duas dimensões: espera adicional e faixa de pareamento reduzida.
Implemente também a reabilitação: cada duelo concluído reduz o nível.
Os parâmetros numéricos vêm de L-09 — se ainda não definidos, deixe
configuráveis e sinalize.
```

### C-22 — Moderação em camadas
```
Tarefa C-22.
Leia 02-arquitetura/servicos.md, seção de moderação.
Implemente o pipeline de três camadas.
Para a camada 2, escreva o prompt do LLM em português brasileiro,
calibrado para entender gíria e ironia, e — importante — para tratar
provocação esportiva entre torcidas como comportamento aceitável.
O alvo é assédio, ódio e ataque pessoal, não zoeira.
```

---

## PROMPTS DE MANUTENÇÃO

### Revisão de coerência
```
Compare o código atual com 01-conceito/regras-do-duelo.md.
Aponte qualquer divergência entre a especificação e a implementação.
Não corrija ainda — só liste.
```

### Verificação dos princípios inegociáveis
```
Leia os cinco princípios inegociáveis em CLAUDE.md.
Audite o código atual e aponte qualquer violação, especialmente:
valor monetário influenciando voto_resultado, barulhômetro
confundível com placar, e voto por volume absoluto em vez de proporção.
```

### Fechamento de sessão
```
Atualize ESTADO.md com o que foi feito nesta sessão, o que ficou
pendente e qual o próximo passo recomendado.
Marque no backlog as tarefas concluídas.
Se alguma decisão técnica relevante foi tomada, registre em
06-registro/decisoes.md.
```

---

## COMO ESCREVER UM PROMPT NOVO

Estrutura que funciona:

```
Tarefa [ID] do backlog.
Leia [arquivo específico do cérebro, com seção].
[O que construir, em uma frase].
Requisitos: [lista curta e verificável].
[Restrição crítica, se houver].
Ao terminar, atualize backlog e ESTADO.
```

Sempre apontar para o arquivo do cérebro em vez de repetir a regra no prompt. Assim a fonte da verdade continua sendo um lugar só.
