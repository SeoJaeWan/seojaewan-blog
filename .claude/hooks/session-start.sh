#!/usr/bin/env bash
# Claude Code 클라우드 세션 전용 SessionStart 훅.
# 로컬에서는 아무것도 하지 않는다. 실패해도 세션을 막지 않고 경고만 출력한다.
# 만든 것은 목록 파일에 기록하고, session-end.sh 가 그것만 지운다.
set -u

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
STATE_DIR="$HOME/.cache/seojaewan-blog"
LIST_FILE="$STATE_DIR/session-created.txt"
BACKUP_DIR="$STATE_DIR/backup"
FAILED=()

mkdir -p "$STATE_DIR" || { echo "[session-start] 경고: $STATE_DIR 를 만들지 못했다." >&2; exit 0; }

warn() { echo "[session-start] 경고: $*" >&2; FAILED+=("$*"); }
info() { echo "[session-start] $*"; }

# 목록 파일 형식: 종류<TAB>경로[<TAB>백업경로]
#   DIR     삭제할 디렉터리(STATE_DIR 아래만 삭제)
#   LINK    삭제할 심볼릭 링크
#   NEWFILE 원래 없던 파일(삭제)
#   RMDIR   비어 있으면 삭제할 디렉터리(우리가 만든 상위 디렉터리)
#   BACKUP  바꾼 파일(경로, 원본 백업 순서; 복원)
record() {
  local line
  line=$(printf '%s\t%s' "$1" "$2")
  if [ $# -ge 3 ]; then line=$(printf '%s\t%s' "$line" "$3"); fi
  grep -qxF -- "$line" "$LIST_FILE" 2>/dev/null || printf '%s\n' "$line" >> "$LIST_FILE"
}

# ---------- 1. Node ----------
setup_node() {
  local want major cur_major
  want=$(tr -d '[:space:]v' < "$ROOT/.nvmrc" 2>/dev/null)
  major=${want%%.*}
  [ -n "$major" ] || { warn ".nvmrc 에서 Node 메이저 버전을 읽지 못했다."; return 1; }
  cur_major=$(node -v 2>/dev/null | sed 's/^v//; s/\..*//')
  if [ "$cur_major" = "$major" ]; then
    info "Node $(node -v) 이미 사용 가능"
    return 0
  fi

  local arch
  case "$(uname -m)" in
    x86_64) arch=x64 ;;
    aarch64|arm64) arch=arm64 ;;
    *) warn "지원하지 않는 아키텍처: $(uname -m)"; return 1 ;;
  esac

  # 이미 받아 둔 Node(메이저가 같은 것)가 있으면 그것을 쓴다.
  local dir="" d
  for d in "$STATE_DIR"/node-v"$major".*-linux-"$arch"; do
    if [ -x "$d/bin/node" ]; then dir="$d"; fi
  done

  if [ -z "$dir" ]; then
    local base="https://nodejs.org/dist/latest-v$major.x" sums name ver expected tmp
    sums=$(curl -fsS --retry 3 "$base/SHASUMS256.txt") || { warn "Node SHASUMS256.txt 를 받지 못했다."; return 1; }
    name=$(printf '%s\n' "$sums" | awk -v a="linux-$arch.tar.xz" '$2 ~ a"$" {print $2}' | head -1)
    expected=$(printf '%s\n' "$sums" | awk -v n="$name" '$2 == n {print $1}')
    [ -n "$name" ] && [ -n "$expected" ] || { warn "SHASUMS256.txt 에서 $arch tarball 항목을 찾지 못했다."; return 1; }
    ver=${name%-linux-*.tar.xz}   # node-v24.x.y
    dir="$STATE_DIR/$ver-linux-$arch"
    tmp=$(mktemp -d "$STATE_DIR/node-dl.XXXXXX") || { warn "임시 디렉터리를 만들지 못했다."; return 1; }
    info "$name 내려받는 중"
    if ! curl -fsS --retry 3 -o "$tmp/$name" "$base/$name"; then
      rm -rf "$tmp"; warn "$name 를 받지 못했다."; return 1
    fi
    if [ "$(sha256sum "$tmp/$name" | awk '{print $1}')" != "$expected" ]; then
      rm -rf "$tmp"; warn "$name sha256 이 SHASUMS256.txt 와 다르다. 설치하지 않는다."; return 1
    fi
    if ! tar -xJf "$tmp/$name" -C "$tmp"; then
      rm -rf "$tmp"; warn "$name 압축 해제 실패."; return 1
    fi
    rm -rf "$dir"
    mv "$tmp/${name%.tar.xz}" "$dir" || { rm -rf "$tmp"; warn "Node 를 $dir 로 옮기지 못했다."; return 1; }
    rm -rf "$tmp"
    record DIR "$dir"
    info "Node 설치: $dir"
  fi

  export PATH="$dir/bin:$PATH"

  # 세션 셸이 같은 Node 를 쓰도록 PATH 에 앞세운다.
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    local line="export PATH=\"$dir/bin:\$PATH\""
    grep -qxF -- "$line" "$CLAUDE_ENV_FILE" 2>/dev/null || echo "$line" >> "$CLAUDE_ENV_FILE" \
      || warn "CLAUDE_ENV_FILE 에 PATH 를 기록하지 못했다."
  fi

  # 커밋 훅(husky)도 같은 Node 를 쓰게 한다. husky 는 ~/.config/husky/init.sh 를 먼저 읽는다.
  local cfg="${XDG_CONFIG_HOME:-$HOME/.config}/husky" init marker
  init="$cfg/init.sh"
  marker="# seojaewan-blog session-start: node"
  if ! grep -qF -- "$marker" "$init" 2>/dev/null; then
    if [ ! -d "$cfg" ]; then
      if mkdir -p "$cfg"; then record RMDIR "$cfg"; else warn "$cfg 를 만들지 못했다."; return 0; fi
    fi
    if [ -e "$init" ]; then
      if mkdir -p "$BACKUP_DIR" && cp -p "$init" "$BACKUP_DIR/husky-init.sh"; then
        record BACKUP "$init" "$BACKUP_DIR/husky-init.sh"
      else
        warn "$init 원본을 백업하지 못했다."; return 0
      fi
    else
      record NEWFILE "$init"
    fi
    printf '\n%s\nexport PATH="%s:$PATH"\n' "$marker" "$dir/bin" >> "$init" || warn "$init 에 기록하지 못했다."
    info "husky init.sh 에 Node PATH 추가"
  fi
  return 0
}

