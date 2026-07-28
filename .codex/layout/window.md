# Window Layout Model (Folder/File)

## Purpose

`window`는 원본 `blog` 프로젝트의 폴더 창(`SessionFolder`)과 파일 창(`SessionFile`)을 새 `window-blog` 구조에 맞게 다시 설계하기 위한 UI 모델이다.

두 창은 같은 창 프레임을 공유하고 본문 뷰어만 다르다. taskbar와 마찬가지로 원본 코드를 그대로 옮기기보다, 먼저 컴포넌트 책임과 관계를 고정해 이후 구현 변동을 줄인다.

## Source Evidence

- 원본 폴더 창: `/Users/seojaewan/Desktop/dev/blog/src/components/organisms/sessionFolder/index.tsx`
- 원본 파일 창: `/Users/seojaewan/Desktop/dev/blog/src/components/organisms/sessionFile/index.tsx`
- 원본 창 프레임: `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/sessionControlBar/index.tsx`
- 원본 창 애니메이션: `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/sessionControlBar/hooks/useAnimation/index.ts`
- 원본 route 행: `/Users/seojaewan/Desktop/dev/blog/src/components/molecules/sessionRoute/index.tsx`
- 원본 주소창: `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/routeInput/index.tsx`
- 원본 태그 검색: `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/tagInput/index.tsx`
- 원본 폴더 본문: `/Users/seojaewan/Desktop/dev/blog/src/components/molecules/folderViewer/index.tsx`
- 원본 카테고리 사이드바 항목: `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/folderCategory/index.tsx`
- 원본 파일 카드: `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/folderIcon/index.tsx`
- 원본 파일 본문: `/Users/seojaewan/Desktop/dev/blog/src/components/molecules/notionViewer/index.tsx`

픽셀/색 실측 스펙은 dev-wiki `layout/folder-file-window.md`에 기록되어 있다. 이 문서는 구조와 책임을 고정하고, 실측값은 wiki 문서를 기준으로 한다.

## Scope

이 문서는 폴더/파일 창의 UI 구조와 관계만 다룬다.

포함:

- 창 프레임(타이틀 행, 창 컨트롤, route 행, 리사이즈 핸들, 본문 slot)
- 폴더 본문(카테고리 사이드바, 파일 카드 그리드)
- 파일 본문의 UI 경계
- 창 open/close/minimize/restore 애니메이션 요구사항
- 창 상태(active/fullscreen/dragging)와 시각 표현의 관계

제외:

- 실제 구현 코드
- session store, 드래그/리사이즈 hook의 상세 구현
- Notion 콘텐츠 로딩과 react-notion-x 렌더링
- 폴더/파일/정렬 context menu의 항목 구성 (taskbar.md의 context menu 계열 재사용)
- desktop wallpaper, 아이콘 배치

## Implemented UI (packages/ui)

`components/window`와 `components/base/panel/scaledPreviewUI`에 구현 완료. 설계 이름과 구현의 차이:

