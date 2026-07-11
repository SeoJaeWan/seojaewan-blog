# Taskbar Layout Model

## Purpose

`taskbar`는 원본 `blog` 프로젝트의 Windows 11 스타일 하단 작업 표시줄을 새 `window-blog` 구조에 맞게 다시 설계하기 위한 UI 모델이다.

원본 코드를 그대로 옮기기보다, 먼저 컴포넌트 책임과 관계를 고정해 이후 구현 변동을 줄인다.

## Source Evidence

- 원본 taskbar root: `/Users/seojaewan/Desktop/dev/blog/src/components/templates/bottomBar/index.tsx`
- 원본 taskbar icon: `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/taskIconButton/index.tsx`
- 원본 search input: `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/taskInput/index.tsx`
- 원본 panel controller: `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/taskPanel/controller/index.tsx`
- 원본 panel shell: `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/taskPanel/index.tsx`
- 원본 start panel: `/Users/seojaewan/Desktop/dev/blog/src/components/templates/windowsPanel/index.tsx`
- 원본 search panel: `/Users/seojaewan/Desktop/dev/blog/src/components/organisms/searchPanel/index.tsx`
- 원본 hover preview: `/Users/seojaewan/Desktop/dev/blog/src/components/molecules/taskHoverPanel/index.tsx`

## Scope

이 문서는 taskbar의 UI 구조와 관계만 다룬다.

포함:

- 하단 taskbar layout
- taskbar icon button 계열
- search input
- taskbar에서 열리는 floating panel
- start/search/hover/context panel 관계
- active/inactive/default indicator
- 원본 animation과 interaction 요구사항

제외:

- 실제 구현 코드
- window/session store 상세 구현
- Notion 콘텐츠 로딩
- desktop wallpaper, window control, folder/file viewer 구현
- 원본에 없는 네트워크/볼륨/배터리 tray

## Implemented UI (packages/ui)

`packages/ui/src/components/base`와 `packages/ui/src/components/taskbar`에 구현된 presentational 컴포넌트와 이 문서의 설계 이름 매핑:

| 문서 설계 이름 | 구현 이름 | 비고 |
| --- | --- | --- |
| `TaskbarPanel` | `TaskPanel` | 원본명 유지. `state: "open" \| "closed"` + `task-up/task-down` 애니메이션, 닫힘은 `onAnimationEnd`에서 소비자가 언마운트 |
| `StartPanel` | `WindowsPanel` | 원본명 유지. `pinnedItems`, `sections`, `defaultView`, `onSelectItem`, `searchInputProps` props. 고정됨/모두 뷰 전환과 카테고리 오버레이는 내부 상태 |
| `StartPinnedView` / `StartAllView` | `WindowsPanel` 내부 뷰 | 별도 export 없음. 고정 타일은 `PanelIconButton` 재사용(패널 스코프 CSS 오버라이드) |
| `SearchPanel` | `SearchPanel` | `recommendedItems`, `bestSections`, `results`, `searchValue`, `onSelectItem`, `onDetailAction` props. 검색어 유무로 추천/결과 뷰 전환, 상세 pane 선택은 내부 상태 |
| `TaskItemContextMenu` | `ContextMenuPanel` | 원본 `LeftClickPanel`의 200px 플로팅 컨테이너. row는 `ContextMenuButton`을 그대로 children으로 받고 패널 스코프 CSS로 원본 metric(28px row, 14px text)에 맞춤 |
| `TaskbarContextMenu` | `TaskbarContextMenu` | 원본 `TaskLeftClickPanel`. `TaskPanel` 기반 300px, `tasks`(작업 섹션) + children(액션 row) |
| `TaskbarHoverPreview` | `TaskHoverPanel` | 원본명 유지. `items`(icon/title/`preview` slot) + `onSelectItem/onCloseItem`. 폭 `min(80vw, n*200px)` grid, 썸네일 hover 시 닫기 버튼. preview에는 `ScaledPreview` + `WindowFrame(overrideFullscreen)`을 주입한다 |
| `TaskbarAppButton` | `TaskbarTaskButton` | `TaskbarIconButton` + 두 개의 `useTaskbarPanelController` 조합. hover 1000ms 유지 → `renderHoverPanel`, 우클릭 → `renderContextMenu`, `multiSession` 클릭 시 hover panel 즉시 오픈. hover/context group은 서로를 닫는다 |
| `TaskbarAppList` | `TaskbarAppList` | 데이터(items: sessions/tasks/pinned/state) 기반 목록. `TaskHoverPanel`/`TaskbarContextMenu` 조립을 UI가 소유하고 앱은 액션 콜백만 넘긴다 |
| `TaskbarClock` | `TaskbarClock` | `value: Date`(앱이 10초 tick 주입) → `오후 h:mm` + `YYYY-MM-DD`(Intl), 없으면 skeleton |
| `TaskSearchResultView` | `TaskSearchResultView` | 원본 `TaskSearchResult`. 최적의 일치 + 상세 pane. `SearchPanel`과 `WindowsPanel`(searchValue 입력 시)이 공유 |
| `TaskbarStartButton` | `TaskbarStartButton` | 원본 `WindowsButton`. `TaskbarStartIconButton`을 흡수해 visual(30px logo + open selected)과 패널 컨트롤러를 함께 소유 — `taskbar/button/`에 위치 |
| 고정 상태 공유 | `PinProvider` (`components/root/pinProvider`) | 원본 `windowsStore`(시작 고정, 순서) + `taskbarStore`(작업 표시줄 고정). 상태 로직은 `usePinState`가 소유하고 provider는 context 배포만 담당. `usePins()`/`useOptionalPins()` 훅으로 읽고 조작. taskbar·folder·desktop이 공유하고 앱 root에서 마운트하므로 `components/root/`에 둔다 |
| `TaskItemContextMenu` (커서 위치) | `usePinItemMenu` (`components/root/pinProvider/hooks`) | 원본 `TaskSearchLeftPanel` + `TaskWindowsLeftPanel` + `FolderFileLeftPanel` + `FolderCategoryLeftPanel`. 파일/카테고리가 어디서 우클릭되든(시작·검색 패널, 폴더 파일 카드, 사이드바, 데스크톱 아이콘) 같은 액션. `openLabel`/`openIcon`으로 "파일 실행"↔"새창에서 열기" 분기, `renderExtraActions`로 folder "다음으로 공유" 주입. 고정/이동 row가 이 메뉴의 도메인이라 pinProvider의 훅으로 colocate — 커서 위치/portal은 `useContextMenuController`(`components/controllers`)가 담당. taskbar app button은 task-panel 메뉴(`TaskbarContextMenu`)에 열기/시작 화면 고정 row를 직접 넣는다 |
| 고정됨 reorder 애니메이션 | `usePinnedReorder` | 원본 `usePanelWindows` + `windows-fadeIn`. 이동 요청 → 대상 타일 축소(out) → transitionend에서 순서 반영 → 새 위치 fade-in(in). 진행 중이면 새 요청 무시 |
| WindowsPanel 뷰 상태 | `useWindowsPanelViews` | 고정됨↔모두 전환 + 카테고리 점프 오버레이 상태/스크롤 |
| 서브 메뉴 위치 계산 | `useSubPanelPlacement` | 원본 `LeftSubPanel` mount 측정. 부모 오른쪽/아래 기준 + 화면 경계 플립 (`base/menu/contextMenuSubPanel`) |

