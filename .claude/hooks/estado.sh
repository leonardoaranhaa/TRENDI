#!/usr/bin/env bash
#
# SessionStart — injeta o estado do projeto no contexto da sessão.
#
# O README manda: "toda sessão começa lendo ESTADO.md". Este hook garante que
# isso aconteça mesmo que ninguém peça. Stdout de um hook SessionStart vira
# contexto que o Claude lê.

set -uo pipefail

RAIZ="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ESTADO="$RAIZ/ESTADO.md"

secao() { # secao <titulo-sem-##>
  awk -v alvo="## $1" '
    $0 == alvo { dentro = 1; next }
    dentro && /^## / { exit }
    dentro && /^---$/ { next }
    dentro { print }
  ' "$ESTADO" | sed -e '/^$/{N;/^\n$/D}'
}

echo "=== TRENDI — estado no início da sessão (gerado por .claude/hooks/estado.sh) ==="
echo

if [ -f "$ESTADO" ]; then
  grep -m1 '^\*\*Fase atual:' "$ESTADO" || true
  grep -m1 '^\*\*Última atualização:' "$ESTADO" || true
  echo
  echo "## FRENTE ATIVA"
  secao "FRENTE ATIVA"
  echo "## BLOQUEIOS ABERTOS"
  secao "BLOQUEIOS ABERTOS"
  echo "## PRÓXIMOS 3 PASSOS"
  secao "PRÓXIMOS 3 PASSOS"
else
  echo "ESTADO.md não encontrado na raiz do repo — algo está errado com o cérebro."
fi

echo "## SINCRONIA COM O PROJETO DO CLAUDE"
if [ -x "$RAIZ/sync/projeto.sh" ]; then
  ( cd "$RAIZ" && ./sync/projeto.sh 2>&1 )
else
  echo "sync/projeto.sh ausente ou sem permissão de execução."
fi

echo
echo "Lembretes: o repo vence o Projeto do Claude. Não iniciar tarefa com bloqueio"
echo "aberto em 03-execucao/dependencias.md. Ao fechar tarefa, rodar ./sync/projeto.sh."
