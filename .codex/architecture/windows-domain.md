# Windows Domain Architecture

## Status

이 문서는 `@window/shell`의 Windows domain에 대한 canonical 계약이다. Windows item, 검색,
surface별 pin 상태와 observer event를 변경할 때는 이 문서와 public API를 함께 갱신한다.

Taskbar의 시각 구조와 panel transition은 각각
[`taskbar.md`](../layout/taskbar.md),
[`taskbar-panel-transition.md`](../rules/taskbar-panel-transition.md)를 따른다.

## Purpose

앱 root의 `Windows`는 모든 surface가 공유하는 다음 전역 상태와 observer registry를 제공한다.

- 앱이 props로 전달한 `windowsItems`
- 작업 표시줄에 고정된 `taskbarPinnedIds`
- 시작 화면에 고정된 `windowsPinnedIds`
- flat event name별 observer listener

검색어, 검색 상세 선택, 시작 화면의 pinned/all navigation과 pin animation은 전역 상태가
아니다. 이를 사용하는 panel 또는 hook이 지역적으로 소유한다.

## Root Composition

`Windows`는 Windows domain을 사용하는 앱·shell 컴포넌트 전체를 감싼다.
`TaskbarPanelHost`는 taskbar panel registry와 portal layer만 소유하므로 그 안에 둔다.

```tsx
import { TaskbarPanelHost, TaskbarStartButton, Windows, useWindowEvent } from "@window/shell";
import type { WindowItem } from "@window/ui";

const WindowObservers = () => {
  useWindowEvent("windowOpen", ({ item, source }) => {
    openWindow(item.id, source);
  });

  useWindowEvent("windowOpenLocation", ({ item }) => {
    openWindowLocation(item.id);
  });

  return null;
};

export const AppShell = ({ items }: { items: readonly WindowItem[] }) => (
  <Windows windowsItems={items}>
    <WindowObservers />
    <TaskbarPanelHost>
      <TaskbarStartButton />
    </TaskbarPanelHost>
  </Windows>
);
```

`useWindowEvent`, `useWindowDispatch`, `useWindowPins`, `useWindowPinnedItems`와
`useWindowSearch`는 모두 `Windows` 아래에서만 호출한다.

## State Ownership

| State                 | Source of truth                         | Update path                                                        |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| `windowsItems`        | 앱이 전달한 `Windows.windowsItems` prop | prop 배열 참조가 변경될 때 Provider snapshot 갱신                  |
| `taskbarPinnedIds`    | `Windows` 내부 pin state                | `useWindowPins("taskbar")` 또는 pin lifecycle hook의 완료된 commit |
| `windowsPinnedIds`    | `Windows` 내부 pin state                | `useWindowPins("windows")` 또는 pin lifecycle hook의 완료된 commit |
| observer registry     | `Windows` instance                      | `useWindowEvent` subscribe/unsubscribe, Provider emit              |
| 검색 query/result     | 소비 panel/hook                         | query는 지역 상태, result는 `windowsItems`에서 파생                |
| pinned item animation | `useWindowPinnedItems`                  | visual lifecycle 완료 뒤 Provider에 최종 commit                    |

Provider는 `pin`, `unpin`, `reorder`의 정책과 animation 순서를 직접 결정하지 않는다. Hook이
최신 Provider snapshot에서 최종 patch와 event를 계산하고, Provider는 patch 반영과 observer
호출을 원자적인 commit 순서로 연결한다.

## `windowsItems` Contract

- `WindowItem`은 `@window/ui`가 소유하며 `id`, `title`, 선택적 `description`, `icon`으로
  구성된다.
- `windowsItems`의 source of truth는 props 하나뿐이다. Public `updateWindowsItems` API는 없다.
- Provider는 이전 배열과 새 배열의 참조가 다를 때 `windowsItemsUpdated`를 전달한다. 항목별
  semantic diff는 계산하지 않는다.
- 소비자는 실제 목록이 바뀌지 않았다면 배열 참조를 안정적으로 유지해야 한다.
  `windowsItems={[...items]}`처럼 매 render마다 새 배열을 만들면 매번 update event가 발생한다.