각 훅에는 정상 동작과 금지 상황(중복 고정, 경계 밖 이동, 애니메이션 중 재요청, 포커스 뺏기 등)을 검증하는 한글 단위 테스트가 있다.

훅 파일 위치 규칙: 컴포넌트/provider 전용 훅은 그 폴더 안 `hooks/` 서브폴더에 둔다(원본 blog의 `sessionControlBar/hooks/` 패턴). 대부분 단일 컴포넌트 전용이므로 colocation을 유지하되 `index.tsx`와 훅 파일을 섞지 않는다. 예: `windowsPanel/hooks/usePinnedReorder.ts`, `root/taskbarPanelProvider/hooks/useTaskbarPanelController.tsx`, `root/pinProvider/hooks/usePinItemMenu.tsx`, `windowFrame/hooks/useWindowBounds.ts`.

`base`에는 여러 UI 영역이 조립해서 쓰는 최소 단위(`IconButton`, `ContextMenuButton`, `ContextMenuPanel`, `TaskPanel`)만 둔다. taskbar에서 열리거나 Windows taskbar 경험에 묶인 컴포넌트(`TaskbarRoot`, `TaskbarSearch`, `WindowsPanel`, `SearchPanel`, `TaskbarContextMenu` 등)는 `components/taskbar` 아래에 둔다. 단 `TaskbarPanelProvider`는 소비자가 taskbar여도 앱 root에서 마운트해야 하므로 `components/root/`에 둔다.

폴더 규칙: 각 영역 **루트에는 앱(또는 상위 조립)이 직접 배치하는 단위**(Component Tree의 1-depth — `TaskbarRoot`, `TaskbarSearch`, `TaskbarAppList`, `TaskbarClock`)를 두고, **다른 컴포넌트의 재료로만 쓰이는 부품은 종류(kind) 폴더**(`button/`, `panel/`, `input/`)에 둔다. `base`는 kind 폴더(`button/`, `menu/`, `panel/`)만 가진다. 예외: `TaskbarStartButton`은 버튼 계열 모아보기를 위해 `button/`에 둔다. **앱 root에서 전체를 감싸야 하는 provider**(`pinProvider`, `taskbarPanelProvider`)와 통합 root 조립(스토리)은 `components/root/`에, **provider 없이 어디서든 쓰는 headless 상호작용 컨트롤러**(`contextMenuController`)는 `components/controllers/`에 둔다.

모두(All) 뷰의 그룹 키는 콘텐츠 카테고리가 아니라 원본 `useMixList.sortList`처럼 제목 첫 글자(한글 초성/영문 대문자) 인덱스다. 카테고리 오버레이는 이 한 글자 키의 점프 그리드다.

## Component Tree

```tsx
<TaskbarPanelProvider>
  <TaskbarRoot>
    <TaskbarStartButton />
    <TaskbarSearch />
    <TaskbarAppList>
      <TaskbarAppButton />
    </TaskbarAppList>
    <TaskbarClock />
  </TaskbarRoot>

  {/* Floating panels rendered by provider */}
  <TaskPanel>
    <WindowsPanel />
    <SearchPanel />
    <TaskbarHoverPreview />
    <TaskbarContextMenu />
  </TaskPanel>
</TaskbarPanelProvider>
```

