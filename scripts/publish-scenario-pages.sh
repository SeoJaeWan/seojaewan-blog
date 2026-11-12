#!/usr/bin/env bash
# @codocs [[테스트 작성 규칙:E2E]]
# 시나리오 케이스 보고서를 GitHub Pages 브랜치(`gh-pages`)에 올린다. CI(`ci.yml`)의 `Publish report` 작업이 쓴다.
# 브랜치를 받아 풀고, scripts/scenario-pages.mjs로 자기 자리(사이트 루트 또는 `failures/pr-<번호>/`)만 고친 뒤,
# 부모 없는 커밋 하나로 브랜치를 바꿔 올린다. 보고서가 커서(약 113MB) 기록을 쌓지 않는다.
# 받은 뒤 다른 실행이 먼저 올렸으면(--force-with-lease 거절) 다시 받아 처음부터 한다. 다른 폴더를 지우지 않기 위해서다.
#
# 사용법:
#   scripts/publish-scenario-pages.sh main <보고서 폴더>
#   scripts/publish-scenario-pages.sh failure <보고서 폴더> <PR 번호>
#   scripts/publish-scenario-pages.sh clear <PR 번호>
# 환경 변수: PAGES_REMOTE(기본 origin), PAGES_BRANCH(기본 gh-pages), PAGES_MESSAGE(커밋 제목)
set -euo pipefail

command=${1:?명령(main, failure, clear)을 준다}
shift
remote=${PAGES_REMOTE:-origin}
branch=${PAGES_BRANCH:-gh-pages}
message=${PAGES_MESSAGE:-"chore(pages): publish scenario cases report"}
repo_root=$(git rev-parse --show-toplevel)
git_dir=$(git rev-parse --absolute-git-dir)
script="$repo_root/scripts/scenario-pages.mjs"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

for attempt in 1 2 3 4 5; do
  site="$work/site"
  rm -rf "$site" "$work/index"
  mkdir -p "$site"

  # 브랜치가 없으면(처음 올릴 때) 빈 사이트에서 시작하고, 브랜치가 없어야 올리게 한다(빈 lease).
  base=""
  if git ls-remote --exit-code --heads "$remote" "$branch" >/dev/null; then
    git fetch --quiet --no-tags --depth=1 "$remote" "+refs/heads/$branch:refs/pages/base"
    base=$(git rev-parse refs/pages/base)
    git archive "$base" | tar -x -C "$site"
  else
    status=$?
    if [ "$status" -ne 2 ]; then
      echo "$remote에서 $branch를 확인하지 못했다(종료 코드 $status)." >&2
      exit "$status"
    fi
    if [ "$command" = clear ]; then
      echo "$branch가 없어 지울 것이 없다."
      exit 0
    fi
  fi

  node "$script" "$command" "$site" "$@"

  tree=$(
    export GIT_INDEX_FILE="$work/index"
    # 줄 끝을 바꾸지 않고 파일을 그대로 담는다(.gitignore도 보지 않는다).
    # CI는 scripts만 받는 sparse checkout이라, --sparse가 없으면 하위 폴더(trace 등)가 빠진다.
    git --git-dir="$git_dir" --work-tree="$site" -c core.autocrlf=false \
      add --all --force --sparse -- "$site"
    git --git-dir="$git_dir" write-tree
  )
  if [ -n "$base" ] && [ "$tree" = "$(git rev-parse "$base^{tree}")" ]; then
    echo "바뀐 것이 없어 올리지 않는다."
    exit 0
  fi
  commit=$(
    git -c user.name='github-actions[bot]' \
      -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
      commit-tree "$tree" -m "$message"
  )
  if git push --quiet --force-with-lease="refs/heads/$branch:$base" "$remote" "$commit:refs/heads/$branch"; then
    echo "$branch에 올렸다($commit)."
    exit 0
  fi
  echo "다른 실행이 먼저 올렸다. 다시 받아 처음부터 한다($attempt번째)." >&2
  sleep $((attempt * 5))
done

echo "$branch에 올리지 못했다." >&2
exit 1
