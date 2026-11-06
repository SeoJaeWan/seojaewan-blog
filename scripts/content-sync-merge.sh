#!/usr/bin/env bash
# @codocs [[콘텐츠 원천:갱신 방식]]
# 글 동기화 PR의 검사 워크플로 하나가 끝날 때마다 content-sync-merge.yml이 부른다. 기다리지 않고 지금 상태만 보고 끝난다.
# GitHub Free 비공개 저장소라 ruleset(필수 검사)과 자동 병합(auto-merge)이 동작하지 않아, 이 스크립트가 필수 검사를 확인하고 병합한다.
# - 끝난 실행이 PR의 지금 커밋(head)의 것이 아니면(그 뒤에 새로 push됨) 아무것도 하지 않는다.
# - 필수 검사(REQUIRED_CHECKS)가 모두 성공이면 그 커밋일 때만 병합한다(`--match-head-commit`). 이미 닫혔거나 병합된 PR은 건드리지 않는다.
# - 끝난 실행이 실패였으면 병합하지 않고 알린다. 실패한 워크플로마다 한 번 알린다.
# - 아직 끝나지 않은 필수 검사가 있으면 그냥 끝낸다. 그 검사가 끝날 때 다시 불린다.
# 필요한 환경 변수: SYNC_BRANCH, RUN_SHA·RUN_NAME·RUN_CONCLUSION·RUN_URL(끝난 실행), GH_TOKEN(병합용 토큰), GH_REPO,
#   ALERT_URL·ALERT_SECRET(알림)
set -euo pipefail

: "${SYNC_BRANCH:?}" "${RUN_SHA:?}" "${RUN_NAME:?}" "${RUN_CONCLUSION:?}" "${RUN_URL:?}" "${GH_REPO:?}"

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
  gh pr merge "$pr" --merge --match-head-commit "$head_sha"
  echo "필수 검사가 모두 통과해 PR #$pr을 병합했다: $pr_url"
  exit 0
fi

failed="$(jq -r '[.[] | select(.state != "success" and .state != "pending" and .state != "missing") | .name] | join(", ")' <<<"$states")"
if [ -n "$failed" ]; then
  # 끝난 실행 자체는 성공이지만 다른 필수 검사가 실패해 있다. 그 실패는 그 워크플로가 끝날 때 이미 알렸다.
  echo "실패한 필수 검사가 있어 병합하지 않는다: $failed"
else
  echo "아직 끝나지 않은 필수 검사가 있다. 그 검사가 끝날 때 다시 확인한다."
fi
