# Windows Domain Architecture

## Status

이 문서는 `@window/shell`의 Windows domain에 대한 canonical 계약이다. Windows item, 검색,
surface별 pin 상태와 observer event를 변경할 때는 이 문서와 public API를 함께 갱신한다.

Taskbar의 시각 구조와 panel transition은 각각
[`taskbar.md`](../layout/taskbar.md),
[`taskbar-panel-transition.md`](../rules/taskbar-panel-transition.md)를 따른다.

## Purpose

앱 root의 `Windows`는 Events, Items, Taskbar Pins와 Windows Pins Provider를 조합해 모든
surface가 공유하는 다음 상태와 observer registry를 제공한다.

- 앱이 props로 전달한 `windowsItems`
- 작업 표시줄에 고정된 `taskbarPinnedIds`
- 시작 화면에 고정된 `windowsPinnedIds`
- flat event name별 observer listener

검색어, 검색 상세 선택, 시작 화면의 pinned/all navigation과 pin animation은 전역 상태가
아니다. 이를 사용하는 panel 또는 hook이 지역적으로 소유한다.

## Root Composition

`Windows`는 Windows domain을 사용하는 앱·shell 컴포넌트 전체를 감싼다.
`TaskbarPanel`은 taskbar panel registry와 portal layer만 소유하므로 그 안에 둔다.

```tsx
import { TaskbarPanel, TaskbarStartButton, Windows, useWindowEvent } from "@window/shell";
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
    <TaskbarPanel>
      <TaskbarStartButton />
    </TaskbarPanel>
  </Windows>
);
```

`useWindowEvent`, `useWindowDispatch`, `useTaskbarPins`, `useWindowsPins`,
`useWindowPinAnimation`과 `useWindowSearch`는 모두 `Windows` 아래에서만 호출한다.

내부 Provider 구성은 다음 순서를 사용한다.

```tsx
<WindowsEventsProvider>
  <WindowsItemsProvider windowsItems={windowsItems}>
    <TaskbarPinsProvider>
      <WindowsPinsProvider>{children}</WindowsPinsProvider>
    </TaskbarPinsProvider>
  </WindowsItemsProvider>
</WindowsEventsProvider>
```

`Windows`는 이 Provider를 조합하는 public facade이며 pin 상태, persistence 또는 action 정책을
직접 구현하지 않는다.

## State Ownership

| State                 | Source of truth                         | Update path                                                 |
| --------------------- | --------------------------------------- | ----------------------------------------------------------- |
| `windowsItems`        | 앱이 전달한 `Windows.windowsItems` prop | `useWindowsItemsValue`가 참조와 update event 제공           |
| `taskbarPinnedIds`    | `TaskbarPinsProvider`                   | Provider value hook의 등록·취소 action                      |
| `windowsPinnedIds`    | `WindowsPinsProvider`                   | Provider value hook의 등록·취소·reorder action              |
| observer registry     | `WindowsEventsProvider`                 | `useWindowEvent` subscribe/unsubscribe, 단일 typed dispatch |
| 검색 query/result     | 소비 panel/hook                         | query는 지역 상태, result는 `windowsItems`에서 파생         |
| pinned item animation | `useWindowPinAnimation`                 | canonical 변경을 item cache와 out/in visual로 투영          |

각 pin Provider는 자신의 state, persistence, action과 semantic event를 함께 소유한다. Provider
모듈이 export하는 `useTaskbarPins`와 `useWindowsPins`는 해당 Context의 완성된 state/action 값을
읽기만 한다.
두 Provider는 공통 단일 목록 메커니즘인 내부 `usePinnedIdsState`만 공유하며 서로의 상태에는
의존하지 않는다.

`WindowsItemsProvider`는 `useWindowsItemsValue(windowsItems)`가 반환한 값을 Context에 전달하는
조립만 담당한다. Private `useWindowsItemsValue`가 이전 item 배열 참조의 lifecycle과
`windowsItemsUpdated` event를 소유하고, internal `useWindowsItemsContext`는 완성된 Context 값을
읽는다.

