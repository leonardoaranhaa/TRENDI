---
description: Executa uma tarefa do backlog pelo ID (ex. /tarefa C-01)
argument-hint: <ID da tarefa, ex. C-01>
---

Tarefa a executar: **$1**

Antes de escrever qualquer linha:

1. Localize `$1` em `03-execucao/backlog.md`. Se não existir, pare e diga isso.
2. Confira em `03-execucao/dependencias.md` se há bloqueio aberto sobre ela. **Se houver, pare** — o `CLAUDE.md` proíbe iniciar tarefa bloqueada. Diga qual é o bloqueio e o que destrava.
3. Se `05-prompts/prompts-por-fase.md` tiver um prompt para essa tarefa, siga-o.
4. Releia os princípios inegociáveis no `CLAUDE.md` e confira que a solução não fere nenhum. Dinheiro não decide duelo; barulhômetro não é placar; voto cruzado normalizado por proporção; sem download; latência simétrica.

Ao terminar, siga o encerramento de tarefa: `/fechar`.
