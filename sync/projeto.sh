#!/usr/bin/env bash
#
# Sincroniza o subconjunto do cérebro que também vive no Projeto do Claude.
#
#   ./sync/projeto.sh            mostra o que está fora de sincronia
#   ./sync/projeto.sh check      igual ao acima, mas sai com código 1 se houver drift
#   ./sync/projeto.sh build      monta dist/projeto/ (e o .zip) pronto para upload
#   ./sync/projeto.sh mark       registra o estado atual como "já subido no Projeto"
#
# O repositório é a fonte da verdade. Este script existe só para você não
# esquecer de re-subir o que mudou.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$REPO_ROOT/sync/projeto.manifest"
LOCK="$REPO_ROOT/sync/projeto.lock"
OUT_DIR="$REPO_ROOT/dist/projeto"
OUT_ZIP="$REPO_ROOT/dist/trendi-projeto.zip"

die() { printf 'erro: %s\n' "$1" >&2; exit 1; }

hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | cut -d' ' -f1
  else
    die "preciso de sha256sum ou shasum no PATH"
  fi
}

# Lê o manifesto para o array PATHS, ignorando comentários e linhas vazias.
read_manifest() {
  [ -f "$MANIFEST" ] || die "manifesto não encontrado: $MANIFEST"
  PATHS=()
  local line
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%%#*}"
    line="$(printf '%s' "$line" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [ -n "$line" ] || continue
    [ -f "$REPO_ROOT/$line" ] || die "arquivo do manifesto não existe: $line"
    PATHS+=("$line")
  done < "$MANIFEST"
  [ "${#PATHS[@]}" -gt 0 ] || die "manifesto vazio"
}

# O Projeto do Claude tem lista de arquivos plana: dois basenames iguais
# viram ambiguidade na conversa. Falha cedo se acontecer.
assert_basenames_unicos() {
  local dup
  dup="$(printf '%s\n' "${PATHS[@]}" | xargs -n1 basename | sort | uniq -d)"
  [ -z "$dup" ] || die "basenames repetidos no manifesto (o Projeto é plano): $dup"
}

current_hashes() {
  local p
  for p in "${PATHS[@]}"; do
    printf '%s  %s\n' "$(hash_file "$REPO_ROOT/$p")" "$p"
  done | sort -k2
}

hash_de() { # hash_de <arquivo-de-hashes> <caminho>
  awk -v alvo="$2" '$2 == alvo { print $1 }' "$1"
}

cmd_status() { # cmd_status <estrito?>
  local estrito="$1" tmp drift=0 p atual antes
  tmp="$(mktemp)"; trap 'rm -f "$tmp"' RETURN
  current_hashes > "$tmp"

  if [ ! -f "$LOCK" ]; then
    echo "Nenhum upload registrado ainda (sync/projeto.lock não existe)."
    echo "Suba os ${#PATHS[@]} arquivos no Projeto e rode: ./sync/projeto.sh mark"
    [ "$estrito" = "1" ] && return 1
    return 0
  fi

  for p in "${PATHS[@]}"; do
    atual="$(hash_de "$tmp" "$p")"
    antes="$(hash_de "$LOCK" "$p")"
    if [ -z "$antes" ]; then
      echo "  NOVO       $p"
      drift=1
    elif [ "$atual" != "$antes" ]; then
      echo "  MUDOU      $p"
      drift=1
    fi
  done

  while read -r _ p; do
    printf '%s\n' "${PATHS[@]}" | grep -qxF "$p" || { echo "  REMOVIDO   $p"; drift=1; }
  done < "$LOCK"

  if [ "$drift" = "0" ]; then
    echo "Projeto em dia com o repo — nada para re-subir."
    return 0
  fi

  echo
  echo "Re-suba os arquivos acima no Projeto e rode: ./sync/projeto.sh mark"
  [ "$estrito" = "1" ] && return 1
  return 0
}

cmd_build() {
  rm -rf "$OUT_DIR"
  mkdir -p "$OUT_DIR"
  local p
  for p in "${PATHS[@]}"; do
    cp "$REPO_ROOT/$p" "$OUT_DIR/$(basename "$p")"
  done

  if command -v zip >/dev/null 2>&1; then
    rm -f "$OUT_ZIP"
    (cd "$OUT_DIR" && zip -q -r "$OUT_ZIP" .)
    echo "dist/projeto/ e dist/trendi-projeto.zip prontos (${#PATHS[@]} arquivos)."
  else
    echo "dist/projeto/ pronto (${#PATHS[@]} arquivos). Sem 'zip' no PATH — suba a pasta."
  fi
  echo "Depois de subir no Projeto, rode: ./sync/projeto.sh mark"
}

cmd_mark() {
  current_hashes > "$LOCK"
  echo "Registrado: ${#PATHS[@]} arquivos marcados como subidos no Projeto."
  echo "Commite sync/projeto.lock para o repo lembrar disso."
}

cmd_list() { printf '%s\n' "${PATHS[@]}"; }

read_manifest
assert_basenames_unicos

case "${1:-status}" in
  status) cmd_status 0 ;;
  check)  cmd_status 1 ;;
  build)  cmd_build ;;
  mark)   cmd_mark ;;
  list)   cmd_list ;;
  -h|--help|help)
    sed -n '3,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    ;;
  *) die "verbo desconhecido: $1 (use status, check, build, mark, list)" ;;
esac