| 문서 설계 이름          | 구현 이름                                   | 비고                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `WindowFrameUI`         | `WindowFrameUI`                             | `variant/state/fullscreen/dragging/zIndex/bounds`(CSS 변수 주입) + `animation: open\|close\|minimize\|restore\|none` + `onAnimationEnd`. `titleBar`/`routeBar` slot, `onResizeStart`로 리사이즈 위임. `overrideFullscreen`이 원본 `isOverrideFullScreen` 대응(100% 채움 + 애니메이션 미적용). activate는 `onPointerDown` passthrough |
| `WindowTitleBarUI`      | `WindowTitleBarUI`                          | children=`WindowTabUI`, `controls` slot. 창 이동 시작은 `onMoveStart`(pointer down) — 네이티브 `onDragStart`(DragEvent)와 타입이 충돌해 이름 변경                                                                                                                                                                                    |
| `WindowTabUI`           | `WindowTabUI`                               | `icon`(기본 file asset)/`title`/`variant`                                                                                                                                                                                                                                                                                            |
| `WindowControlsUI`      | `WindowControlsUI`                          | `fullscreen/onMinimize/onToggleFullscreen/onClose` + `showMinimize/showMaximize`(원본 other 세션 대응). 닫기는 stopPropagation으로 activate 방지                                                                                                                                                                                     |
| `WindowResizeHandlesUI` | `WindowResizeHandlesUI`                     | `onResizeStart(event, direction)` 8방향. `WindowFrameUI`이 내부에서 렌더                                                                                                                                                                                                                                                             |
| `WindowRouteBarUI`      | `WindowRouteBarUI`                          | `canGoBack/canGoForward/onBack/onForward` + children(`RouteInputUI`) + `tag` slot(창 폭 `@container 48rem`에서 160→320px)                                                                                                                                                                                                            |
| `RouteInputUI`          | `RouteInputUI`                              | 포커스 시 편집 모드 + `suggestions` 드롭다운, `onSelectSuggestion`. folder `rounded-md` / file pill                                                                                                                                                                                                                                  |
| `TagInputUI`            | `TagInputUI`                                | `tags/selectedTag/onSelectTag/onRemoveTag`. 태그 색은 Tailwind 클래스 대신 CSS color 값(`WindowTag.color`)                                                                                                                                                                                                                           |
| `FolderViewerUI`        | `FolderViewerUI`                            | `sidebar` slot + children(그리드). 창 대신 자신이 container(inline-size)가 되어 창 폭에 반응                                                                                                                                                                                                                                         |
| `FolderSidebarUI`       | `FolderSidebarUI`                           | `@container 48rem` 미만에서 숨김                                                                                                                                                                                                                                                                                                     |
| `FolderCategoryItemUI`  | `FolderCategoryItemUI`                      | `selected/defaultExpanded/items` + `onSelect/onSelectItem/onContextMenu`. 펼침은 내부 상태                                                                                                                                                                                                                                           |
| `FolderFileGridUI`      | `FolderFileGridUI`                          | `viewMode: big\|middle\|small` — 카드 폭은 grid의 `data-view`가 결정                                                                                                                                                                                                                                                                 |
| `FolderFileCardUI`      | `FolderFileCardUI`                          | `cover` slot + `title`. 열기/우클릭은 `onClick/onDoubleClick/onContextMenu` 그대로 위임                                                                                                                                                                                                                                              |
| `ScaledPreviewUI`       | `ScaledPreviewUI` (`components/base/panel`) | 기준 1920×1024(`baseWidth/baseHeight` 조절 가능). `Base/ScaledPreviewUI` 스토리에 `TaskHoverPanelUI` preview slot 통합 예시                                                                                                                                                                                                          |

관계된 기존 구현:

| 관계                    | 구현 이름                                   | 비고                                                                                |
| ----------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| hover preview thumbnail | `TaskHoverPanelUI`                          | `preview` slot에 `ScaledPreviewUI` + `WindowFrameUI(overrideFullscreen)`을 주입한다 |
| context menu 계열       | `ContextMenuPanelUI`, `ContextMenuButtonUI` | 폴더 본문의 카테고리/파일/정렬 우클릭 메뉴가 재사용 (조립은 앱 레이어)              |

파일 본문 뷰어는 계획대로 앱 영역으로 남겨두었다 (스토리에서는 스크롤 컨테이너 목업). 드래그/리사이즈는 `useWindowBounds`로 `WindowFrameUI`에 기본 내장했다(`bounds` 지정 시 controlled로 전환). 세션 store 연동 등 `apps/web` 단계는 미착수.

## Component Tree

```tsx
<WindowFrameUI>
  {" "}
  {/* 원본 SessionControlBar — 창 chrome + 배치 + 애니메이션 표면 */}
  <WindowTitleBarUI>
    {" "}
    {/* 30px 행: 탭 제목 + 창 컨트롤, 드래그/더블클릭 영역 */}
    <WindowTabUI /> {/* 아이콘 + 제목, 탭 모양 */}
    <WindowControlsUI /> {/* 최소화/최대화(복원)/닫기 */}
  </WindowTitleBarUI>
  <WindowRouteBarUI>
    {" "}
    {/* 원본 SessionRoute — 뒤로/앞으로 + 주소창 + 태그 검색 */}
    <RouteInputUI />
    <TagInputUI /> {/* 폴더 창 전용 */}
  </WindowRouteBarUI>
  <WindowResizeHandlesUI />
  {/* 4변 + 4모서리, md 이상 */}
  {/* 본문 slot */}
  <FolderViewerUI>
    {" "}
    {/* 폴더 창 본문 */}
    <FolderSidebarUI>
      {" "}
      {/* 카테고리 트리, @md 이상 */}
      <FolderCategoryItemUI />
    </FolderSidebarUI>
    <FolderFileGridUI>
      <FolderFileCardUI />
    </FolderFileGridUI>
  </FolderViewerUI>
  {/* 또는 파일 창 본문: 앱 영역(react-notion-x) — UI 패키지는 스크롤 컨테이너 경계만 */}
</WindowFrameUI>
```