- `WindowItem.id`는 pin persistence와 item lookup의 식별자이므로 surface 전체에서 안정적이고
  고유해야 한다.

## Pin State And Persistence

### Targets

| Hook target | State              | localStorage key      | Semantic event suffix              |
| ----------- | ------------------ | --------------------- | ---------------------------------- |
| `"windows"` | `windowsPinnedIds` | `windowsPinnedIds_v1` | `Start` / `windowsPinsReordered`   |
| `"taskbar"` | `taskbarPinnedIds` | `taskbarPinnedIds_v1` | `Taskbar` / `taskbarPinsReordered` |

두 목록은 독립적이다. 시작 화면 pin 변경이 taskbar pin을 변경하거나 그 반대가 되는 일은 없다.

### Restore And Failure Policy

- server render의 초기 pin state는 빈 배열이다.
- client effect에서 두 key를 읽어 복원하며 복원 자체는 observer event를 만들지 않는다.
- key 누락, JSON 파싱 실패, string 배열이 아닌 값, localStorage 접근 실패는 빈 배열로 복구한다.
- 중복 ID는 처음 등장한 순서만 유지한다.
- 쓰기 실패는 런타임 동작을 중단시키지 않는다. 현재 메모리 commit은 유지한다.
- key schema를 바꿀 때는 `_v2`, `_v3`처럼 새 key를 만들고 migration 정책을 별도로 정의한다.

### Mutation And Visual Lifecycle

`useWindowPins(target)`은 현재 ID를 읽고 다음 동작을 제공한다.

- `isPinned(itemId)`
- `pin(itemId)`
- `unpin(itemId)`
- `reorder(itemId, toIndex)`
- `pinnedIds`

`useWindowPinnedItems(target)`은 ID를 실제 `WindowItem`으로 변환하고 reorder 및 stale item의
out/in lifecycle을 소유한다. Reorder는 out transition이 끝난 뒤 순서를 commit하고 새 위치의
in animation을 완료한다. `windowsItems`에서 사라진 pinned item은 마지막 item snapshot으로
exit visual을 마친 뒤 ID와 localStorage를 정리한다. 이 자동 정리는 사용자 action이 아니므로
unpin observer event를 전달하지 않는다.

Animation event가 누락되어도 500ms watchdog이 lifecycle을 완료한다. Transition 진행 중에는
충돌하는 새 reorder 요청을 무시한다.

## Search Contract

`useWindowSearch(query)`는 Provider 상태를 바꾸지 않고 현재 `windowsItems`에서 결과를 파생한다.

- 앞뒤 공백을 제거하고 NFC 정규화 후 대소문자를 구분하지 않는다.
- `title`과 `description`의 부분 문자열을 검색한다.
- 공백을 제외한 query 전체가 한글 초성일 때는 title과 description의 초성도 검색한다.
- 일반 한글과 초성이 섞인 query는 초성 검색으로 확장하지 않는다.
- 별도 relevance 정렬을 하지 않고 입력 item 순서와 item 참조를 보존한다.
- 빈 query는 원본 `windowsItems` 참조를 그대로 반환한다.

## Observer And Dispatch

### Subscribe

`useWindowEvent(eventName, listener)`는 flat event name 하나만 구독한다. Event name이 바뀌거나
컴포넌트가 unmount되면 자동으로 구독을 해제하며, listener 함수가 바뀌어도 불필요하게 다시
구독하지 않고 최신 listener를 호출한다.

Listener 하나가 예외를 던져도 다른 listener와 원래 update/dispatch 흐름은 계속된다. 예외는
`globalThis.reportError`가 있으면 그쪽으로, 없으면 `console.error`로 보고한다.

### Dispatch

`useWindowDispatch()`는 Provider 상태를 바꾸지 않는 세 event만 직접 발생시킬 수 있다.

- `windowOpen`
- `windowOpenLocation`
- `windowContextMenuRequested`

Pin과 item update event는 완료된 Provider commit에 묶여야 하므로 public dispatch 대상이 아니다.

## Event Contract

### Stateless dispatch events