`TaskbarRoot`와 glass surface는 같은 역할로 본다. 별도 `TaskbarSurface` 컴포넌트를 만들지 않고, root가 fixed layout과 glass visual을 함께 책임진다.

## Root Composition

Root 기준 연결은 다음처럼 본다.

```txt
Taskbar
- TaskbarPanelProvider
  - TaskbarRoot
    - TaskbarStartButton
      - IconButton
    - TaskbarSearch
      - TaskSearchInput
    - TaskbarAppList
      - TaskbarAppButton[]
        - TaskbarIconButton
          - IconButton
    - TaskbarClock
  - TaskbarPanelLayer
    - TaskPanel
      - WindowsPanel
        - TaskSearchInput
        - pinned view (내부)
          - PanelIconButton[]
        - all view (내부)
          - 초성/첫 글자 그룹 row + 카테고리 오버레이
        - TaskSearchResultView (searchValue 입력 시)
        - ContextMenuPanel
      - SearchPanel
        - 추천/최고의 블로그글·프로젝트 뷰 (내부)
        - 최적의 일치 + 상세 pane (내부)
        - ContextMenuPanel
      - TaskbarHoverPreview
        - WindowPreviewTile[]
      - TaskbarContextMenu
        - ContextMenuButton[]
```

`Taskbar`는 조립용 facade로 둘 수 있다. 실제 fixed layout은 `TaskbarRoot`가 담당하고, floating panel registry는 `TaskbarPanelProvider`가 담당한다.

## Component Connection Map

### Taskbar

역할:

- app에서 가장 쉽게 가져다 쓰는 top-level taskbar component
- provider, root, visible controls를 조립한다.
- app state와 UI component 사이의 adapter 역할을 할 수 있다.

children:

- `TaskbarPanelProvider`
- `TaskbarRoot`

사용 방식:

```tsx
<Taskbar
  items={taskbarItems}
  activeItemId={activeCategory}
  clock={now}
  searchValue={searchValue}
  onSearchChange={setSearchValue}
  onStartOpen={openStartPanel}
  onSearchOpen={openSearchPanel}
  onItemOpen={openTaskbarItem}
  onItemContextMenu={openTaskbarContextMenu}
/>
```

초기 구현에서는 위처럼 큰 facade를 만들기보다, 아래의 explicit composition을 먼저 사용해도 된다.

### TaskbarPanelProvider

역할:

- `TaskbarRoot`와 panel layer를 같은 context 안에 묶는다.
- taskbar root ref를 panel positioning에 제공한다.
- opened panel descriptor를 portal layer에 렌더링한다.

children:

- `TaskbarRoot`
- 내부적으로 `TaskbarPanelLayer`

사용 방식:

```tsx
<TaskbarPanelProvider>
  <TaskbarRoot>{/* visible controls */}</TaskbarRoot>
</TaskbarPanelProvider>
```

### TaskbarRoot

역할:

- fixed bottom layout과 glass surface를 동시에 담당한다.
- visible taskbar controls의 직접 부모다.

children:

- `TaskbarStartButton`
- `TaskbarSearch`
- `TaskbarAppList`
- `TaskbarClock`

사용 방식:

```tsx
<TaskbarRoot>
  <TaskbarStartButton panel={StartPanel} />
  <TaskbarSearch value={searchValue} onValueChange={setSearchValue} panel={SearchPanel} />
  <TaskbarAppList items={taskbarItems} />
  <TaskbarClock value={now} />
</TaskbarRoot>
```

### TaskbarStartButton

역할:

- `StartPanel`을 여는 button controller다.
- visible UI는 `TaskbarStartIconButton`에 위임한다.

children:

- 직접 children을 받기보다 `icon`, `label`, `panel` props를 받는 방식이 적합하다.

사용 방식:

```tsx
<TaskbarStartButton icon={<WindowsLogo />} label="시작" panel={StartPanel} placement="rootCenter" />
```

내부 연결:

```txt
TaskbarStartButton
- useTaskbarPanelController(StartPanel, { placement: "rootCenter" })
- IconButton (Windows logo 30px + open selected visual 직접 소유)
```

### TaskbarSearch

역할:

- search trigger와 input을 묶는다.
- `SearchPanel`을 여는 controller다.

children:

- `TaskSearchInput`

사용 방식:

```tsx
<TaskbarSearch
  value={searchValue}
  placeholder="검색"
  panel={SearchPanel}
  placement="left"
  onValueChange={setSearchValue}
  onCloseComplete={resetSearchValue}
/>
```

내부 연결:

```txt
TaskbarSearch
- useTaskbarPanelController(SearchPanel, { placement: "left", group: "search" })
- trigger button
- TaskSearchInput
  - animated search icon
```

### TaskbarAppList

역할:

- pinned category와 opened session을 합쳐 표시할 taskbar item list를 만든다.
- 표시 순서를 보장한다.

children:

- `TaskbarAppButton[]`

사용 방식:

```tsx
<TaskbarAppList
  items={[
    {
      id: "blog",
      label: "블로그",
      icon: <FolderIcon />,
      state: "active",
      pinned: true,
      running: true,
      multiSession: true,
    },
    {
      id: "project",
      label: "프로젝트",
      icon: <FolderIcon />,
      state: "default",
      pinned: true,
      running: false,
      multiSession: false,
    },
  ]}
  onItemClick={handleTaskbarItemClick}
  onItemContextMenu={handleTaskbarItemContextMenu}
  renderHoverPreview={(item) => <TaskbarHoverPreview item={item} />}
  renderContextMenu={(item) => <TaskbarContextMenu item={item} />}
/>
```