## Component Connection Map

### WindowFrameUI

역할:

- 창 하나의 최상위 컨테이너. 원본 `SessionControlBar`.
- 크기/위치/z-index/fullscreen 시각을 담당한다.
- 창 상태 전이 애니메이션의 표면이다.

UI:

- CSS 변수(`--win-width/height/left/top/right/bottom`)로 크기/위치 주입
- fullscreen: `100% × calc(100% - 50px)`(taskbar 제외), radius 없음
- 창 모드: `rounded-md` + `overflow-hidden` + `shadow-xl`
- 배경 `surface-base`
- container query(`@container`) 기준 요소 — 내부 반응형은 viewport가 아니라 창 폭 기준

동작:

- pointer down 시 창 activate (앱 위임)
- 기본(uncontrolled): `useWindowBounds` 내장 — 타이틀바 드래그 이동 + 8방향 리사이즈. `bounds` 지정 시 controlled로 전환되어 앱이 배치를 소유한다.

비책임:

- session store mutation
- 드래그/리사이즈 계산
- 본문 내용

구현된 props:

```tsx
<WindowFrameUI
  variant="folder"            /* folder | file — header 색 계열 결정 */
  state="active"              /* active | background */
  fullscreen={false}
  bounds={{ width: 960, height: 600, left: 120, top: 80 }}
  zIndex={12}
  animation="open"            /* open | close | minimize | restore | none */
  onAnimationEnd={handleAnimationEnd}
  onPointerDown={activateSession}
  onResizeStart={startResize} /* (event, direction) — 핸들 pointer down 위임 */
  titleBar={<WindowTitleBarUI ... />}
  routeBar={<WindowRouteBarUI ... />}
>
  {body}
</WindowFrameUI>
```

### WindowTitleBarUI

역할:

- 30px 타이틀 행. 드래그 시작 영역이자 더블클릭 fullscreen 토글 영역.

UI:

- variant별 색: 파일 `surface-highlight`/`surface-soft`(warm), 폴더 `blue-200/40`/`white/90`
- 좌측 탭 모양 제목(`WindowTabUI`): 아이콘 18px + 1줄 제목, min 200px / max 50%
- 우측 `WindowControlsUI`

동작:

- 제목 영역 pointer down → 창 이동 시작 (앱 위임)
- 행 더블클릭 → fullscreen 토글

### WindowControlsUI

역할:

- 최소화/최대화(복원)/닫기 버튼 묶음.

UI:

- 각 버튼 30×30(`h-full aspect-square`)
- 최소화/최대화는 md 이상에서만, 닫기는 항상
- hover: 회색 배경, 닫기만 red + 흰색
- fullscreen 여부로 최대화/복원 아이콘 전환

동작:

- 최소화 → minimize 애니메이션 시작
- 최대화/복원 → fullscreen 토글
- 닫기 → close 애니메이션 시작 (`stopPropagation`으로 activate 방지)

### WindowRouteBarUI

역할:

- 원본 `SessionRoute`. 뒤로/앞으로 + 주소창 + (폴더 창) 태그 검색.

UI:

- 내부 높이 36px, 탭 제목과 같은 면으로 이어지는 배경(variant별)
- 뒤로/앞으로: 원형 hover, 히스토리 없으면 40% 투명도
- `RouteInputUI`이 flex-1, `TagInputUI`은 폴더 창 전용 `w-40 @md:w-80`

동작:

- 뒤로/앞으로 → route 히스토리 이동 (앱 위임)

### RouteInputUI

역할:

- Windows 탐색기 주소창. 검색 겸용 input.

UI:

- 좌측 세션 아이콘 20px, `text-xs`
- 기본: 반투명 회색(`gray-200/40`), hover 시 진해짐
- 편집 중: 흰 배경 + 아래로 이어지는 드롭다운(제안 목록, 항목 32px)
- 폴더 창 `rounded-md`, 파일 창 `rounded-full`

동작:

- 포커스 시 편집 모드 + 제안 목록 표시
- 항목 선택 → route 변경 (앱 위임)

