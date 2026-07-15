# Taskbar Layout

## Status

이 문서는 현재 `@window/ui` taskbar visual과 `@window/shell`의 시작 panel 조립 계약을 설명한다.
Windows item, pin, 검색과 observer의 canonical 계약은
[`windows-domain.md`](../architecture/windows-domain.md)를 따른다.

이전 문서의 미래 설계와 현재 구현을 혼합한 내용은 폐기했다. 아래에 명시한 컴포넌트와 연결만
현재 계약으로 간주한다.

## Purpose And Scope

포함:

- 하단 taskbar glass surface와 visual component 계층
- `TaskbarPanelHost`의 floating panel layer
- `TaskbarStartButton`과 시작 panel 조립
- 시작 panel의 검색, pinned/all, detail action interaction
- panel과 pinned item의 animation lifecycle

제외:

- Windows domain의 상태·event 상세 계약
- app의 window/session 생성과 활성화 정책
- desktop, folder viewer와 window chrome
- 원본에 없는 네트워크·볼륨·배터리 tray
- 아직 shell에서 조립하지 않은 search/hover/context taskbar 기능

## Source Evidence

현재 코드와 Storybook이 구현 상태의 source of truth다. 다음 원본 파일은 visual 의도와 metric을
추적하기 위한 역사적 근거이며 runtime API 근거로 사용하지 않는다.

- `/Users/seojaewan/Desktop/dev/blog/src/components/templates/bottomBar/index.tsx`
- `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/taskIconButton/index.tsx`
- `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/taskInput/index.tsx`
- `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/taskPanel/controller/index.tsx`
- `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/taskPanel/index.tsx`
- `/Users/seojaewan/Desktop/dev/blog/src/components/templates/windowsPanel/index.tsx`
- `/Users/seojaewan/Desktop/dev/blog/src/components/organisms/searchPanel/index.tsx`
- `/Users/seojaewan/Desktop/dev/blog/src/components/molecules/taskHoverPanel/index.tsx`

## Package Boundary

| Layer           | Owns                                                                                                | Does not own                                                |
| --------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `@window/ui`    | DOM structure, CSS, visual state props, accessible labels, Storybook states                         | Provider, browser state, portal registry, search/pin policy |
| `@window/shell` | Provider/hook 연결, panel registry, portal/placement, animation controller, semantic event dispatch | Taskbar CSS와 app의 window/session 실행                     |
| app             | `windowsItems`, event observer, 실제 window/session action                                          | 시작 panel 내부 props 조립과 pin persistence                |

## Current Composition

```tsx
import { TaskbarPanelHost, TaskbarStartButton, Windows } from "@window/shell";
import { TaskbarRoot } from "@window/ui";
import "@window/ui/styles.css";

<Windows windowsItems={items}>
  <TaskbarPanelHost>
    <TaskbarRoot>
      <TaskbarStartButton ref={startButtonRef} />
      {/* TaskbarSearch, TaskbarAppList, TaskbarClock 등 visual 조립 */}
    </TaskbarRoot>
  </TaskbarPanelHost>
</Windows>;
```

`TaskbarStartButtonProps`에는 선택적인 button `ref`만 있다. 시작 panel item, 검색 결과, pin 상태와
callback을 app이 button props로 전달하지 않는다.

## Component Tree

```text
Windows
└─ TaskbarPanelHost
   ├─ app composition
   │  └─ TaskbarRoot (@window/ui)
   │     └─ TaskbarStartButton (@window/shell)
   │        └─ TaskbarStartButtonUI (@window/ui)
   └─ TaskbarPanelLayerUI portal (@window/ui)
      └─ TaskbarPanelContainerUI (@window/ui)
         └─ TaskbarWindowPanel (@window/shell)
            └─ WindowsPanelUI (@window/ui)
               ├─ WindowsPanelUI.SearchInput
               ├─ WindowsPanelUI.View
               │  ├─ pinned view
               │  └─ all view + initial/category jump overlay
               └─ WindowsPanelUI.SearchResults
                  ├─ result list
                  └─ selected item detail/actions
```

## Implemented Component Map

### Functional shell