# ---------- 2. pnpm install ----------
setup_deps() {
  local want_pm
  want_pm=$(node -p "require('$ROOT/package.json').packageManager" 2>/dev/null)
  if [ "$(pnpm -v 2>/dev/null)" != "${want_pm#pnpm@}" ]; then
    corepack enable || { warn "corepack enable 실패."; return 1; }
  fi
  info "pnpm $(pnpm -v 2>&1) / pnpm install --frozen-lockfile"
  (cd "$ROOT" && CI=true pnpm install --frozen-lockfile) || { warn "pnpm install --frozen-lockfile 실패."; return 1; }
}

# ---------- 3. Playwright 브라우저 리비전 맞추기 ----------
setup_playwright() {
  local pw_dir="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}" json
  if [ ! -d "$pw_dir" ]; then
    info "Playwright 브라우저 경로($pw_dir)가 없어 건너뜀"
    return 0
  fi
  json=$(ls -d "$ROOT"/node_modules/.pnpm/playwright-core@*/node_modules/playwright-core/browsers.json 2>/dev/null | tail -1)
  [ -n "$json" ] || { warn "playwright-core 의 browsers.json 을 찾지 못했다."; return 1; }

  # 디렉터리 접두사는 browsers.json 이름의 '-' 를 '_' 로 바꾼 것.
  local name rev prefix want have cand
  while read -r name rev; do
    [ -n "$name" ] || continue
    prefix=${name//-/_}
    want="$pw_dir/$prefix-$rev"
    [ -e "$want" ] && continue
    have=""
    for cand in "$pw_dir/$prefix"-[0-9]*; do
      if [ -d "$cand" ] && [ ! -L "$cand" ]; then have="$cand"; fi
    done
    if [ -z "$have" ]; then
      warn "Playwright $name 리비전 $rev 도 대체할 설치본도 $pw_dir 에 없다."
      continue
    fi
    if ln -s "$have" "$want"; then
      record LINK "$want"
      info "링크: $want -> $have"
    else
      warn "$want 링크를 만들지 못했다."
    fi
  done < <(node -e '
    const b = require(process.argv[1]).browsers;
    for (const x of b) if (["chromium","chromium-headless-shell","ffmpeg"].includes(x.name) && x.revision) console.log(x.name, x.revision);
  ' "$json")
}

setup_node || true
if command -v node >/dev/null 2>&1; then
  setup_deps || true
  setup_playwright || true
else
  warn "node 를 사용할 수 없어 설치와 Playwright 설정을 건너뛴다."
fi

if [ ${#FAILED[@]} -gt 0 ]; then
  echo "[session-start] 실패한 단계 ${#FAILED[@]}건 (세션은 계속된다):" >&2
  printf '  - %s\n' "${FAILED[@]}" >&2
fi
exit 0