내부 연결:

```txt
TaskbarAppList
- item visibility calculation
- TaskbarAppButton
  - TaskbarIconButton
    - IconButton
```

### TaskbarAppButton

역할:

- taskbar item 하나의 interaction boundary다.
- `TaskbarIconButton`에 visual state를 전달한다.
- click, hover, context menu를 panel controller와 연결한다.

children:

- 직접 children보다 `item` props를 받는 방식이 적합하다.

사용 방식:

```tsx
<TaskbarAppButton
  item={{
    id: "blog",
    label: "블로그",
    icon: <FolderIcon />,
    state: "inactive",
    running: true,
    multiSession: false,
  }}
  onClick={() => activateOrOpenCategory("blog")}
  hoverPreview={<TaskbarHoverPreview category="blog" />}
  contextMenu={<TaskbarContextMenu category="blog" />}
/>
```

내부 연결:

```txt
TaskbarAppButton
- click controller
- hover preview controller
- context menu controller
- TaskbarIconButton
  - IconButton
  - RunningIndicator
```

### TaskbarIconButton

역할:

- taskbar button의 순수 visual wrapper다.
- `default | inactive | active` indicator를 표현한다.

children:

- `IconButton`
- `RunningIndicator`

사용 방식:

```tsx
<TaskbarIconButton
  icon={<FolderIcon />}
  label="블로그"
  state="active"
  open={false}
  disabled={false}
/>
```

내부 연결:

```txt
TaskbarIconButton
- IconButton
- RunningIndicator, only when state !== "default"
```

### IconButton

역할:

- icon 계열 버튼의 최하위 visual primitive다.
- taskbar, start button, panel tile이 모두 공유할 수 있다.

children:

- icon slot

비책임:

- taskbar indicator
- 화면에 보이는 title/label 배치
- panel open/close
- context menu
- start/search/session 의미

사용 방식:

```tsx
<IconButton icon={<FileIcon />} label="게시글 열기" selected={false} />
```

사용처:

- `TaskbarStartIconButton`
- `TaskbarIconButton`
- `PanelIconButton`
- 필요하면 start/search panel의 item button

### ContextMenuButton

역할:

- context menu와 action row에서 쓰는 icon + text command button이다.
- 파일/폴더 tile이나 taskbar icon과 다른 row layout을 책임진다.
- `IconButton`이 아니라 command row 자체의 버튼 semantics를 가진다.

비책임:

- taskbar indicator
- panel tile line clamp
- context menu open/close controller

사용 방식:

```tsx
<ContextMenuButton icon={<FolderIcon />} label="파일 위치 열기" onClick={openFolder} />
```

관계:

```txt
TaskbarContextMenu
- ContextMenuButton[]
```

### PanelIconButton

역할:

- panel 내부의 icon + title item이다.
- `IconButton`을 재사용하되 taskbar indicator는 없다.

사용 방식:

```tsx
<PanelIconButton
  icon={<FileIcon />}
  title="React Server Components 정리"
  lines={2}
  onClick={openFile}
  onContextMenu={openItemContextMenu}
/>
```

내부 연결:

```txt
PanelIconButton
- IconButton
- visible title
```

### TaskbarClock

역할:

- time/date 표시 전용 leaf component다.

사용 방식:

```tsx
<TaskbarClock value={now} timeFormat="A h:mm" dateFormat="YYYY-MM-DD" timezone="Asia/Seoul" />
```

초기에는 component 내부에서 interval을 가져도 되지만, 테스트와 hydration 안정성을 위해 app에서 formatted value를 주입하는 방식도 고려한다.

## Full Usage Sketch

아래 예시는 실제 구현 코드가 아니라 컴포넌트 관계를 보여주는 사용 스케치다.

```tsx
const DesktopTaskbar = () => {
  const taskbarItems = useTaskbarItems();
  const search = useTaskbarSearch();
  const clock = useTaskbarClock();

  return (
    <TaskbarPanelProvider>
      <TaskbarRoot>
        <TaskbarStartButton
          icon={<WindowsLogo />}
          label="시작"
          panel={StartPanel}
          placement="rootCenter"
        />

        <TaskbarSearch
          value={search.value}
          placeholder="검색"
          panel={SearchPanel}
          placement="left"
          onValueChange={search.setValue}
          onCloseComplete={search.reset}
        />

        <TaskbarAppList
          items={taskbarItems}
          onItemClick={(item) => {
            if (item.running) {
              activateCategory(item.id);
              return;
            }
            openCategoryFolder(item.id);
          }}
          renderItem={(item) => (
            <TaskbarAppButton
              item={item}
              hoverPreview={<TaskbarHoverPreview category={item.id} />}
              contextMenu={<TaskbarContextMenu category={item.id} />}
            />
          )}
        />

        <TaskbarClock value={clock.value} />
      </TaskbarRoot>
    </TaskbarPanelProvider>
  );
};
```

## Panel Usage Sketch

Start panel 안에서는 taskbar primitive를 그대로 쓰지 않고, panel용 tile을 사용한다.