## `windowsItems` Contract

- `WindowItem`은 `@window/ui`가 소유하며 `id`, `title`, 선택적 `description`, `icon`으로
  구성된다.
- `windowsItems`의 source of truth는 props 하나뿐이다. Public `updateWindowsItems` API는 없다.
- `useWindowsItemsValue`는 이전 배열과 새 배열의 참조가 다를 때 `windowsItemsUpdated`를 전달한다.
  항목별 semantic diff는 계산하지 않는다.
- 소비자는 실제 목록이 바뀌지 않았다면 배열 참조를 안정적으로 유지해야 한다.
  `windowsItems={[...items]}`처럼 매 render마다 새 배열을 만들면 매번 update event가 발생한다.
- `WindowItem.id`는 pin persistence와 item lookup의 식별자이므로 surface 전체에서 안정적이고
  고유해야 한다.
- 두 pin ID 배열은 항상 현재 `windowsItems` ID의 부분집합이다. Item이 사라지면 해당 ID는
  canonical state와 localStorage에서 observer event 없이 즉시 제거된다.

## Pin State And Persistence

### Surfaces

| Hook             | State              | localStorage key      | 제공 동작           |
| ---------------- | ------------------ | --------------------- | ------------------- |
| `useWindowsPins` | `windowsPinnedIds` | `windowsPinnedIds_v1` | pin, unpin, reorder |
| `useTaskbarPins` | `taskbarPinnedIds` | `taskbarPinnedIds_v1` | pin, unpin          |

두 목록은 독립적이다. 시작 화면 pin 변경이 taskbar pin을 변경하거나 그 반대가 되는 일은 없다.

### Restore And Failure Policy

- server render의 초기 pin state는 빈 배열이다.
- 각 pin Provider의 client effect에서 자신의 key를 읽어 복원하며 복원 자체는 observer event를
  만들지 않는다.
- localStorage는 client 복원 입력과 best-effort persistence이며, hydration 이후 pin state의 source of
  truth는 각 Provider의 메모리 상태다. 다른 browsing context의 storage 변경을 실시간 동기화하지 않는다.
- key 누락은 정상적인 빈 상태로 취급하며 빈 배열로 복원한다.
- 읽을 수 있지만 JSON 파싱에 실패하거나 string 배열이 아닌 값은 빈 배열로 복구하고 같은 key를
  `[]`로 덮어쓴다. localStorage 접근 실패는 빈 메모리 상태로 격리하되 write-back을 보장하지 않는다.
- 중복 ID는 처음 등장한 순서만 유지하고 정리된 배열을 같은 key에 저장한다.
- 복원 값이나 이후 상태에 현재 `windowsItems`에 없는 ID가 있으면 event 없이 제거하고 정리된
  배열을 같은 key에 저장한다. 이 복구와 정규화는 사용자 action이 아니므로 pin/unpin event를
  만들지 않는다.
- 쓰기 실패는 런타임 동작을 중단시키지 않는다. 현재 메모리 update는 유지한다.
- key schema를 바꿀 때는 `_v2`, `_v3`처럼 새 key를 만들고 migration 정책을 별도로 정의한다.

### Mutation And Visual Lifecycle

각 pin Provider의 value hook은 `usePinnedIdsState`를 한 번 호출한다. `usePinnedIdsState`는 배열과
최신 ref, client 복원, localStorage 읽기·쓰기 실패 격리와 canonical 정규화를 함께 소유한다. 별도 pin
storage module은 두지 않는다. Hook은 `storageKey`와 유효한 item ID만 입력받으며 Taskbar, Windows,
pin action 또는 observer event의 의미를 알지 않는다.

