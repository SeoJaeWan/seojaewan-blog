# Desktop Layout Model (바탕화면)

## Purpose

`desktop`은 원본 `blog` 프로젝트의 Windows 11 바탕화면 — 배경 이미지, 바탕화면 아이콘, 열린 창 레이어, 바탕화면 컨텍스트 메뉴 — 을 새 `window-blog` 구조에 맞게 다시 설계하기 위한 UI 모델이다.

taskbar([[taskbar.md]])와 창([[window.md]])이 그 위에 올라가는 최상위 화면 조립 단위다. 원본 코드를 그대로 옮기기보다, 먼저 컴포넌트 책임과 관계를 고정해 이후 구현 변동을 줄인다.

## Source Evidence

- 원본 화면 조립: `/Users/seojaewan/Desktop/dev/blog/src/components/templates/desktopUI/index.tsx`
- 원본 루트 배치: `/Users/seojaewan/Desktop/dev/blog/src/app/layout.tsx`
- 원본 배경 + 아이콘: `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/wallPaper/index.tsx`
- 원본 창 레이어: `/Users/seojaewan/Desktop/dev/blog/src/components/templates/sessions/index.tsx`
- 원본 카테고리/외부 링크 상수: `/Users/seojaewan/Desktop/dev/blog/src/constants/category.ts`
- 원본 컨텍스트 메뉴 컨테이너: `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/leftClickPanel/index.tsx`
- 원본 서브 메뉴: `/Users/seojaewan/Desktop/dev/blog/src/components/atoms/leftSubPanel/index.tsx`
- 원본 커서 위치 계산: `/Users/seojaewan/Desktop/dev/blog/src/components/organisms/searchPanel/hooks/useContextMenu/index.tsx`
- 원본 정렬/보기 메뉴: `/Users/seojaewan/Desktop/dev/blog/src/components/molecules/sortLeftPanel/index.tsx`
- 원본 카테고리 우클릭 메뉴: `/Users/seojaewan/Desktop/dev/blog/src/components/molecules/folderCategoryLeftPanel/index.tsx`

## Scope

이 문서는 바탕화면의 UI 구조와 관계만 다룬다.

포함:

- 배경 이미지 surface와 화면 배치 (taskbar 50px 제외 영역)
- 바탕화면 아이콘 그리드와 아이콘 버튼 (viewMode 크기)
- 열린 창(session) 레이어와의 관계
- 커서 위치 컨텍스트 메뉴(정렬/보기, 카테고리 고정) + 서브 메뉴
- 카테고리 폴더 열기 / 외부 링크(LinkedIn, Github) 동작 경계

제외:

- 실제 구현 코드
- session store, 리스트 컨트롤 store 상세 구현
- taskbar 내부 구조 ([[taskbar.md]])
- 창 내부 구조 ([[window.md]])
- Notion 콘텐츠, 테마/다크모드

## Original Structure

```txt
main (w-full h-full overflow-hidden relative)
└─ DesktopUI (w-full h-full relative z-10)
   ├─ Sessions      열린 창들 (SessionFile/SessionFolder/SessionNotFound/SessionOther)
   ├─ WallPaper     배경 이미지 + 바탕화면 아이콘 + 데스크톱 컨텍스트 메뉴
   └─ BottomBar     taskbar
#windows-left       컨텍스트 메뉴 portal layer
```

원본 `WallPaper`가 배경과 아이콘, 컨텍스트 메뉴를 한 컴포넌트에서 담당한다. 새 구조에서는 배경/아이콘 그리드/아이콘을 분리한다.

## Implemented UI (packages/ui)

`components/desktop`(wallpaper/desktopIconGrid/desktopIcon — wallpaper는 설계명 DesktopRoot)과 컨텍스트 메뉴 확장(`components/base/menu`) 구현 완료:

| 설계 이름 | 구현 이름 | 비고 |
| --- | --- | --- |
| `DesktopRoot` | `Wallpaper` (`components/desktop/wallpaper`) | 배경 surface (`backgroundSrc` prop, taskbar 50px 제외). 우클릭은 `onContextMenu` 위임 |
| `DesktopIconGrid` | `DesktopIconGrid` | flex-col wrap 배치, `viewMode`를 `data-view`로 내림 |
| `DesktopIcon` | `DesktopIcon` | `IconButton` primitive + 세로 라벨(26px). 크기는 그리드 `data-view`가 결정 |
| `ContextMenuSubPanel` | `ContextMenuSubPanel` | 원본 `LeftSubPanel`. 부모 row hover 표시 + 화면 경계 플립 |
| 커서 위치 컨트롤러 | `useContextMenuController` (`components/controllers/contextMenuController`) | 원본 `useContextMenu` + `LeftClickPanel`. 커서 기준 경계 플립(200×300), 전역 단일 열림, 외부 클릭 닫힘. provider 불필요한 headless 컨트롤러라 `controllers/`에 둔다 |