```tsx
const StartPinnedView = ({ items, onOpen, onContextMenu }: StartPinnedViewProps) => (
  <section>
    <div>
      <h2>고정됨</h2>
      <button type="button">모두</button>
    </div>

    <div role="list">
      {items.map((item) => (
        <PanelIconButton
          key={item.id}
          icon={item.icon}
          title={item.title}
          lines={2}
          onClick={() => onOpen(item)}
          onContextMenu={(event) => onContextMenu(event, item)}
        />
      ))}
    </div>
  </section>
);
```

Search input은 taskbar와 panel에서 같은 component를 사용한다.

```tsx
<TaskSearchInput
  value={query}
  placeholder="앱 및 문서 검색"
  onChange={(event) => setQuery(event.currentTarget.value)}
/>
```

## Visible Taskbar Components

### TaskbarRoot

역할:

- 하단 고정 taskbar container
- glass surface
- 내부 요소 정렬
- taskbar panel positioning의 기준 root

배치:

- `position: fixed`
- `bottom: 0`
- `left: 0`
- `width: 100vw`
- 원본 높이는 약 `50px`
- 내부 요소는 중앙 정렬
- clock은 오른쪽 절대 배치 가능

시각:

- Windows 11 light glass
- translucent white/gradient background
- backdrop blur
- top border
- elevated shadow
- selection 방지

관계:

- `TaskbarPanelProvider` 내부에 있어야 한다.
- `TaskbarStartButton`, `TaskbarSearch`, `TaskbarAppList`, `TaskbarClock`을 직접 배치한다.
- panel positioning에서 root height를 사용한다.

### TaskbarStartButton

역할:

- Start menu, 원본명 `WindowsPanel`, 를 여는 taskbar button

UI:

- Windows logo icon
- 40x40 icon button
- desktop 이상에서 표시
- panel open 상태에서는 selected/open 배경 표시

동작:

- click: start panel open/close toggle
- Escape: open panel close
- outside click: open panel close

관계:

- 내부 UI는 `TaskbarStartIconButton` 사용
- panel은 `TaskbarPanelProvider`를 통해 `StartPanel`로 렌더링
- placement는 원본 기준 `rootCenter`

### TaskbarSearch

역할:

- taskbar 검색 entry
- Search panel을 여는 trigger

UI:

- rounded pill search input
- placeholder: `검색`
- desktop 이상에서 표시
- 닫힌 상태에서는 trigger button이 input 위에 올라가 클릭을 받음
- 열린 상태에서는 input이 enabled 되고 직접 입력 가능

동작:

- click: `SearchPanel` open
- input change: search query update
- Escape/outside click: panel close
- close animation 종료 후 query reset 가능

관계:

- 내부 input은 `TaskSearchInput` 사용
- panel은 `TaskbarPanelProvider`를 통해 `SearchPanel`로 렌더링
- placement는 원본 기준 `left`

### TaskbarAppList

역할:

- taskbar에 표시할 category/app button 목록을 계산하고 렌더링

원본 category:

- `blog`
- `project`
- `coding`
- `about`

표시 조건:

- pinned 상태이면 표시
- pinned가 아니어도 해당 category에 열린 session이 있으면 표시

정렬:

- 원본 `Categories` 상수 순서를 유지

동작:

- app button click:
  - 열린 session이 있으면 해당 category의 첫 session을 active로 변경
  - 열린 session이 없으면 folder session 생성
  - multi-session이면 hover preview를 열 수 있음

관계:

- `TaskbarAppButton` 목록을 렌더링
- pinned/open session 계산은 app layer state에서 받고, UI package primitive에 직접 묶지 않는다.

### TaskbarAppButton

역할:

- taskbar에 표시되는 category/app icon button
- taskbar 상태 indicator 표시
- taskbar 전용 interaction 연결 지점

UI:

- 40x40 button
- 30x30 icon
- rounded hover background
- active press scale
- 하단 running indicator

상태:

- `default`: 열린 session 없음, indicator 없음
- `inactive`: 열린 session은 있으나 현재 active 아님, 6px gray indicator
- `active`: 현재 active category, 12px blue indicator
- `disabled`: drag 중이거나 interaction 제한 시
- `open`: 관련 context/hover panel이 열린 상태

동작:

- click: open/create/activate behavior 실행
- hover: 열린 session이 있으면 지연 후 hover preview open
- context menu: category context menu open
- mobile: hover/context 동작을 제한하고 click 중심으로 동작

관계:

- UI는 `TaskbarIconButton` 사용
- `TaskbarIconButton`은 다시 `IconButton`을 사용할 수 있다.
- hover/context panel은 button 내부 UI가 아니라 controller layer에서 연다.

### TaskbarClock

역할:

- taskbar 오른쪽 시간/날짜 표시

UI:

- desktop 이상에서 표시
- 오른쪽 정렬
- 2줄 텍스트
- 원본 형식:
  - `A h:mm`
  - `YYYY-MM-DD`

동작:

- 10초 단위 update
- hydration 전 skeleton 표시

관계:

- taskbar flow에서 제외하고 absolute right 영역으로 둘 수 있다.
- 원본에는 notification center 연동이 없다.

## Icon Set Policy

기본 UI icon set은 `@fluentui/react-icons`를 사용한다.

채택 이유:

- Windows 11 / Fluent 계열 UI와 시각 언어가 잘 맞는다.
- taskbar, panel, context action에 필요한 일반 action/object icon을 같은 스타일로 맞출 수 있다.
- React component 형태로 가져와 `IconButton` 계층에 주입하기 쉽다.

사용 범위:

- taskbar action icon
- search icon 후보
- panel tile icon
- context panel/action menu icon
- start/search panel의 command icon
- close, pin, open, folder, arrow 같은 일반 UI action

예외:

- Windows logo 같은 brand icon은 `@fluentui/react-icons`에 기대지 않고 별도 asset으로 관리한다.
- category folder/file icon은 Fluent icon을 우선 검토하되, 원본의 bitmap/app-like icon 느낌이 필요하면 별도 asset을 허용한다.
- 콘텐츠 썸네일이나 실제 preview는 icon set이 아니라 app data/rendered preview를 사용한다.

크기 기준:

- taskbar icon: `24Regular` 또는 asset을 30px 영역에 배치
- start/search panel tile icon: `24Regular`, `28Regular`, `32Regular` 중 tile density에 맞춰 선택
- context/action row icon: `16Regular` 또는 `20Regular`
- close button: `Dismiss16Regular` 또는 `Dismiss20Regular`

예상 import:

```tsx
import {
  ArrowLeft20Regular,
  ArrowRight20Regular,
  Dismiss20Regular,
  FolderOpen20Regular,
  Open20Regular,
  Pin20Regular,
  PinOff20Regular,
  Search24Regular,
} from "@fluentui/react-icons";
```

Context action mapping:

```txt
파일 실행            -> Open20Regular or Document20Regular
파일 위치 열기       -> FolderOpen20Regular
시작 화면에 고정     -> Pin20Regular
시작 화면에서 제거   -> PinOff20Regular
작업 표시줄에 고정   -> Pin20Regular
작업 표시줄에서 제거 -> PinOff20Regular
모든 창 닫기         -> Dismiss20Regular
왼쪽으로 이동        -> ArrowLeft20Regular
오른쪽으로 이동      -> ArrowRight20Regular
앞으로 이동          -> ArrowUpLeft20Regular 후보
```

사용 방식:

```tsx
<IconButton icon={<Search24Regular />} label="검색" />

<PanelIconButton
  icon={<FolderOpen20Regular />}
  title="파일 위치 열기"
  lines={1}
/>

<ContextMenuButton
  icon={<Pin20Regular />}
  label="작업 표시줄에 고정"
/>
```

## Shared Button Primitives

### IconButton

역할:

- icon 중심 UI의 가장 낮은 primitive
- taskbar, start button, start panel, search panel tile에서 재사용 가능

책임:

- icon slot
- size
- selected/pressed/disabled visual
- hover/focus style

비책임:

- 화면에 보이는 title/label 배치
- taskbar session state 계산
- active/inactive indicator 의미
- hover preview open
- context menu open
- pinned/open session logic

예상 props:

```tsx
<IconButton icon={<Icon />} label="블로그" selected={false} />
```

### TaskbarStartIconButton (→ TaskbarStartButton으로 병합)

별도 visual wrapper를 두지 않고 `TaskbarStartButton`이 Windows logo 규격,
open/selected visual, hover/press visual을 직접 소유한다 (`IconButton` 기반).
패널 컨트롤러와 visual이 한 컴포넌트에 있다.

### TaskbarIconButton

역할:

- taskbar 전용 icon button wrapper

책임:

- 40x40 taskbar 규격
- 30x30 icon 규격
- taskbar hover background
- taskbar press scale
- `default | inactive | active` indicator
- optional open/selected visual

비책임:

- panel rendering
- session store mutation
- content loading

예상 props:

```tsx
<TaskbarIconButton
  icon={<img src="/images/folder.png" alt="" />}
  label="블로그"
  state="active"
  open={false}
/>
```

### PanelIconButton

역할:

- Start/Search panel 안에서 쓰이는 icon + title tile
- `IconButton` primitive를 공유하되 taskbar indicator는 사용하지 않는다.

UI:

- icon 25-35px 계열
- label bottom 또는 right
- 1줄/2줄 clamp
- panel hover background

사용처:

- Start panel pinned item
- Search recommended item
- Search best posts/projects item
- All sessions item 일부

예상 props:

```tsx
<PanelIconButton icon={<img src="/images/file.png" alt="" />} title="게시글 제목" lines={2} />
```

### ContextMenuButton

역할:

- Start/Search/Taskbar context menu 안에서 쓰이는 icon + text row
- command action을 명확히 표현하는 menu item
- panel tile이나 taskbar icon과 다른 row density를 가진다.

UI:

- left icon
- visible label
- optional disabled visual
- hover/focus row background

사용처:

- Taskbar context menu action
- Start/Search item context menu action
- panel 내부 command row

예상 props:

```tsx
<ContextMenuButton icon={<Pin20Regular />} label="작업 표시줄에 고정" onClick={pinToTaskbar} />
```

## Search Input

### TaskSearchInput

역할:

- taskbar와 panel에서 재사용되는 Windows style search input

UI:

- rounded full input
- border
- translucent white background
- left search icon
- placeholder

Icon animation:

- 기본 돋보기는 mask svg로 표현
- trigger active 시 icon `scale(0.8)`
- input focus 시 icon에 accent shadow
- input focus 시 gradient layer opacity `0 -> 1`
- input focus 시 gradient rotate `60deg -> 160deg`
- Safari fallback에서는 mask/gradient 대신 accent 단색 focus 처리

