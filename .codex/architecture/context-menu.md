# Context Menu Architecture

## Status

이 문서는 `@window/shell`의 전역 Context Menu Provider, trigger hook과 entry 계약에 대한 canonical
문서다. Context Menu의 Portal, browser lifecycle, action/submenu/separator 모델 또는 public API를
변경할 때 함께 갱신한다.

## Purpose

Taskbar, Desktop, Window Frame, Chrome과 Folder 같은 surface가 별도 Context Menu layer와 lifecycle을
반복하지 않도록 앱 React tree에 하나의 `ContextMenuProvider`를 둔다.

```tsx
<ContextMenuProvider>
  <Windows windowsItems={items}>
    <Desktop />
    <WindowFrames />
    <TaskbarPanel>{/* taskbar composition */}</TaskbarPanel>
  </Windows>
</ContextMenuProvider>
```

Provider는 Windows나 Taskbar domain에 의존하지 않는다. 같은 DOM document 안의 consumer만 단일
Portal Host를 공유하며 별도 document를 가진 실제 iframe은 이 계약에 포함하지 않는다.

## Ownership

| Layer                        | Owns                                                                               | Does not own                                  |
| ---------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------- |
| `@window/ui`                 | blocking layer, menu/submenu surface, action row, separator visual과 고정 semantic | active request, Portal, target, domain action |
| `@window/shell` Context Menu | 단일 active request, Portal, 위치, focus, keyboard, dismiss와 scroll lock          | Window pin, Folder action, app session        |
| surface consumer             | target별 entry, action 실행, semantic event와 ancestor close 정책                  | menu DOM 측정과 browser lifecycle             |

## Trigger Contract

각 surface는 같은 `useContextMenuTrigger<Target, ActionId>()`를 자신의 설정으로 호출한다.

```ts
interface UseContextMenuTriggerOptions<Target, ActionId extends string> {
  animated?: boolean;
  getEntries: (target: Target) => readonly ContextMenuEntry<ActionId>[];
  onAction: (actionId: ActionId, target: Target) => void;
  onClose?: (target: Target, reason: ContextMenuCloseReason) => void;
  onOpen?: (target: Target) => void;
}
```

반환 handler는 React contextmenu event와 실제 action target만 받는다. `pinned`, `all`, `search`처럼
surface 설정이 이미 아는 origin 값은 target에 추가하지 않는다.

```ts
handlePinnedContextMenu(event, item);
```

Origin을 Windows observer event에 전달해야 하면 해당 surface의 callback closure에서 literal로
제공한다.

## Entry Contract

`ContextMenuEntry<ActionId>`는 다음 세 종류의 discriminated union이다.

- `action`: typed ID, label, icon, disabled/selected, close와 focus 복원 정책
- `submenu`: 안정적인 key, label, icon, disabled와 재귀 entry 목록
- `separator`: 안정적인 key를 가진 비대화형 action group 경계

Action은 기본적으로 선택 직후 메뉴를 닫고 trigger focus를 복원한다. Ancestor panel까지 닫는 action은
`restoreFocus: false`, 메뉴를 유지해야 하는 action은 `closeOnSelect: false`를 명시한다.

Separator는 `role="separator"`이며 focus와 click 대상이 아니다. Submenu trigger는
`aria-haspopup="menu"`, `aria-expanded`, `aria-controls`로 하위 menu와 연결한다.

## Lifecycle

- 앱 React tree에는 논리적인 active Context Menu가 하나뿐이다.
- 새 요청은 기존 요청을 `replaced` 원인으로 닫고 focus를 복원하지 않는다.
- mouse 좌표는 그대로 사용하고 `(0, 0)` keyboard 요청은 trigger의 왼쪽 아래를 기준점으로 사용한다.
- 숨겨진 surface에서 실제 크기를 측정한 뒤 viewport 최소 여백 안으로 위치를 보정한다.
- root menu가 열리면 첫 활성 row에 focus한다.
- Arrow Up/Down, Home/End는 현재 menu level을 이동한다.
- Arrow Right는 submenu를 열고 첫 활성 row로 이동한다.
- Arrow Left는 현재 submenu를 닫고 parent trigger로 돌아간다.
- Escape와 backdrop은 topmost Context Menu만 닫는다.
- 열린 동안 menu 밖의 wheel과 touchmove를 막고 menu 내부 scroll은 허용한다.
- Consumer가 unmount되면 자신이 연 request만 focus 복원 없이 정리한다.

## Taskbar Window Item Consumer

Pinned, All과 Search는 별도 `useContextMenuTrigger` 설정을 사용한다.

- Pinned: reorder와 공통 location/pin action
- All: 공통 location/pin action
- Search: 공통 location/pin action, opening Motion 없음

세 surface 모두 target으로 `WindowItem`만 전달한다. `windowContextMenuRequested`,
`windowOpen`과 `windowOpenLocation`의 `source`는 각 callback이 자신의 literal을 전달한다.
