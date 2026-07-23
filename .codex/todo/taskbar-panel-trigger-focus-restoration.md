# Taskbar panel trigger focus 복원

## 상태

TODO

## 배경

Taskbar panel 닫힘 애니메이션을 지원하면 논리적으로 닫힌 panel이 퇴장 visual을 위해 잠시 DOM에 남는다. 닫힘 중 panel에는 `inert`와 `aria-hidden`을 적용할 예정이므로, panel 내부에 있던 keyboard focus를 어디로 이동할지 별도 정책이 필요하다.

현재 `useTaskbarPanelRootValue`는 `triggerRef`를 이미 소유하지만 닫기 원인을 구분하지 않고 focus를
복원하지 않는다.

## 목표

- keyboard 사용자가 panel을 닫은 뒤 예측 가능한 위치에서 탐색을 계속할 수 있게 한다.
- pointer 사용자의 의도와 다른 대상에 focus를 강제로 이동시키지 않는다.
- panel 교체 시 닫히는 panel의 trigger가 새 panel의 focus 흐름을 빼앗지 않게 한다.

## 닫기 원인별 정책 후보

- `Escape`: panel을 열었던 trigger로 focus를 복원한다.
- trigger 재클릭: browser가 클릭한 trigger에 유지하는 focus를 그대로 사용한다.
- 바깥 pointer 입력: 사용자가 클릭한 대상의 focus를 빼앗지 않도록 trigger focus를 강제하지 않는다.
- 다른 panel로 교체: 이전 panel trigger로 focus를 복원하지 않는다. 새 panel의 초기 focus 정책과 함께 결정한다.
- programmatic close: 호출 목적을 알 수 있도록 close reason을 전달할지 결정한다.

## 구현 검토 사항

- 전역 `closePanel` 또는 Root에 바인딩된 `close`가 close reason을 구분해야 하는지 검토한다.
- focus 이동 시점은 닫힘 애니메이션 종료 시점이 아니라 panel이 `inert`로 전환되는 논리적 close 시점을 우선 검토한다.
- trigger가 unmount되었거나 `disabled`인 경우 focus 복원을 건너뛴다.
- panel 내부에 focus가 있던 경우에만 복원할지 결정한다.

## 완료 조건

- `Escape`로 닫으면 연결된 trigger가 focus를 받는다.
- 바깥 pointer 입력과 panel 교체는 이전 trigger로 focus를 강제하지 않는다.
- trigger가 없는 경우 오류 없이 닫힌다.
- close reason별 동작을 `useTaskbarPanelValue`와 `useTaskbarPanelRootValue` 테스트에 한글 `it`
  설명으로 검증한다.

## 현재 작업과의 경계

Taskbar panel 닫힘 애니메이션 작업에는 focus 복원을 포함하지 않는다. 현재 작업은 logical open 상태, exit presence, `closed` visual, interaction 차단과 animation 종료 후 unmount까지만 다룬다.
