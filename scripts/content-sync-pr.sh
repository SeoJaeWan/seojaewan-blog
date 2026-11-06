#!/usr/bin/env bash
# @codocs [[콘텐츠 원천:갱신 방식]]
# 글 동기화 워크플로(.github/workflows/content-sync.yml)가 내보내기 뒤에 부른다. main을 checkout한 폴더에서 돈다.
# - 글 JSON(CONTENT_PATH)이 main과 같으면 아무것도 하지 않는다. 열린 동기화 PR이 있으면 더는 필요 없으므로 닫는다.
# - 다르면 고정 브랜치(SYNC_BRANCH)를 main 위의 커밋 하나로 다시 만들어 push한다. 열린 동기화 PR이 이미 같은 내용이면 push하지 않는다.
# - 열린 동기화 PR이 없으면 만든다. PR은 하나만 둔다.
# 병합은 여기서 하지 않는다. PR의 검사가 끝나면 content-sync-merge.yml이 결과를 보고 병합하거나 알린다.
# (GitHub Free 비공개 저장소라 ruleset과 자동 병합(auto-merge)이 동작하지 않는다.)
# 필요한 환경 변수: SYNC_BRANCH, CONTENT_PATH, GH_TOKEN(PR 만들기·push용 토큰), GIT_AUTHOR_*·GIT_COMMITTER_*(커밋 작성자)
set -euo pipefail

: "${SYNC_BRANCH:?SYNC_BRANCH가 없다}"
: "${CONTENT_PATH:?CONTENT_PATH가 없다}"

TITLE='chore(content): sync notion content'

pr="$(gh pr list --head "$SYNC_BRANCH" --base main --state open --json number --jq '.[0].number // empty')"

if [ -z "$(git status --porcelain -- "$CONTENT_PATH")" ]; then
  echo "글 JSON이 main과 같다. 할 일이 없다."
  if [ -n "$pr" ]; then
    gh pr close "$pr" --delete-branch --comment 'Notion 글이 다시 main과 같아져 닫는다.'
    echo "열린 동기화 PR #$pr을 닫았다."
  fi
  exit 0
fi

git diff --stat -- "$CONTENT_PATH"

if [ -n "$pr" ] && git fetch --quiet origin "$SYNC_BRANCH" && git diff --quiet FETCH_HEAD -- "$CONTENT_PATH"; then
  echo "열린 동기화 PR #$pr에 같은 내용이 이미 있다. push하지 않는다."
else
  git switch --force-create "$SYNC_BRANCH"
  git add -- "$CONTENT_PATH"
  git commit --quiet -m "$TITLE" -m '운영 Notion의 공개 글을 내보낸 글 JSON을 갱신한다. 글 동기화 워크플로(Content sync)가 만든 커밋이다.'
  git push --force origin "$SYNC_BRANCH"
  echo "$SYNC_BRANCH 브랜치에 push했다."
fi

if [ -z "$pr" ]; then
  gh pr create --base main --head "$SYNC_BRANCH" --title "$TITLE" --body "$(
    cat <<'BODY'
## 무엇을 왜

운영 Notion의 공개 글이 바뀌어 저장소의 글 JSON(`apps/web/content/notion.json`)을 갱신한다.
글 동기화 워크플로(Content sync)가 1시간마다 확인해 만든 PR이다. 필수 검사 6개가 모두 통과하면 Content sync merge 워크플로가 병합하고, 하나라도 실패하면 병합하지 않고 카카오톡으로 알린다.
열려 있는 동안 Notion이 또 바뀌면 이 PR의 브랜치를 갱신한다.
BODY
  )"
  echo "동기화 PR을 만들었다."
fi