관계:

- `TaskbarSearch`에서 사용
- `StartPanel` 상단 search에서 사용
- 검색 icon animation은 input component 책임으로 둔다.

## Floating Panel System

### TaskbarPanelProvider

역할:

- taskbar에서 열리는 floating panel의 registry와 portal root를 제공

책임:

- panel 추가/제거
- panel descriptor 관리
- taskbar root ref 공유
- panel portal layer 렌더링

관계:

- `TaskbarRoot`와 floating panel layer를 함께 감싼다.
- panel item은 `TaskPanel` 기반 panel component로 렌더링한다.

### TaskbarPanelController

구현됨: `packages/ui/src/components/root/taskbarPanelProvider/hooks/useTaskbarPanelController.tsx`

- `escapeClose/outsideClickClose/mouseLeaveClose`(포인터 이탈 500ms 후 닫기), `group` + `closeGroupsOnOpen`, `placement`, `onCloseComplete` 옵션 구현
- `mouseLeaveClose` 패널은 원본처럼 닫힐 때 이전 포커스를 복원하지 않는다

역할:

- anchor와 panel component를 연결해 open/close/positioning을 제어

책임:

- anchor ref
- open/close API
- placement 계산
- Escape close
- outside click close
- mouse leave close
- panel group close
- focus restore

Placement:

- `left`: anchor left 기준
- `center`: anchor center 기준
- `rootCenter`: viewport/root center 기준

Close groups:

- start/search 같은 일반 panel
- hover preview group
- context menu group
- hover와 context는 서로 열릴 때 상대 group을 닫는다.

### TaskPanel

구현됨: `packages/ui/src/components/base/panel/taskPanel`

역할:

- floating panel의 공통 visual container와 enter/exit animation
- `state?: "open" | "closed"` prop과 `data-state`로 애니메이션을 표현하고, 닫힘 완료 언마운트는 소비자가 `onAnimationEnd`로 처리한다.

UI:

- light panel background
- backdrop blur
- border
- rounded corner
- shadow
- 기본 height 600px 계열

Animation:

- open: `task-up`
  - opacity `0 -> 1`
  - `translateY(1000px) -> translateY(0)`
  - 약 220ms
- close: `task-down`
  - opacity `1 -> 0`
  - `translateY(0) -> translateY(1000px)`
  - 약 200ms
- close 요청 시 바로 unmount하지 않고 close animation 완료 후 제거한다.

## Panels Opened By Taskbar

### WindowsPanel (설계명 StartPanel)

구현됨: `packages/ui/src/components/taskbar/panel/windowsPanel`

역할:

- Windows start menu

구성:

- 상단 `TaskSearchInput`
- 기본 화면 pinned view (내부, `PanelIconButton` 재사용)
- 전체 목록 all view (내부, 초성/첫 글자 그룹 + 카테고리 오버레이)
- 검색 결과 `TaskSearchResultView` (searchValue 입력 시 pinned/all 뷰 대체)
- context menu layer (`ContextMenuPanel`, 조립은 앱 레이어)

동작:

- start button click으로 open
- search input value가 있으면 result view
- `모두` button으로 all view 이동
- `뒤로` button으로 pinned view 복귀
- item click 시 file/folder session open 후 panel close
- item context menu 지원

Animation:

- panel open/close: `task-up/task-down`
- pinned/all view 전환: horizontal slide, duration 500ms
- pinned item reorder: fade/scale
- category overlay: opacity/scale

### StartPinnedView

역할:

- StartPanel의 `고정됨` 영역

UI:

- 6-column grid
- icon 34px
- title 2-line clamp
- `모두` button

동작:

- item click: file session open
- item context menu: start/taskbar pin actions
- reorder action: 앞으로/왼쪽/오른쪽 이동

Animation:

- reorder selected item: `opacity-0 scale-0`
- reorder completion: `windows-fadeIn`, scale `0 -> 1`, opacity `0 -> 1`

### StartAllView

역할:

- 전체 콘텐츠 목록

UI:

- grouped list
- category heading
- category index overlay
- item row

동작:

- heading click: category index overlay open
- index click: target category로 scroll
- item click: file session open
- item context menu 지원

Animation:

- all view 자체는 pinned view와 horizontal slide
- category overlay: opacity/scale duration 500ms

### SearchPanel

구현됨: `packages/ui/src/components/taskbar/panel/searchPanel`

역할:

- taskbar search에서 열리는 검색 panel
- `searchValue` 유무로 추천/결과 뷰를 전환하고, 결과 항목의 chevron으로 상세 pane을 연다(내부 상태).
- 상세 pane 액션은 `onDetailAction(action, item)`으로 위임: `open | openLocation | pinToStart | pinToTaskbar`

구성:

- 검색어 없음:
  - 추천 목록
  - 최고의 블로그글
  - 최고의 프로젝트
- 검색어 있음:
  - search result list
  - selected item detail

동작:

- taskbar search click으로 open
- input typing으로 realtime filtering
- result click: file session open 후 close
- context menu 지원
- close animation 이후 search query reset

Animation:

- panel open/close: `task-up/task-down`
- list item hover: color transition

### TaskbarHoverPreview