### TagInputUI

역할:

- 폴더 창 전용 태그 필터. 주소창과 같은 시각 언어.

UI:

- 우측 Search 아이콘, 선택된 태그는 색 칩 + 제거 버튼
- 열림 시 아래로 태그 칩 그리드 드롭다운

동작:

- 칩 선택/제거 → 목록 필터 (앱 위임)
- 외부 클릭 → 드롭다운 닫기

### WindowResizeHandlesUI

역할:

- 창 가장자리 리사이즈 히트 영역. 시각 요소 없음.

UI:

- 4변 4px 두께, 4모서리 8×8(모서리가 z 우선), md 이상에서만
- 방향별 `cursor-*-resize`

동작:

- pointer down에 방향(`n|s|w|e|nw|ne|sw|se`)을 실어 앱에 위임

### FolderViewerUI

역할:

- 폴더 창 본문. 흰 배경 탐색기 영역.

구성:

- `FolderSidebarUI` (@md 이상) + `FolderFileGridUI`
- 카테고리/파일/정렬 context menu는 `ContextMenuPanelUI` 계열로 앱 레이어에서 조립

### FolderSidebarUI / FolderCategoryItemUI

역할:

- 좌측 카테고리 트리. 창 폭 1/6.

UI:

- 항목: `text-xs`, chevron 토글 + 카테고리 아이콘 15px + 라벨
- 현재 카테고리: 회색 배경 + hover 시 검은 테두리
- hover: `blue-200/30`
- 펼치면 하위 파일 행(chevron + 파일 아이콘 + 1줄 제목)

동작:

- 카테고리 클릭 → 현재 폴더 route 변경
- 하위 파일 클릭 → 파일 창 열기
- 우클릭 → 카테고리 context menu

### FolderFileGridUI / FolderFileCardUI

역할:

- 우측 파일 카드 목록. 세로 스크롤.

UI:

- flex-wrap 그리드, `gap-y-2` + `gap-x-4`
- 카드 폭은 보기 모드: big 320px / middle 240px / small 160px (모바일 50%)
- 카드: 커버 이미지 `aspect-3/2` + 제목, hover/focus `blue-200/30`, `rounded-md`
- 커버 로딩은 skeleton

동작:

- PC 더블클릭 / 모바일 클릭 → 파일 창 열기
- 카드 우클릭 → 파일 context menu
- 그리드 빈 영역 우클릭 → 정렬(보기 모드) context menu

### 파일 본문 경계

- 파일 창 본문은 react-notion-x 렌더링으로 앱 영역이다.
- UI 패키지는 `h-full overflow-y-auto select-text` 스크롤 컨테이너와 로딩 스피너(중앙 32px)까지만 책임진다.

### ScaledPreviewUI

역할:

- 원본 `ScaledWindow`. 1920×1024 기준 캔버스를 부모 크기에 맞게 scale해 창 화면을 축소 표현한다.

사용처:

- `TaskHoverPanelUI`의 `preview` slot (taskbar hover preview)
- 이후 창 minimize 미리보기 등

## Animation

창 상태 전이는 `WindowFrameUI`에 애니메이션 클래스를 붙이고 `onAnimationEnd`에서 앱이 상태를 정리한다.

| 전이     | keyframe                                        | 타이밍                                            |
| -------- | ----------------------------------------------- | ------------------------------------------------- |
| open     | `scale(0.6) -> 1` + fade                        | 200ms `cubic-bezier(0.2, 0.75, 0.25, 1)` forwards |
| close    | `scale(1) -> 0.6` + fade                        | 150ms `cubic-bezier(0.4, 0, 0.6, 1)` forwards     |
| minimize | `translateY(0 -> 500px) scale(1 -> 0.4)` + fade | 150ms `cubic-bezier(0.4, 0, 0.6, 1)` forwards     |
| restore  | `translateY(500px -> 0) scale(0.4 -> 1)` + fade | 200ms `cubic-bezier(0.2, 0.75, 0.25, 1)` forwards |

- easing 곡선은 taskbar panel의 `task-up/task-down`과 동일하고 keyframe만 다르다.
- `onAnimationEnd`: minimize → hidden 처리, close → 세션 제거, 그 외 → active 확정. taskbar `TaskPanelUI`과 같은 "닫힘 애니메이션 후 언마운트" 패턴.
- hover preview(`ScaledPreviewUI`) 안에서는 창 애니메이션을 붙이지 않는다 (원본 `isOverrideFullScreen`).
- 크기/위치 변화 자체는 `transition-all`로 부드럽게 처리하되, 드래그 중에는 transition을 끈다.