Canonical pin ID는 처음 등장한 순서를 유지하는 중복 없는 현재 item ID의 부분집합이다. Storage 복원,
functional updater 결과와 유효 item 목록 변경은 모두 같은 정규화 규칙을 거친다.

```ts
type PinnedIdsChange = {
  pinnedIds: readonly string[];
  previousPinnedIds: readonly string[];
};

type UpdatePinnedIds = (
  update: (currentPinnedIds: readonly string[]) => readonly string[] | null,
) => PinnedIdsChange | null;
```

이 update 계약은 각 pin Provider 내부에서만 사용한다. 실제 변경이 없으면 `null`, 변경됐으면
완료된 이전/다음 배열을 동기적으로 반환하며 public Context에는 raw updater를 노출하지 않는다.

`useTaskbarPins()`는 animation 지역 상태 없이 다음 등록·취소 동작만 제공한다.

- `isPinned(itemId)`
- `pin(itemId)`
- `unpin(itemId)`
- `pinnedIds`

`useWindowsPins()`는 같은 조회·등록·취소 동작과 `reorder(itemId, toIndex)`를 제공한다. 세 action은
모두 canonical state와 localStorage를 즉시 갱신하고 완료된 배열로 semantic event를 전달한다.
Animation 완료를 기다리거나 animation hook에서 다시 pin action을 호출하지 않는다.

`useTaskbarPinsValue()`와 `useWindowsPinsValue()`는 update 결과가 `null`이 아닐 때만 action에
대응하는 pin, unpin 또는 reorder event를 만들어 `WindowsEventsProvider`의 단일 `dispatch`로
전달한다. 내부 Context의 dispatch는 전체 `WindowEventMap`을 처리하지만 public
`useWindowDispatch` 반환 타입은 상태 없는 세 event로만 좁힌다.

`WindowsPinsProvider`의 내부 Context 값에는 public `UseWindowsPins` action/state와 함께 각 사용자
action의 최신 mutation snapshot을 둔다. Snapshot은 단조 증가하는 revision, 이전/다음 ID 목록과
action 종류를 포함하며 `useWindowPinAnimation()`의 visual projection에만 사용한다. Public
`useWindowsPins()` 타입에는 이 내부 metadata를 노출하지 않는다.

`useWindowPinAnimation()`은 Windows panel 전용이며 내부 pin/item Context의 값을 결합해 ID를
실제 `WindowItem`으로 변환한다. Canonical state를 갱신하지 않고 다음 visual만 소유한다.

- pin: 이미 갱신된 canonical 위치에서 새 tile을 in한다.
- unpin: 이전 visual snapshot을 유지해 tile을 out한 뒤 제거한다.
- reorder: 이전 visual 순서에서 moved tile을 out하고 canonical 순서로 전환한 뒤 같은 tile을 in한다.
- stale item 자동 정리: 마지막 `WindowItem` snapshot을 유지해 unpin과 같은 out을 수행한다.
- storage 복원: 사용자 mutation이 아니므로 animation 없이 canonical 목록에 즉시 동기화한다.

`windowsItems`에서 item이 사라지면 canonical pin ID와 localStorage는 즉시 정리된다. Windows
panel의 animation hook만 마지막 item snapshot을 별도 visual cache에 남겨 exit visual을 마친다.
Taskbar에는 pinned item renderer와 animation lifecycle이 없으며 자동 정리는 사용자 action이
아니므로 unpin observer event를 만들지 않는다.

여러 stale item은 이전 visual 순서대로 하나씩 out한다. Animation 도중 더 최신 canonical 변경이
오면 진행 중 계획을 취소하고 최신 목록을 기준으로 다시 계산한다. 단순한 다음 단계는 계속
animation하며, 여러 종류의 변경이 겹쳐 안전한 단계를 만들 수 없으면 중간 animation을 생략하고
최신 canonical 목록을 우선한다. DOM 완료 event가 누락되어도 단계별 500ms watchdog이 lifecycle을
완료한다.

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

