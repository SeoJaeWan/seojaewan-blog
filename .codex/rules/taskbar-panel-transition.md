# Taskbar panel transition 규칙

## 적용 범위

`TaskbarPanelHost`, `useTaskbarPanel`과 이를 사용하는 taskbar panel에 적용한다.

## Transition 방식

- 열린 panel `A`에서 panel `B`를 열면 `A`의 닫힘과 `B`의 열림 animation을 동시에 실행한다.
- Transition 중 추가 `open`, `close`, `toggle` 요청은 실행하거나 queue에 저장하지 않는다.
- 교체 transition은 opening과 closing animation이 모두 완료된 뒤 종료한다.
- 먼저 끝난 animation 하나만으로 transition lock을 해제하지 않는다.

## Interaction 차단

- Opening 또는 closing animation 중인 panel은 `inert`로 내부 interaction을 차단한다.
- Closing panel은 논리적으로 닫힌 즉시 접근성 탐색에서도 제외한다.
- Stable open 상태가 된 panel만 내부 검색, 선택과 action interaction을 허용한다.

## 시간 제한

- Taskbar panel의 단일 visual transition은 CSS `animation-duration`과 양수 `animation-delay`의 합이 500ms를 초과하지 않아야 한다.
- 동시에 실행되는 교체 transition의 정상 lock 시간도 가장 긴 참여 animation을 기준으로 500ms를 초과하지 않아야 한다.
- Watchdog은 visual transition 시간이 아니라 비정상적인 event 누락으로 남은 lock을 강제로 정리하는 안전장치다.
- Watchdog 제한은 정상 최대 시간 500ms보다 충분히 길게 설정하고, 정상 `animationend` 또는 유효한 `animationcancel`에서 즉시 해제한다.

## 완료와 안전장치

- Root panel의 `animationend`만 해당 phase의 정상 완료로 처리한다.
- `animationcancel`은 현재 transition phase와 일치하는 경우에만 완료로 처리한다.
- Animation event가 발생하지 않아도 watchdog이 panel presence와 transition lock을 정리해야 한다.
- Component unmount와 새 transition 시작 시 기존 event handler와 watchdog timer를 정리한다.

## 제외 범위

- Trigger focus 복원 정책은 `.codex/todo/taskbar-panel-trigger-focus-restoration.md`에서 별도로 관리한다.