| Component/hook                      | Current responsibility                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `TaskbarPanelHost`                  | active panel ID, panel별 visual phase, portal layer, Escape close와 1초 transition watchdog     |
| `useTaskbarPanel`                   | trigger/panel ref, viewport placement, outside pointer close, animation 완료 전달과 portal 조립 |
| `TaskbarStartButton`                | 시작 button UI, accessible 연결, panel toggle과 `TaskbarWindowPanel` 조립                       |
| `TaskbarWindowPanel`                | query/detail/navigation 지역 상태와 Windows hooks를 `WindowsPanelUI`에 연결                     |
| `useWindowsPanelNavigation`         | pinned/all 전환, category overlay와 all-list scroll                                             |
| `useSearchResultDetail`             | 검색 결과의 현재 detail item 선택                                                               |
| `useTaskbarWindowPanelInteractions` | open/context/pin action을 panel host와 Windows domain에 연결                                    |

### Presentational UI

| Component                 | Current visual responsibility                                               |
| ------------------------- | --------------------------------------------------------------------------- |
| `TaskbarRoot`             | fixed bottom glass surface와 가운데 정렬                                    |
| `TaskbarStartButtonUI`    | Windows logo와 selected visual, 고정 accessible name `시작`                 |
| `TaskbarPanelLayerUI`     | taskbar 아래 stacking의 viewport-fixed pointer-transparent layer            |
| `TaskbarPanelContainerUI` | fixed position과 `opening/open/closing` visual, inactive phase의 inert 처리 |
| `TaskPanel`               | 600px 높이의 공통 glass panel surface                                       |
| `WindowsPanelUI`          | 시작 dialog와 search/view/result compound layout                            |
| `WindowsPanelView`        | pinned/all 화면, category jump와 pinned tile animation class                |
| `TaskSearchResultView`    | 검색 결과 list와 선택 item detail/action pane                               |
| `TaskSearchInput`         | 30px pill input과 focus search-icon visual                                  |

`@window/ui`에는 `TaskbarSearch`, `TaskbarAppList`, `TaskbarTaskButton`, `TaskbarClock`,
`SearchPanel`, `TaskHoverPanel`, `TaskbarContextMenu` 등의 visual도 공개되어 있다. 현재
`@window/shell` public API가 이들의 app behavior를 조립한다고 간주하지 않는다.

## Taskbar Visual Contract

### Root

- viewport 하단에 `position: fixed`
- `50px` 높이, `100vw` 너비, 좌우 중앙 정렬과 `12px` gap
- 흰색 기반 gradient, `18px` blur/saturation, 상단 border와 shadow
- taskbar z-index `2147483647`
- floating panel layer z-index `2147483646`

### Start button

- `40px × 40px` large icon button
- Windows logo visual `30px`
- panel이 논리적으로 열려 있으면 selected background와 accent color
- accessible name은 UI가 `시작`으로 고정
- shell은 `aria-controls`, `aria-expanded`, `aria-haspopup="dialog"`를 연결

### Start panel

- 공통 `TaskPanel` 높이 `600px`
- 모바일 `100vw`, `768px` 이상 `50vw`, `1280px` 이상 `30vw`
- panel 내부 padding은 상단·좌우 `20px`, 본문 font size `14px`
- 검색 input 기본 placeholder는 `앱 및 문서 검색`
- pinned grid는 6열
- all view는 제목 첫 글자를 기준으로 section을 만들고, 한글은 초성 key를 사용
- 검색 결과는 list와 detail pane을 나란히 표시하며 현재 입력 순서를 유지

### Icon policy

- 일반 taskbar/panel action icon은 `@fluentui/react-icons`를 사용한다.
- Windows logo 같은 brand icon은 별도 asset을 사용한다.
- item의 `icon`이 없으면 공용 file asset visual을 사용한다.

## Panel Lifecycle

`TaskbarPanelHost`는 한 host에서 논리적인 active panel 하나를 유지한다. Panel 교체 시 기존
panel의 closing과 새 panel의 opening은 동시에 존재할 수 있다.

```text
button click
→ TaskbarPanelHost.openPanel/toggle
→ useTaskbarPanel이 trigger 기준 위치 측정
→ TaskbarPanelLayerUI에 portal
→ TaskbarPanelContainerUI opening
→ animation 완료 후 open
→ close 요청 시 activePanelId 즉시 null + closing visual 유지
→ animation 완료 후 unmount
```

- `opening`: 220ms, 아래에서 올라오며 fade in
- `closing`: 200ms, 아래로 내려가며 fade out
- transition 중 추가 open/close 요청은 무시한다.
- animation event가 누락되면 host의 1초 watchdog이 transition lock을 정리한다.
- Escape와 panel/trigger 바깥 pointer는 열린 panel을 닫는다.
- 세부 reducer와 DOM event 규칙은
  [`taskbar-panel-transition.md`](../rules/taskbar-panel-transition.md)를 따른다.

