#!/usr/bin/env bash
# Claude Code 클라우드 세션 전용 SessionEnd 훅.
# session-start.sh 가 목록 파일에 기록한 것만 되돌린다. 목록 밖은 건드리지 않는다.
set -u

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

STATE_DIR="$HOME/.cache/seojaewan-blog"
LIST_FILE="$STATE_DIR/session-created.txt"

[ -f "$LIST_FILE" ] || exit 0

warn() { echo "[session-end] 경고: $*" >&2; }

# 나중에 만든 것부터 되돌리도록 역순으로 처리한다.
mapfile -t LINES < <(tac "$LIST_FILE")
for line in "${LINES[@]}"; do
  [ -n "$line" ] || continue
  IFS=$'\t' read -r kind path extra <<< "$line"
  case "$kind" in
    DIR)
      case "$path" in
        "$STATE_DIR"/?*) if rm -rf -- "$path"; then echo "[session-end] 삭제: $path"; else warn "$path 삭제 실패"; fi ;;
        *) warn "$path 는 $STATE_DIR 밖이라 지우지 않는다." ;;
      esac ;;
    LINK)
      if [ -L "$path" ]; then
        if rm -f -- "$path"; then echo "[session-end] 링크 삭제: $path"; else warn "$path 삭제 실패"; fi
      fi ;;
    NEWFILE)
      if rm -f -- "$path"; then echo "[session-end] 삭제: $path"; else warn "$path 삭제 실패"; fi ;;
    BACKUP)
      if [ -f "$extra" ]; then
        if cp -p -- "$extra" "$path"; then echo "[session-end] 복원: $path"; else warn "$path 복원 실패"; fi
      fi ;;
    RMDIR)
      if rmdir -- "$path" 2>/dev/null; then echo "[session-end] 삭제: $path"; fi ;;
    *) warn "알 수 없는 항목: $line" ;;
  esac
done

rm -f -- "$LIST_FILE"
rm -rf -- "$STATE_DIR/backup"
rmdir -- "$STATE_DIR" 2>/dev/null
exit 0
