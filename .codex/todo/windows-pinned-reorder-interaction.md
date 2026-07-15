# Windows pinned item reorder interaction

## 상태

TODO

## 배경

`useWindowPinAnimation()`은 pinned item의 reorder out/update/in lifecycle과 500ms
watchdog을 제공한다. 하지만 현재 `TaskbarWindowPanel`과 `WindowsPanelUI.View`에는 사용자가
reorder를 시작할 수 있는 입력 동작이 연결되어 있지 않다. Reorder API는 hook contract와
테스트에만 존재한다.

## 목표

- 시작 panel의 pinned item 순서를 사용자가 예측 가능한 방식으로 변경할 수 있게 한다.
- 선택한 입력 방식이 `useWindowPinAnimation.reorder(itemId, toIndex)`를 호출하도록 연결한다.
- Reorder 완료 뒤 `windowsPinsReordered` payload, Provider state와 localStorage 순서가 일치하게 한다.

## interaction 후보

- pointer drag & drop
- keyboard reorder command
- context menu 또는 편집 mode의 왼쪽/오른쪽 이동 action

입력 방식은 접근성, touch 지원과 기존 pinned tile의 open/context menu 동작 충돌을 함께 검토한
뒤 결정한다. 이 TODO는 특정 방식을 미리 확정하지 않는다.

## 구현 검토 사항

- `@window/ui`가 visual과 DOM event 전달만 소유하고 순서 변경 정책은 `@window/shell`에 둔다.
- drag를 선택하면 click-to-open과 pointer gesture를 구분하고 keyboard 대안을 제공한다.
- reorder transition 또는 stale cleanup 중 추가 요청은 현재 lifecycle 규칙대로 무시한다.
- 잘못된 index, 같은 위치와 이미 사라진 item 요청은 no-op으로 유지한다.
- 시작 panel이 닫히거나 item 목록이 바뀔 때 진행 중 interaction을 안전하게 취소한다.

## 완료 조건

- 사용자가 선택된 interaction으로 pinned item을 유효한 위치로 이동할 수 있다.
- out transition 전에는 Provider ID 순서가 유지되고 transition 완료 뒤에만 최종 순서가 반영된다.
- 새 순서가 `windowsPinnedIds_v1`에 저장되고 새로고침 후 복원된다.
- `windowsPinsReordered`가 완료된 순서와 이전 순서를 한 번만 전달한다.
- pointer와 keyboard 사용 경로, no-op과 lifecycle 충돌을 테스트한다.

## 현재 작업과의 경계

Windows pin updater와 animation hook 책임 재설계에는 새로운 reorder interaction을 포함하지 않는다.
현재 작업은 `useWindowPinAnimation.reorder` API와 lifecycle 테스트를 유지하는 데까지만 포함한다.