내부 `createWindowEventRegistry.subscribe`에 같은 event와 같은 listener 참조를 반복 등록하면 하나의
논리적 구독으로 취급한다. 어느 등록에서 반환된 unsubscribe를 호출해도 해당 구독이 해제되며 이후
unsubscribe는 no-op이다. Dispatch는 시작 시점의 listener snapshot을 순회하므로 도중에 제거된
listener는 현재 dispatch까지 실행하고, 도중에 추가된 listener는 다음 dispatch부터 실행한다.

Listener 하나가 예외를 던져도 다른 listener와 원래 update/dispatch 흐름은 계속된다. 예외는
`globalThis.reportError`가 있으면 그쪽으로, 없으면 `console.error`로 보고한다.

### Dispatch

`useWindowDispatch()`는 Provider 상태를 바꾸지 않는 세 event만 직접 발생시킬 수 있다.

- `windowOpen`
- `windowOpenLocation`
- `windowContextMenuRequested`

`WindowEventMap`은 stateless와 state update event를 모두 담는 canonical 계약이며
`WindowsEventsProvider`는 이 map을 받는 dispatch 하나만 제공한다. Public `useWindowDispatch`는
같은 dispatch를 stateless event 이름으로 타입 제한해서 반환한다.

`useWindowEvent`, `useWindowDispatch`와 내부 Provider용 `useWindowsEventsContext`는
`windowsEventsProvider` module root에서 export한다. Package root는 public 두 hook만 선택적으로
재노출한다.

Pin과 item update event는 완료된 state update 결과를 받은 내부 Provider에서만 만들어지므로 public
dispatch 대상이 아니다. Pin event는 별도 render 대기 queue 없이 직접 전달한다. Observer가 해당
변경의 완료 결과를 필요로 할 때는 event payload의 `pinnedIds`와 `previousPinnedIds`를 사용하며
context state는 다음 React render에서 같은 값으로 갱신된다.

## Event Contract

### Stateless dispatch events

| Event                        | Payload            | Meaning                |
| ---------------------------- | ------------------ | ---------------------- |
| `windowOpen`                 | `{ item, source }` | item 열기 요청         |
| `windowOpenLocation`         | `{ item, source }` | item 위치 열기 요청    |
| `windowContextMenuRequested` | `{ item, source }` | context menu 표시 요청 |

`source`는 `"pinned" | "all" | "search"`다. Context menu payload에는 React
`MouseEvent`나 좌표를 포함하지 않는다.

### State update events

| Event                    | Payload                                                             | Timing                                       |
| ------------------------ | ------------------------------------------------------------------- | -------------------------------------------- |
| `windowsItemsUpdated`    | `{ items, previousItems }`                                          | `windowsItems` prop의 배열 참조 변경 반영 후 |
| `windowPinToStart`       | `{ itemId, pinnedIds, previousPinnedIds }`                          | 시작 화면 pin ID update 후                   |
| `windowUnpinFromStart`   | `{ itemId, pinnedIds, previousPinnedIds }`                          | 시작 화면 unpin ID update 후                 |
| `windowPinToTaskbar`     | `{ itemId, pinnedIds, previousPinnedIds }`                          | taskbar pin ID update 후                     |
| `windowUnpinFromTaskbar` | `{ itemId, pinnedIds, previousPinnedIds }`                          | taskbar unpin ID update 후                   |
| `windowsPinsReordered`   | `{ fromIndex, movedItemId, pinnedIds, previousPinnedIds, toIndex }` | 시작 화면 reorder ID update 후               |

`pinnedIds`와 `previousPinnedIds`는 해당 surface의 목록만 나타낸다. Stale item 자동 정리는 이
표의 event를 발생시키지 않는다.

## Public API

`@window/shell`은 Windows domain에 다음 API를 공개한다.

