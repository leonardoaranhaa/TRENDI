#!/usr/bin/env bash
#
# Stop — avisa quais arquivos do subconjunto do Projeto mudaram e precisam de
# re-upload. Não bloqueia nada: só mostra uma mensagem ao Leonardo.
#
# Fala uma vez por conjunto de mudanças: se a resposta seguinte terminar com o
# mesmo drift, fica quieto. Volta a falar quando o conjunto muda.

set -uo pipefail

RAIZ="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ENTRADA="$(cat)"

[ -x "$RAIZ/sync/projeto.sh" ] || exit 0

DRIFT="$(cd "$RAIZ" && ./sync/projeto.sh 2>/dev/null | awk '/^ +(MUDOU|NOVO|REMOVIDO) /{printf "%s ", $2}')"
[ -n "$DRIFT" ] || exit 0

SESSAO="$(printf '%s' "$ENTRADA" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([A-Za-z0-9_-]*\)".*/\1/p')"
SENTINELA="${TMPDIR:-/tmp}/trendi-sync-${SESSAO:-anon}"
if [ -f "$SENTINELA" ] && [ "$(cat "$SENTINELA")" = "$DRIFT" ]; then
  exit 0
fi
printf '%s' "$DRIFT" > "$SENTINELA" 2>/dev/null || true

# Os valores são caminhos do manifesto (ASCII, sem aspas), então dá para montar
# o JSON com printf sem escapar nada.
printf '{"systemMessage":"Projeto do Claude desatualizado — re-suba: %s(./sync/projeto.sh build monta o pacote; mark registra depois do upload)"}\n' "$DRIFT"
