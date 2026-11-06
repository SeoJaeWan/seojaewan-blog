#!/usr/bin/env bash
# @codocs [[알림 프로세스:결정]]
# 워크플로가 notify(local-server)로 알림 하나를 보낸다. 카카오톡으로 받는다.
# 요청 형식은 local-server 저장소 `.codocs/foundation/notify.yaml`의 '다른 저장소에서 쓰기'를 따른다(202가 접수).
# 사용: notify-alert.sh <제목> <내용> [https:// 링크]
# 필요한 환경 변수: ALERT_URL, ALERT_SECRET(notify의 blog 서비스 비밀값). 비밀값은 출력하지 않는다.
# 보내지 못해도 실패로 끝내지 않는다(이미 실패한 작업의 알림이라 경고만 남긴다).
set -uo pipefail

title="${1:?제목이 없다}"
message="${2:-}"
link="${3:-}"

if [ -z "${ALERT_URL:-}" ] || [ -z "${ALERT_SECRET:-}" ]; then
  echo "::warning::ALERT_URL·ALERT_SECRET이 없어 알림을 보내지 못했다: $title"
  exit 0
fi

body="$(jq -n --arg title "$title" --arg message "$message" --arg link "$link" \
  '{level: "error", title: $title, message: $message} + (if $link == "" then {} else {link: $link} end)')"
status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 -X POST "$ALERT_URL" \
  -H "Authorization: Bearer $ALERT_SECRET" -H 'Content-Type: application/json' -d "$body" || true)"
if [ "$status" = 202 ]; then
  echo "알림을 보냈다: $title"
else
  echo "::warning::notify가 알림을 받지 않았다(${status:-응답 없음}): $title"
fi