## Start Panel State

`TaskbarWindowPanel`이 다음 상태를 지역적으로 소유한다.

- search input value
- 검색 detail item
- pinned/all view
- category overlay open state와 all-list ref

`Windows`가 전역으로 소유하는 것은 `windowsItems`, `windowsPinnedIds`,
`taskbarPinnedIds`와 observer registry다. Panel query나 detail selection은 Provider에 저장하지
않는다.

검색어가 공백을 제외하고 비어 있으면 pinned/all view를 표시한다. 검색어가 있으면
`useWindowSearch` 결과와 detail pane을 표시한다. 검색 기준은
[`windows-domain.md`](../architecture/windows-domain.md#search-contract)에 정의한다.

## Item Interaction

| Interaction                 | Panel     | Windows domain effect                                    |
| --------------------------- | --------- | -------------------------------------------------------- |
| pinned/all/search item 선택 | 먼저 닫음 | `windowOpen` dispatch                                    |
| detail `open`               | 먼저 닫음 | `windowOpen` dispatch                                    |
| detail `openLocation`       | 먼저 닫음 | `windowOpenLocation` dispatch                            |
| detail start pin/unpin      | 유지      | `useWindowsPins()` update                                |
| detail taskbar pin/unpin    | 유지      | `useTaskbarPins()` update                                |
| item context menu           | 유지      | native menu를 막고 `windowContextMenuRequested` dispatch |

검색 상세 action은 모든 item에 다음 순서로 고정한다.

1. `openLocation`
2. 현재 상태에 따른 `pinToStart` 또는 `unpinFromStart`
3. 현재 상태에 따른 `pinToTaskbar` 또는 `unpinFromTaskbar`

기본 item 선택 자체가 open 동작이므로 detail action list에 별도 `open` row를 추가하지 않는다.

## Pinned Item Lifecycle

Pinned item reorder와 stale item snapshot은 `useWindowPinAnimation()`이 관리한다.

```text
`useWindowPinAnimation.reorder` 호출
→ 대상 tile out transition
→ transition 완료 후 `useWindowsPins.applyReorder`
→ 새 위치에서 in animation
→ animation 완료
```

- out은 `transform` 500ms transition을 사용한다.
- in은 `wb-windows-fade-in` 150ms animation을 사용한다.
- 현재 transition 중이거나 stale item 정리 중이면 새 reorder를 시작하지 않는다.
- item이 `windowsItems`에서 사라지면 pin ID와 storage는 즉시 정리하고 마지막 visual snapshot만
  out 완료까지 유지한다.
- DOM event가 누락되면 500ms watchdog이 현재 단계의 완료를 보장한다.
- 현재 production UI에는 reorder를 시작하는 drag/drop, 이동 button 또는 keyboard interaction이 없다.
  Hook API를 실제 UI에 연결하는 작업은
  [`windows-pinned-reorder-interaction.md`](../todo/windows-pinned-reorder-interaction.md)에서 추적한다.

## Accessibility

- `TaskbarRoot`는 `nav` element다.
- 시작 button은 `aria-expanded`와 `aria-controls`로 dialog와 연결한다.
- 시작 panel은 고정 accessible name `시작`의 `role="dialog"`다.
- closing panel은 `aria-hidden`, open 이외의 visual phase는 `inert`다.
- pinned/all의 비활성 view와 category overlay 뒤의 list에도 `inert`를 사용한다.
- UI가 소유하는 고정 label을 app callback/props로 다시 주입하지 않는다.

## Superseded Contracts

다음 계약은 현재 구조에서 사용하지 않는다.

- `TaskbarPanelProvider`, `TaskbarPanelController`
- `PinProvider`, `usePins`, `useOptionalPins`, `usePinnedReorder`
- `TaskbarStartIconButton`을 별도 shell wrapper로 두는 구조
- `TaskbarStartButton`의 `icon`, `label`, `panel`, `placement`, item/callback props
- app이 `pinnedItems`, `results`, detail callback을 시작 button까지 전달하는 구조
- `TaskbarStartButton` 또는 Provider가 app의 실제 window open 동작을 직접 실행하는 구조

새 기능은 이 이름들을 복원하지 않고 `Windows` hooks와 `TaskbarPanelHost` 경계에 맞춰 조립한다.