구현됨: `packages/ui/src/components/taskbar/panel/taskHoverPanel` (구현명 `TaskHoverPanel`)

역할:

- taskbar category icon hover 시 열린 session thumbnail을 보여준다.

열림 조건:

- category가 file category여야 한다.
- category state가 `default`가 아니어야 한다.
- context panel이 닫혀 있어야 한다.
- mobile이 아니어야 한다.
- hover delay 약 1000ms 이후 open

UI:

- 열린 session 수만큼 grid column
- title row
- session icon
- close button
- scaled session preview

동작:

- thumbnail click: session active
- close button click: session close
- pointer가 panel/button 밖으로 나가면 지연 close

Animation:

- panel open/close: `task-up/task-down`
- close button은 thumbnail hover 시 표시

### TaskbarContextMenu

구현됨: `packages/ui/src/components/taskbar/panel/taskbarContextMenu`

역할:

- taskbar category icon의 context action menu
- `TaskPanel` 기반 300px, `tasks` prop이 `작업` 섹션을 렌더링하고 액션 row는 `ContextMenuButton` children으로 받는다.

원본 metric(row 28px, text 14px, hover `gray-200/50`)은 `ContextMenuButton` 자체를 바꾸지 않고 패널 스코프 CSS 오버라이드로 맞춘다. 항목용 소형 메뉴는 `ContextMenuPanel`(원본 `LeftClickPanel`, 200px)이 같은 방식으로 담당한다.

트리거:

- category icon context menu

UI:

- vertical action list
- optional `작업` section
- small icon + text row

동작:

- 최근/관련 파일 열기
- category folder 열기
- taskbar pin/unpin
- 해당 category 모든 창 닫기

조건:

- 관련 콘텐츠가 있으면 `작업` section 표시
- category state가 `default`가 아니면 `모든 창 닫기` 표시

Animation:

- panel open/close: `task-up/task-down`

## Shared Context Actions

Start/Search/Taskbar context menu는 다음 액션을 공유할 수 있다.

- file open
- folder open
- start pin
- start unpin
- taskbar pin
- taskbar unpin
- move pinned item first
- move pinned item left
- move pinned item right
- close category sessions

이 액션들은 UI primitive에 넣지 않고 app/controller layer에서 주입한다.

## State Model

### Taskbar App State

```ts
type TaskbarItemState = "default" | "inactive" | "active";
```

- `default`: 해당 category에 열린 session 없음
- `inactive`: 열린 session은 있으나 active session은 아님
- `active`: 현재 active session의 category

### Additional Flags

- `pinned`: taskbar에 고정됨
- `running`: session이 하나 이상 열림
- `multiSession`: session이 두 개 이상 열림
- `hidden`: session이 minimized/hidden 상태
- `dragging`: drag 중이라 interaction 제한
- `open`: 관련 panel이 열림
- `mobile`: hover/context 동작 제한

## Relationship Summary

```txt
TaskbarPanelProvider
  owns panel registry
  exposes root ref and add/remove panel

TaskbarRoot
  owns fixed bottom layout and glass surface
  contains visible taskbar controls

TaskbarStartButton
  owns Windows logo visual (IconButton 기반, 구 TaskbarStartIconButton 병합)
  opens StartPanel through TaskbarPanelController

TaskbarSearch
  uses TaskSearchInput
  opens SearchPanel through TaskbarPanelController

TaskbarAppList
  receives pinned categories and open session summary
  renders TaskbarAppButton in category order

TaskbarAppButton
  uses TaskbarIconButton
  delegates click/hover/context behavior to controller hooks
  opens TaskbarHoverPreview or TaskbarContextMenu

TaskbarIconButton
  uses IconButton
  adds taskbar sizing and running indicator

PanelIconButton
  uses IconButton
  adds panel label layout and line clamp

ContextMenuButton
  owns context/action row icon and label layout
  is used by TaskbarContextMenu and item context menus

TaskSearchInput
  owns search icon mask/focus animation
  is reused by TaskbarSearch and StartPanel

TaskPanel
  wraps WindowsPanel, SearchPanel, HoverPreview, TaskbarContextMenu
  owns task-up/task-down animation

ContextMenuPanel
  owns 200px floating menu surface (원본 LeftClickPanel)
  hosts ContextMenuButton rows with panel-scoped metric overrides
```

## Implementation Direction

1. Define UI primitives first: (완료)
   - `IconButton`
   - `TaskbarIconButton`
   - `TaskbarStartIconButton`
   - `PanelIconButton`
   - `ContextMenuButton`
   - `TaskSearchInput`

1-2. Define panel presentational components: (완료)
   - `TaskPanel`
   - `WindowsPanel`
   - `SearchPanel`
   - `ContextMenuPanel`
   - `TaskbarContextMenu`

2. Define taskbar layout:
   - `TaskbarPanelProvider`
   - `TaskbarRoot`
   - `TaskbarStartButton`
   - `TaskbarSearch`
   - `TaskbarAppList`
   - `TaskbarClock`

3. Define floating panel contract:
   - `TaskbarPanelController`
   - `TaskbarPanel`
   - placement
   - close behaviors
   - animation lifecycle

4. Attach app behavior in `apps/web`:
   - pinned category state
   - session state
   - search query
   - panel content
   - context actions

`packages/ui` should own generic visual primitives and taskbar UI contracts. App-specific session/content behavior should stay in `apps/web`.