## Icon Mapping

taskbar.md의 Icon Set Policy를 따른다. 창 전용 매핑:

```txt
최소화               -> Subtract16Regular
최대화               -> Maximize16Regular (원본 Square 12)
복원                 -> SquareMultiple16Regular (원본 Copy rotate-90)
닫기                 -> Dismiss16Regular
뒤로/앞으로          -> ArrowLeft16Regular / ArrowRight16Regular
사이드바 펼침/접힘   -> ChevronRight16Regular / ChevronDown16Regular (원본 15px)
태그 검색            -> Search12Regular
카테고리/파일 아이콘 -> packages/ui/src/assets 원본 asset
```

## State Model

```ts
type WindowVariant = "folder" | "file";
type WindowState = "active" | "background";
type WindowAnimation = "open" | "close" | "minimize" | "restore" | "none";
type FolderViewMode = "big" | "middle" | "small";
```

- `variant`: header/route 행의 색 계열과 제목 탭/주소창 radius를 결정한다.
- `state`: z-index 우선순위(active는 최상위)와 activate 동작 여부.
- `fullscreen`: 크기/radius/최대화 아이콘 전환. 모바일은 항상 fullscreen.
- `dragging`: transition off, pointer 이벤트 제한.
- `viewMode`: `FolderFileCardUI` 폭. 정렬 context menu로 변경.
- 반응형 분기는 두 종류를 구분한다: 모바일 여부(viewport md)는 창 배치/컨트롤 표시, 사이드바/TagInputUI 폭은 창 폭(container query `@md`).

## Relationship Summary

```txt
WindowFrameUI
  owns 창 배치(fixed + CSS 변수), fullscreen visual, 상태 전이 애니메이션 표면
  delegates activate/drag/resize/session mutation to app layer

WindowTitleBarUI
  owns 30px 타이틀 행과 variant 색
  contains WindowTabUI, WindowControlsUI
  starts drag / toggles fullscreen

WindowControlsUI
  owns 최소화/최대화/닫기 visual
  triggers minimize/close animation via app callbacks

WindowRouteBarUI
  owns 36px route 행
  contains 뒤로/앞으로, RouteInputUI, TagInputUI(folder)

FolderViewerUI
  owns 흰 배경 탐색기 레이아웃
  contains FolderSidebarUI(@md), FolderFileGridUI
  opens 카테고리/파일/정렬 context menu (ContextMenuPanelUI 계열, 앱 조립)

FolderFileCardUI
  owns 카드 visual (viewMode 폭, cover 3:2, hover)
  opens file on double click (PC) / click (mobile)

ScaledPreviewUI
  owns 1920×1024 -> 부모 크기 scale
  is used by TaskHoverPanelUI preview slot

파일 본문
  앱 영역 (react-notion-x). UI는 스크롤 컨테이너 + 로딩 스피너 경계만
```

## Implementation Direction

1. Define window primitives: (완료)
   - `WindowFrameUI` (variant/fullscreen/애니메이션 표면)
   - `WindowTitleBarUI` + `WindowTabUI` + `WindowControlsUI`
   - `WindowResizeHandlesUI`
2. Define route bar: (완료)
   - `WindowRouteBarUI`
   - `RouteInputUI` (편집 모드 + 제안 드롭다운)
   - `TagInputUI` (칩 + 드롭다운)
3. Define folder body: (완료)
   - `FolderViewerUI` 레이아웃
   - `FolderSidebarUI` / `FolderCategoryItemUI`
   - `FolderFileGridUI` / `FolderFileCardUI`
4. Define preview: (완료)
   - `ScaledPreviewUI` → `TaskHoverPanelUI` preview slot 연결
5. Attach app behavior in `apps/web`:
   - session store(위치/크기/상태), 드래그/리사이즈 hook
   - route 히스토리, 태그 필터, 콘텐츠 데이터
   - react-notion-x 파일 본문

`packages/ui`는 창 chrome과 폴더 뷰어의 visual contract까지만 소유한다. 세션/콘텐츠/입력 계산은 `apps/web`에 둔다.