| API                                         | Responsibility                                      |
| ------------------------------------------- | --------------------------------------------------- |
| `Windows` / `WindowsProps`                  | Windows domain Provider 조합과 전역 경계 제공       |
| `useWindowEvent`                            | typed flat event 구독                               |
| `useWindowDispatch`                         | 상태 없는 open/location/context menu event dispatch |
| `useWindowSearch`                           | 현재 item의 derived 검색 결과                       |
| `WindowEventMap`과 관련 event/payload types | observer 및 dispatch 타입 계약                      |

pin consumer hook, internal `useWindowsEventsContext`와 `useWindowsItemsContext`, Provider context,
value hook, `usePinnedIdsState`, `UpdatePinnedIds`와 event registry는 package public API가 아니다.

## Provider Module API

Provider consumer hook은 소유 Provider의 모듈 루트에서 export하고 shell 내부 adapter와 다른
Provider가 이 경계를 통해 사용한다.

| Provider module         | Consumer API                                                              |
| ----------------------- | ------------------------------------------------------------------------- |
| `windowsEventsProvider` | `useWindowEvent`, `useWindowDispatch`, internal `useWindowsEventsContext` |
| `windowsItemsProvider`  | internal `useWindowsItemsContext`                                         |
| `taskbarPinsProvider`   | `useTaskbarPins` / `UseTaskbarPins`                                       |
| `windowsPinsProvider`   | `useWindowsPins` / `UseWindowsPins`                                       |
| `windowsPinsProvider`   | `useWindowPinAnimation` / `UseWindowPinAnimation`                         |

consumer는 Context나 개별 hook 파일을 직접 import하지 않는다. `useWindowPinAnimation`은
`WindowsItemsContext`도 소비하지만 Windows pin snapshot과 visual lifecycle을 소유하므로
`windowsPinsProvider` 모듈에 둔다. 이 hook은 두 Context의 결합 경계와 자체 오류 계약을 함께
소유하므로 `WindowsItemsContext`를 직접 읽는 명시적 예외다.

## Taskbar Adapter Policy

Taskbar 시작 panel은 Windows domain event를 직접 해석하지 않고 hook을 통해 연결한다.

- item 선택과 `open`/`openLocation` action: 현재 `TaskbarPanel.Root`의 `close()` 호출 후 해당
  event dispatch
- pin/unpin action: surface별 `useWindowsPins` 또는 `useTaskbarPins` 호출, panel은 열린 상태 유지
- context menu: native 기본 메뉴를 막고 `windowContextMenuRequested` dispatch 뒤 Context Menu를
  기존 panel 위에 표시한다. 위치 열기는 panel을 닫고, pin/unpin/reorder는 panel을 유지한다.

즉, Provider는 panel close 정책을 알지 못한다. Event를 일으키는 taskbar adapter가 현재 UI
interaction 순서를 결정하고, 앱 observer는 이미 발생한 semantic event만 처리한다.

## Superseded Contracts

다음 이름과 사용 방식은 폐기되었다.

- `PinProvider`, `usePins`, `useOptionalPins`
- app callback과 `pinnedItems`를 `TaskbarStartButton`까지 전달하는 props drilling
- `useWindowPinnedItems`, `UseWindowPinnedItemsResult`, `UseWindowPinsResult`
- target을 받아 Taskbar와 Windows를 같은 기능으로 취급한 `useWindowPins`, `WindowPinTarget`
- 실제 interaction이 없는 `taskbarPinsReordered` event와 Taskbar reorder/animation API
- 범용 `WindowStateCommitProducer`, patch와 render 이후 event queue
- action 종류를 payload 안에서 다시 분기하는 단일 `itemActionRequested` event
- `windowsItems`를 hook으로 직접 교체하는 `updateWindowsItems`
- 두 surface state를 합쳐 소유한 `useWindowPinState`
- Context에 노출한 `updateTaskbarPinnedIds`, `updateWindowsPinnedIds` raw updater