| Event                        | Payload            | Meaning                |
| ---------------------------- | ------------------ | ---------------------- |
| `windowOpen`                 | `{ item, source }` | item 열기 요청         |
| `windowOpenLocation`         | `{ item, source }` | item 위치 열기 요청    |
| `windowContextMenuRequested` | `{ item, source }` | context menu 표시 요청 |

`source`는 `"pinned" | "all" | "search"`다. Context menu payload에는 React
`MouseEvent`나 좌표를 포함하지 않는다.

### State commit events

| Event                    | Payload                                                             | Timing                                       |
| ------------------------ | ------------------------------------------------------------------- | -------------------------------------------- |
| `windowsItemsUpdated`    | `{ items, previousItems }`                                          | `windowsItems` prop의 배열 참조 변경 반영 후 |
| `windowPinToStart`       | `{ itemId, pinnedIds, previousPinnedIds }`                          | 시작 화면 pin commit 후                      |
| `windowUnpinFromStart`   | `{ itemId, pinnedIds, previousPinnedIds }`                          | 시작 화면 unpin commit 후                    |
| `windowPinToTaskbar`     | `{ itemId, pinnedIds, previousPinnedIds }`                          | taskbar pin commit 후                        |
| `windowUnpinFromTaskbar` | `{ itemId, pinnedIds, previousPinnedIds }`                          | taskbar unpin commit 후                      |
| `windowsPinsReordered`   | `{ fromIndex, movedItemId, pinnedIds, previousPinnedIds, toIndex }` | 시작 화면 reorder commit 후                  |
| `taskbarPinsReordered`   | `{ fromIndex, movedItemId, pinnedIds, previousPinnedIds, toIndex }` | taskbar reorder commit 후                    |

`pinnedIds`와 `previousPinnedIds`는 해당 target의 목록만 나타낸다. Stale item 자동 정리는 이
표의 event를 발생시키지 않는다.

## Public API

`@window/shell`은 Windows domain에 다음 API를 공개한다.

| API                                                   | Responsibility                                      |
| ----------------------------------------------------- | --------------------------------------------------- |
| `Windows` / `WindowsProps`                            | 전역 item, pin state와 observer registry 제공       |
| `useWindowEvent`                                      | typed flat event 구독                               |
| `useWindowDispatch`                                   | 상태 없는 open/location/context menu event dispatch |
| `useWindowPins` / `UseWindowPinsResult`               | target별 pin add/remove/reorder 계산과 commit       |
| `useWindowPinnedItems` / `UseWindowPinnedItemsResult` | pin item lookup과 reorder/stale animation lifecycle |
| `useWindowSearch`                                     | 현재 item의 derived 검색 결과                       |
| `WindowEventMap`과 관련 event/payload types           | observer 및 dispatch 타입 계약                      |

내부 context, `commitState`, pin storage helper와 event registry는 public API가 아니다.

## Taskbar Adapter Policy

Taskbar 시작 panel은 Windows domain event를 직접 해석하지 않고 hook을 통해 연결한다.

- item 선택과 `open`/`openLocation` action: `TaskbarPanelHost.closePanel()` 호출 후 해당 event dispatch
- pin/unpin action: target별 `useWindowPins` 호출, panel은 열린 상태 유지
- context menu: native 기본 메뉴를 막고 `windowContextMenuRequested` dispatch, panel은 열린 상태 유지

즉, Provider는 panel close 정책을 알지 못한다. Event를 일으키는 taskbar adapter가 현재 UI
interaction 순서를 결정하고, 앱 observer는 이미 발생한 semantic event만 처리한다.

## Superseded Contracts

다음 이름과 사용 방식은 폐기되었다.

- `PinProvider`, `usePins`, `useOptionalPins`
- app callback과 `pinnedItems`를 `TaskbarStartButton`까지 전달하는 props drilling
- Provider가 public `pin`, `unpin`, `reorder` action policy를 직접 소유하는 구조
- action 종류를 payload 안에서 다시 분기하는 단일 `itemActionRequested` event
- `windowsItems`를 hook으로 직접 교체하는 `updateWindowsItems`
