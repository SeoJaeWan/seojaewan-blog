#!/usr/bin/env bash
# @codocs [[콘텐츠 원천:갱신 방식]]
# 글 동기화 PR을 필수 검사 결과를 보고 병합한다. 기다리지 않고 지금 상태만 보고 끝난다.
# GitHub Free 비공개 저장소라 ruleset(필수 검사)과 자동 병합(auto-merge)이 동작하지 않아, 이 스크립트가 필수 검사를 확인하고 병합한다.
# 두 곳에서 부른다.
# - 검사 워크플로 하나가 끝날 때(content-sync-merge.yml, RUN_* 있음)
#   - 끝난 실행이 PR의 지금 커밋(head)의 것이 아니면(그 뒤에 새로 push됨) 아무것도 하지 않는다.
#   - 끝난 실행이 실패였으면 병합하지 않고 알린다. 실패한 워크플로마다 한 번 알린다.
# - 매시 동기화 작업의 시작(content-sync.yml, RUN_* 없음). 위 경로가 놓친 PR을 늦어도 다음 시간에 병합하는 보조 경로다.
#   실패 알림은 보내지 않는다(검사 워크플로가 끝날 때 이미 보냈다).
# 공통
# - 필수 검사(REQUIRED_CHECKS)가 모두 성공이면 그 커밋일 때만 병합한다(`--match-head-commit`). 이미 닫혔거나 병합된 PR은 건드리지 않는다.
# - 아직 끝나지 않은 필수 검사가 있으면 그냥 끝낸다. 그 검사가 끝날 때 다시 불린다.
# - 두 경로가 함께 병합하려 해 병합이 실패했는데 PR이 이미 병합되어 있으면 성공으로 본다.
# 토큰
# - GH_TOKEN: 읽기용. 워크플로의 GITHUB_TOKEN(checks·pull-requests 읽기)이다. Fine-grained PAT에는 Checks 권한이 없어
#   check run 목록을 읽지 못한다(403).
# - MERGE_TOKEN: 병합용 PAT(CONTENT_SYNC_TOKEN). main push의 CI가 돌게 하기 위해서다(GITHUB_TOKEN이 만든 이벤트는 워크플로를 부르지 않는다).
# 필요한 환경 변수: SYNC_BRANCH, GH_REPO, GH_TOKEN, MERGE_TOKEN, ALERT_URL·ALERT_SECRET(알림)
#   검사 워크플로가 끝날 때만: RUN_SHA·RUN_NAME·RUN_CONCLUSION·RUN_URL(끝난 실행)
set -euo pipefail

: "${SYNC_BRANCH:?}" "${GH_REPO:?}" "${MERGE_TOKEN:?}"

# 병합 전에 통과해야 하는 검사(작업 이름). 예전 ruleset `main: CI 통과 필수`가 요구하던 여섯이다.
REQUIRED_CHECKS='["Branch name","Lint, typecheck, test, build","E2E","Figma generated","Figma parity","Motion check"]'

here="$(dirname "$0")"
pr_json="$(gh pr list --head "$SYNC_BRANCH" --base main --state open --json number,headRefOid,url --jq '.[0] // empty')"
if [ -z "$pr_json" ]; then
  echo "열린 동기화 PR이 없다."
  exit 0
fi
pr="$(jq -r .number <<<"$pr_json")"
head_sha="$(jq -r .headRefOid <<<"$pr_json")"
pr_url="$(jq -r .url <<<"$pr_json")"

if [ -n "${RUN_SHA:-}" ]; then
  : "${RUN_NAME:?}" "${RUN_CONCLUSION:?}" "${RUN_URL:?}"
  if [ "$head_sha" != "$RUN_SHA" ]; then
    echo "끝난 실행($RUN_SHA)이 PR #$pr의 지금 커밋($head_sha)의 것이 아니다. 넘어간다."
    exit 0
  fi
  if [ "$RUN_CONCLUSION" = failure ] || [ "$RUN_CONCLUSION" = timed_out ]; then
    bash "$here/notify-alert.sh" '글 동기화 PR의 검사가 실패했다' \
      "PR #$pr의 $RUN_NAME 검사가 실패해($RUN_CONCLUSION) 병합하지 않았다. Notion 글을 고치면 다음 동기화가 PR을 갱신한다." \
      "$RUN_URL"
    exit 0
  fi
fi

# 필수 검사마다 가장 나중 실행의 상태. 다시 실행한 검사는 같은 이름이 여럿이다.
states="$(gh api --paginate "repos/$GH_REPO/commits/$head_sha/check-runs?per_page=100" --jq '.check_runs[]' |
  jq -s --argjson required "$REQUIRED_CHECKS" '
    [ $required[] as $name
      | ([ .[] | select(.name == $name) ] | sort_by(.id) | last) as $run
      | { name: $name,
          state: (if $run == null then "missing"
                  elif $run.status != "completed" then "pending"
                  else $run.conclusion end) } ]')"
echo "$states" | jq -r '.[] | "\(.name): \(.state)"'

if jq -e 'all(.[]; .state == "success")' <<<"$states" >/dev/null; then
  if GH_TOKEN="$MERGE_TOKEN" gh pr merge "$pr" --merge --match-head-commit "$head_sha"; then
    echo "필수 검사가 모두 통과해 PR #$pr을 병합했다: $pr_url"
    exit 0
  fi
  if [ "$(gh pr view "$pr" --json state --jq .state)" = MERGED ]; then
    echo "PR #$pr은 다른 실행이 이미 병합했다: $pr_url"
    exit 0
  fi
  echo "::error::PR #$pr을 병합하지 못했다: $pr_url"
  exit 1
fi

failed="$(jq -r '[.[] | select(.state != "success" and .state != "pending" and .state != "missing") | .name] | join(", ")' <<<"$states")"
if [ -n "$failed" ]; then
  # 실패 알림은 그 검사 워크플로가 끝날 때 이미 보냈다.
  echo "실패한 필수 검사가 있어 병합하지 않는다: $failed"
else
  echo "아직 끝나지 않은 필수 검사가 있다. 그 검사가 끝날 때 다시 확인한다."
fi