관계된 기존 구현:

| 관계 | 구현 이름 | 비고 |
| --- | --- | --- |
| 창 레이어의 창 | `WindowFrame` 계열 | [[window.md]] — Desktop은 형제 레이어로 창들을 배치한다. 드래그/리사이즈는 `useWindowBounds` 내장(기본) |
| taskbar | `TaskbarRoot` 계열 | [[taskbar.md]] — 바탕화면 아래 50px |
| 컨텍스트 메뉴 컨테이너 | `ContextMenuPanel`, `ContextMenuButton` | 원본 `LeftClickPanel`(200px) 대응. `trailing` slot으로 서브 메뉴 화살표 표현 |

## Component Tree

```tsx
<Wallpaper>                 {/* 배경 이미지 surface, taskbar 제외 영역 */}
  <DesktopIconGrid viewMode="middle">   {/* 세로 쌓임 + 열 wrap 아이콘 배치 */}
    <DesktopIcon />           {/* 카테고리 폴더 / 외부 링크 */}
  </DesktopIconGrid>
</Wallpaper>

{/* 형제 레이어 (앱 조립) */}
<WindowFrame />[]             {/* 열린 창들 — fixed, zIndex로 쌓임 */}
<TaskbarRoot />               {/* 하단 50px */}
<ContextMenuPanel />          {/* 커서 위치, 바탕화면/아이콘 우클릭 */}
```

## Component Connection Map

### Wallpaper (설계명 DesktopRoot)

역할:

- 바탕화면 배경 surface. 원본 `WallPaper`의 배경 부분.
- 바탕화면 우클릭(정렬/보기 메뉴)의 히트 영역.

UI:

- 높이 `calc(100vh - 50px)`(taskbar 제외), `overflow-hidden`, `bg-gray-100`(`rgb(243 244 246)`) fallback
- 배경 이미지: 원본 `/images/windows.webp`, `background-size: cover`
- 배경 위치: 모바일 `77% center`, md 이상 `center` (viewport media query)

동작:

- 빈 영역 우클릭 → 정렬/보기 컨텍스트 메뉴 (앱 위임, `onContextMenu`)

비책임:

- 아이콘 배치(그리드가 담당), 창/panel 렌더링, 컨텍스트 메뉴 조립

### DesktopIconGrid

역할:

- 바탕화면 아이콘 배치 레이어. Windows처럼 좌측부터 세로로 쌓이고 넘치면 다음 열로 감싼다.

UI:

- `absolute inset-0 p-2(8px) flex flex-col flex-wrap content-start gap-2(8px)`
- `viewMode`를 data attribute로 내려 아이콘 크기를 결정한다

동작:

- 원본은 mounted 후에만 아이콘을 렌더(hydration 가드) — 앱 책임

### DesktopIcon

역할:

- 바탕화면 아이콘 버튼 하나. 카테고리 폴더(블로그/프로젝트/코딩 테스트/소개)와 외부 링크(LinkedIn, Github)가 같은 컴포넌트를 쓴다.

UI:

- `flex flex-col p-1 items-center justify-center rounded-md`
- hover/focus: `bg-blue-200/30` (파일 카드와 동일)
- 크기(viewMode): big `112px`(w-28) / middle `96px`(w-24) / small `80px`(w-20), 모바일 고정 `96px`
- 아이콘 이미지: `h-[calc(100%-26px)] w-auto` (실측 72/56/48px)
- 라벨: 높이 26px, `text-sm`(14px), 한 줄

동작:

- PC 더블클릭 / 모바일 클릭 → 폴더 창 생성 또는 외부 링크 새 탭 (`onOpen` 위임)
- 우클릭 → 카테고리 컨텍스트 메뉴(새창에서 열기 / 작업 표시줄 고정·제거). 외부 링크 아이콘은 기본 메뉴만 차단
- 아이콘 asset은 원본 `folder.png` 등 `packages/ui/src/assets` 사용, 외부 링크는 brand asset

### 창(session) 레이어

- 열린 창들은 `WindowFrame`이 각자 `position: fixed` + `zIndex`로 쌓이므로 별도 레이어 컴포넌트가 필요 없다.
- Desktop 구현에서는 `Wallpaper`의 형제로 `WindowFrame[]`을 렌더한다 (원본 `Sessions` 대응, 앱 조립).
- active 창이 최상위, 나머지는 `session.index` — [[window.md]]의 State Model을 따른다.

### 컨텍스트 메뉴 (커서 위치)

원본 desktop/폴더 그리드의 우클릭 메뉴는 taskbar panel과 다른 체계다:

- 컨테이너: `ContextMenuPanel`(구현됨, 원본 `LeftClickPanel` 200px). `#windows-left` portal에 `position: fixed`로 커서 위치에 표시
- 위치 계산(원본 `useContextMenu`): 기준점은 커서(clientX/Y). 메뉴 예상 크기(200×300)가 화면 우측/하단(taskbar 50px 제외)을 넘으면 `right`/`bottom` 기준으로 뒤집는다
- 한 번에 하나만 열림(전역 openMenuId), 외부 클릭으로 닫힘, **등장/퇴장 애니메이션 없음(즉시 표시/제거)**
- 서브 메뉴(`ContextMenuSubPanel`, 원본 `LeftSubPanel`): 부모 row hover 시 표시. 부모 오른쪽에 붙이고, 화면을 넘치면 왼쪽/위쪽으로 플립

메뉴 구성 (앱 조립):

- 바탕화면 우클릭 → 보기(서브: 아주 큰/큰/보통 아이콘, 현재 값 ● 표시). 바탕화면은 정렬 기준 없음
- 폴더 그리드 우클릭 → 보기 + 정렬 기준(제목/날짜, 오름/내림 서브)
- 카테고리 아이콘 우클릭 → 새창에서 열기 / 작업 표시줄에 고정·제거

## Icon Mapping

taskbar.md의 Icon Set Policy를 따른다. 바탕화면/정렬 메뉴 매핑:

```txt
보기(레이아웃)      -> Grid20Regular (원본 LayoutGrid 16)
정렬 기준           -> ArrowSort20Regular (원본 ArrowUpDown 16)
서브 메뉴 화살표    -> ChevronRight16Regular
보기 모드 열 아이콘 -> TextColumnTwo/Three20Regular 계열 후보 (원본 Columns2/3/4 16)
새창에서 열기       -> WindowNew20Regular (원본 CopyPlus 16)
고정/제거           -> Pin20Regular / PinOff20Regular
카테고리 폴더       -> packages/ui/src/assets/folder.png
LinkedIn/Github     -> 원본 brand asset (assets에 추가 필요)
현재 선택 표시      -> 6px ● 텍스트 (아이콘 아님)
```

## State Model

```ts
type DesktopViewMode = "big" | "middle" | "small"; // FolderViewMode와 같은 값
```

- `viewMode`: 아이콘 버튼 112/96/80px + 이미지 72/56/48px. 정렬 메뉴의 보기 서브에서 변경. 원본은 `windows` 키의 리스트 컨트롤 store — 폴더 그리드(`FolderFileGrid`)의 viewMode와 같은 체계를 공유한다
- `isMobile`: 클릭/더블클릭 전환 + 아이콘 크기 고정(96px). viewport media 기준 — 창 폭 container query가 아니다
- 컨텍스트 메뉴 열림은 전역에서 하나 (원본 openContextMenuIdStore)

## Relationship Summary

```txt
Wallpaper (설계명 DesktopRoot)
  owns 배경 이미지 surface (calc(100vh - 50px), cover, 모바일 77% center)
  delegates 빈 영역 우클릭 to 앱 (정렬/보기 메뉴)

DesktopIconGrid
  owns flex-col wrap 배치와 viewMode 크기 컨텍스트
  contains DesktopIcon[]

DesktopIcon
  owns 아이콘+라벨 visual (hover blue-200/30, viewMode 크기)
  delegates 더블클릭/클릭 open, 우클릭 메뉴 to 앱

WindowFrame[] (형제 레이어)
  각자 fixed + zIndex — Desktop은 배치에 관여하지 않는다

ContextMenuPanel (+ ContextMenuSubPanel)
  owns 커서 위치 200px 메뉴 surface, 애니메이션 없음
  위치 계산(경계 플립)은 컨트롤러가 담당
```

## Implementation Direction

1. Define desktop primitives:
   - `Wallpaper` (배경 surface, `components/desktop/wallpaper`)
   - `DesktopIconGrid` (viewMode 배치)
   - `DesktopIcon` (아이콘 버튼)
2. Extend context menu:
   - `ContextMenuSubPanel` (hover 서브 메뉴, 경계 플립)
   - 커서 위치 컨텍스트 메뉴 컨트롤러 (경계 플립, 단일 열림)
3. Compose in Storybook:
   - Wallpaper + DesktopIcon + WindowFrame + TaskbarRoot 통합 데스크톱 스토리 (`components/root/root.stories.tsx`)
4. Attach app behavior in `apps/web`:
   - 카테고리/외부 링크 데이터, 폴더 세션 생성, viewMode store, taskbar 고정 상태

`packages/ui`는 배경/아이콘/메뉴 surface의 visual contract까지만 소유한다. 어떤 아이콘을 보여줄지, 무엇을 열지는 `apps/web`에 둔다.
