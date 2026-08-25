# Windows pinned item reorder interaction

## 문서 역할

Legacy completion snapshot. 아래 상태와 구현 결과는 이전 `packages/ui`·`packages/shell` 구현의
기록이며 현재 roadmap 또는 canonical 계약이 아니다. 실행 가능한 현재 작업은 Gateway Work Item
catalog에서 관리한다.

## 상태

완료

## 배경

`useWindowsPins()`는 canonical reorder action을, `useWindowPinAnimation()`은 이미 변경된 순서를
out/in visual로 투영하는 lifecycle과 500ms watchdog을 제공한다. 초기 구현에는 사용자가 reorder를
시작할 입력 동작이 없었고 action은 hook contract와 테스트에만 존재했다. 현재는
`WindowPanelPinnedView`가 Pinned 전용 Context Menu action을 조립하고
`WindowsPanelPinnedViewUI`가 contextmenu event를 전달한다.

## 목표

- 시작 panel의 pinned item 순서를 사용자가 예측 가능한 방식으로 변경할 수 있게 한다.
- 선택한 입력 방식이 `useWindowsPins().reorder(itemId, toIndex)`를 호출하도록 연결한다.
- Reorder 완료 뒤 `windowsPinsReordered` payload, Provider state와 localStorage 순서가 일치하게 한다.

## 선택한 interaction

Window item Context Menu의 맨 앞·왼쪽·오른쪽 이동 action을 사용한다. Pointer 우클릭과 keyboard
context menu 요청으로 같은 action button에 접근하며 `useWindowsPins().reorder(itemId, toIndex)`를
호출한다.

- 첫 번째 항목: 오른쪽 이동
- 두 번째 항목: 왼쪽·오른쪽 이동
- 세 번째 이후 중간 항목: 맨 앞·왼쪽·오른쪽 이동
- 마지막 항목: 맨 앞·왼쪽 이동

## 구현 검토 사항

- `@window/ui`가 visual과 DOM event 전달만 소유하고 순서 변경 정책은 `@window/shell`에 둔다.
- drag를 선택하면 click-to-open과 pointer gesture를 구분하고 keyboard 대안을 제공한다.
- animation 중 추가 요청도 canonical action에는 즉시 반영한다. Visual은 latest-wins 규칙에 따라
  최신 목록으로 animation 계획을 다시 계산한다.
- 잘못된 index, 같은 위치와 이미 사라진 item 요청은 no-op으로 유지한다.
- 시작 panel이 닫히거나 item 목록이 바뀔 때 진행 중 interaction을 안전하게 취소한다.

## 완료 조건

- 사용자가 선택된 interaction으로 pinned item을 유효한 위치로 이동할 수 있다.
- reorder 요청 시 Provider ID 순서, storage와 event가 visual out보다 먼저 최종 순서로 반영된다.
- 새 순서가 `windowsPinnedIds_v1`에 저장되고 새로고침 후 복원된다.
- `windowsPinsReordered`가 완료된 순서와 이전 순서를 한 번만 전달한다.
- pointer와 keyboard 사용 경로, no-op과 lifecycle 충돌을 테스트한다.

## 구현 결과

Pinned surface의 `useContextMenuTrigger` 설정이 현재 pinned index에서 가능한 action을 계산해 전역
Context Menu Host에 전달하고 기존 canonical reorder action에 연결한다. All과 Search 설정에는
reorder action이 없다. Provider state, localStorage와 semantic event가 먼저 갱신되고
`useWindowPinAnimation`이 기존 latest-wins 규칙으로 변경된 순서를 시각화한다.
