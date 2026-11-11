#!/usr/bin/env bash
# @codocs [[콘텐츠 원천:갱신 방식]]
# 글 동기화 워크플로(.github/workflows/content-sync.yml)가 부른다. main을 checkout해 글 JSON을 내보낸 폴더에서 돈다.
# 하위 명령 두 개
# - close-stale: 글 JSON이 main과 같을 때 부른다. 열린 동기화 PR이 있으면(앞선 병합이 실패해 남은 것) 더는 필요 없으므로 닫는다.
# - publish: 운영 글 빌드가 성공한 뒤 부른다. 고정 브랜치(SYNC_BRANCH)를 main 위의 커밋 하나로 다시 만들어 push하고,
#   PR을 만들고(열린 PR이 이미 있으면 그것을 쓴다) 바로 병합한다. 병합은 merge commit이고 `--match-head-commit`으로
#   방금 push한 커밋일 때만 한다. 다른 워크플로의 검사를 기다리지 않는다. 깨진 글이 병합되지 않게 하는 검사는
#   워크플로의 운영 글 빌드 하나다. merge commit이어야 배포가 "글 JSON만 바뀐 병합"을 `HEAD^1..HEAD`로 알아본다(deploy/version-pr.mjs).
# 병합 직후 일시적으로 병합할 수 없다고 답할 수 있어(GitHub가 병합 가능 여부를 비동기로 계산한다) 몇 번 다시 시도한다.
# 필요한 환경 변수: SYNC_BRANCH, CONTENT_PATH, GH_TOKEN(워크플로의 GITHUB_TOKEN. push·PR 만들기·병합 권한), GH_REPO,
#   GIT_AUTHOR_*·GIT_COMMITTER_*(커밋 작성자)
set -euo pipefail

: "${SYNC_BRANCH:?SYNC_BRANCH가 없다}"
: "${CONTENT_PATH:?CONTENT_PATH가 없다}"

TITLE='chore(content): sync notion content'

open_pr() {
  gh pr list --head "$SYNC_BRANCH" --base main --state open --json number --jq '.[0].number // empty'
}

case "${1:-}" in
  close-stale)
    pr="$(open_pr)"
    if [ -n "$pr" ]; then
      gh pr close "$pr" --delete-branch --comment 'Notion 글이 다시 main과 같아져 닫는다.'
      echo "열린 동기화 PR #$pr을 닫았다."
    fi
    ;;

  publish)
    git diff --stat -- "$CONTENT_PATH"
    git switch --force-create "$SYNC_BRANCH"
    git add -- "$CONTENT_PATH"
    git commit --quiet -m "$TITLE" -m '운영 Notion의 공개 글을 내보낸 글 JSON을 갱신한다. 글 동기화 워크플로(Content sync)가 만든 커밋이다.'
    sha="$(git rev-parse HEAD)"
    git push --force origin "$SYNC_BRANCH"
    echo "$SYNC_BRANCH 브랜치에 push했다($sha)."

    pr="$(open_pr)"
    if [ -z "$pr" ]; then
      gh pr create --base main --head "$SYNC_BRANCH" --title "$TITLE" --body "$(
        cat <<'BODY'
## 무엇을 왜

운영 Notion의 공개 글이 바뀌어 저장소의 글 JSON(`apps/web/content/notion.json`)을 갱신한다.
글 동기화 워크플로(Content sync)가 Notion 웹훅(또는 하루 한 번의 예약 확인)으로 시작해 만든 PR이다.
같은 실행에서 운영 글로 빌드가 통과한 것을 확인했으므로 이어서 바로 병합한다. 다른 워크플로의 검사는 기다리지 않는다.
BODY
      )"
      pr="$(open_pr)"
      echo "동기화 PR #$pr을 만들었다."
    else
      echo "열린 동기화 PR #$pr을 새 커밋으로 갱신했다."
    fi

    for attempt in 1 2 3 4 5; do
      if gh pr merge "$pr" --merge --match-head-commit "$sha" --delete-branch; then
        echo "동기화 PR #$pr을 병합했다."
        exit 0
      fi
      echo "병합하지 못했다($attempt/5). 잠시 뒤 다시 시도한다."
      sleep 5
    done
    echo "::error::동기화 PR #$pr을 병합하지 못했다."
    exit 1
    ;;

  *)
    echo "사용: content-sync-pr.sh close-stale|publish" >&2
    exit 2
    ;;
esac
