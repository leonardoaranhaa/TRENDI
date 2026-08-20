---
description: Rotina de encerramento de tarefa (backlog, ESTADO, decisões, sync)
---

Feche a tarefa que acabamos de trabalhar, na ordem do `CLAUDE.md`:

1. **Backlog** — marque a tarefa em `03-execucao/backlog.md` com o status certo (✅ concluída, 🟡 em andamento, 🔴 bloqueada). Se ela destravou outra, atualize `03-execucao/dependencias.md`.
2. **ESTADO.md** — atualize a data, a frente ativa, os bloqueios abertos, os próximos 3 passos, e acrescente uma linha no diário de sessões (mais recente no topo).
3. **Decisões** — se alguma decisão técnica relevante foi tomada, registre em `06-registro/decisoes.md` com data e motivo. Se a realidade contrariou uma expectativa, registre em `06-registro/aprendizados.md`.
4. **Sincronia** — rode `./sync/projeto.sh`. Se listar arquivos, monte o pacote com `./sync/projeto.sh build` e diga ao Leonardo, no fim da resposta, exatamente quais arquivos ele precisa re-subir no Projeto do Claude. Depois que ele confirmar o upload, rode `./sync/projeto.sh mark` e commite o `sync/projeto.lock`.

Não invente conclusão: se a tarefa não terminou, marque 🟡 e diga o que falta.
