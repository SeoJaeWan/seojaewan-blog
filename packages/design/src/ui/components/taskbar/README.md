# Taskbar 사용 안내

Taskbar는 화면 아래에서 시작, 검색, 앱 실행, 시간과 날짜를 보여 주는 제품 구성 요소입니다.
현재 구현은 데스크톱과 모바일의 기본 배치, 입력 전달과 상태 표현을 제공합니다. 데스크톱에서는
Start와 Search primary panel의 trigger, focus, dismiss, placement와 motion도 함께 제공합니다.

## 구성

```text
taskbar/
  root/                 전체 배치와 데스크톱·모바일 구성을 선택합니다.
  start/
    button/             Windows logo trigger를 표시합니다.
    icon/               공통 Resource icon 주입과 kind별 fallback을 표시합니다.
    pinned/             6열 Pin grid, keyboard와 pointer reorder를 제공합니다.
    all/                Content·ExternalShortcut 목록과 4열 index를 제공합니다.
    root/               trigger, 검색 input과 Start browse/Search body를 조합합니다.
  search/
    input/              Taskbar의 실제 검색 input을 표시합니다.
    panel/              input과 Search panel을 조합합니다.
    body/               실제 결과·recent·추천·종류별 detail을 표시합니다.
    hooks/              Surface별 debounce·IME·keyboard·detail focus를 관리합니다.
  panels/
    connection/         headless primary panel 상태와 callback을 연결합니다.
    surface/            공통 panel 외형과 responsive bounds를 제공합니다.
    widget/             trigger, portal, focus, dismiss와 motion을 제공합니다.
  items/                파일 탐색기와 Chrome 앱 버튼을 표시합니다.
  timestamp/            현재 지역의 시간과 날짜를 표시합니다.
```

각 역할에 구현이 하나일 때는 해당 폴더의 `index.ts(x)`가 구현 진입점입니다. 역할 안에 독립적인
요소가 추가되면 하위 폴더로 나누고 상위 `index.ts`에서 공개 API를 모읍니다. Start와 Search는
독립 요소를 각각 `button`·`root`, `input`·`panel`로 나누고 역할의 `index.ts`에서 export합니다.

내부 동작은 각 owner의 `hooks/<hookName>/index.ts`에 둡니다. Widget은
`useTaskbarPanelTransition`, `useTaskbarPanelInteraction`, `useTaskbarPanelAnchor`를 조합하고,
anchor 좌표 계산은 `widget/utils/calculateTaskbarPanelAnchorRect`가 담당합니다.
Search panel의 `useTaskbarSearchInputFocus`는 input ref와 열림 시 focus를 제공하고,
Root의 `useTaskbarResponsivePanelDismiss`는 mobile 진입 시 panel 정리를 요청합니다.
Start pinned의 `useStartPinnedKeyboard`와 `useStartPinnedDrag`, 모두 보기의
`useTaskbarStartAllNavigation`은 각 owner 가까이에서 grid focus, pointer reorder와 category 탐색을
관리합니다. `TaskbarStartIcon`은 Start 내부 공유 Component이며 일반 Story와 인접 unit test에서
resolver 우선순위, fallback과 두 표시 크기를 검증합니다.
각 hook과 utility의 인접 테스트는 입력·출력, 중복 방지와 cleanup을 검증합니다.
이 내부 요소들은 package public API로 export하지 않습니다.

## 기본 사용

`TaskbarRoot`는 `HeadlessRuntimeProvider` 안에서 사용합니다. Root가 한 primary panel connection을
만들고 Start와 Search에 나누어 주므로 application은 별도 panel callback이나 검색어 상태를 전달하지
않습니다. Start의 current label, 모두 보기 목록과 ExternalShortcut URL에는 `resourceReaders`를
전달합니다. 실제 새 탭 open에는 runtime의 `externalNavigation` adapter가 필요합니다.

```tsx
import { HeadlessRuntimeProvider, TaskbarRoot, createHeadlessRuntime } from "@window/design";

const runtime = createHeadlessRuntime({
  adapters,
  fileExplorerResources,
  externalNavigation,
  windowPresentation,
});
// Catalog와 Workspace 준비 이후 검색 저장 기록을 복원합니다.
await runtime.search.initialize();

export const DesktopTaskbar = () => (
  <HeadlessRuntimeProvider runtime={runtime}>
    <TaskbarRoot resourceReaders={resourceReaders} />
  </HeadlessRuntimeProvider>
);
```

현재 Root는 Start와 Search의 trigger, panel lifecycle과 query 초기화를 연결합니다. Start의 pinned
grid, Content·ExternalShortcut 모두 보기와 category index는 제품 Component로 연결되어 있습니다.
Folder는 pinned에 표시할 수 있지만 모두 보기에는 표시하지 않습니다. 기본 검색 본문은 두 Surface에
자동 연결됩니다. Application은 결과별 callback을 제공하지 않습니다. `renderStartSearchBody`와
Search panel의 `children`은 선택적 본문 교체 경계입니다. 준비 전 Search는 Catalog나 저장소를 읽지
않으며, runtime을 준비하고 `search.initialize()`를 호출하는 순서는 Application이 관리합니다.

## 연결 경계

- headless는 active panel, Start·Search 상호 배제, 순차 전환과 query 초기화 시점을 관리합니다.
- Taskbar Product Component와 Base UI는 trigger와 content 관계, focus, Escape, outside dismiss,
  portal, placement와 presence를 관리합니다.
- Search는 Taskbar의 실제 input 하나를 panel trigger로 사용하며 panel 안에 중복 input을 만들지
  않습니다.
- Search에서 Escape를 누르면 input focus를 해제합니다. panel close 완료 뒤 query를 비우며 focus를
  복원하지 않습니다.
- Start pinned는 Folder, Content와 ExternalShortcut을 6열로 표시하고 현재 Catalog/Workspace label과
  첫·왼쪽·오른쪽 reorder capability를 사용합니다. `TaskbarRoot`의 공통 ResourceRef icon resolver를
  pinned와 모두 보기에 함께 적용하며, 누락 시 Folder는 File Explorer, Content는 Document,
  ExternalShortcut은 Link icon을 사용합니다.
- pointer drag 중에는 예상 destination 사이의 tile을 150ms로 미리 이동시키고 Store는 유지합니다.
  drop 때 최종 reorder Action을 한 번만 전달하며 Escape·pointer cancel·capture 상실은 원래 배치로
  복원합니다.
- 모두 보기는 Content와 ExternalShortcut을 A–Z, 한글 초성 ㄱ–ㅎ, 개별 0–9, # 순서로 표시합니다.
  Folder와 별도 ExternalShortcut 사용 가능 여부 filter는 없습니다.
- All/Index는 실제 heading scroll과 focus restore를 관리합니다. index는 항목이 있는 canonical
  key만 4열로 표시하고, 선택한 heading 위치를 먼저 맞춘 뒤 overlay를 닫습니다. 목록과 overlay의
  scale·opacity 전환 중 scrollbar는 숨깁니다.
- Resource는 Window commit 또는 이미 충족된 no-op, 혹은 external navigation adapter의 명시적
  성공 뒤 panel을 닫습니다. 거절·실행 오류·presentation 실패·external navigation 실패와 stale
  결과는 현재 panel과 browse/query 상태를 유지합니다. 초기화는 close transition 완료 뒤 일어납니다.
- Context Menu 제품 UI는 HDJG-49, Catalog·router·storage·navigation adapter와 실제 Window 화면의
  Application 조합은 HDJG-52–55·58에서 연결합니다.

상세 제품 정책은 Local Work Memory의 `Taskbar 기능 아키텍처`, `Taskbar Panel lifecycle 계약`,
`Taskbar Search 기능 계약`을 따릅니다.

검색 정본은 project `seojaewan/seojaewan-blog`의 `resource-search`
@`01a095bf-efe4-7052-9527-f212ece70bc0`, `taskbar-search`
@`01a095c0-6f90-7378-88a9-821b0a62b27e`, `taskbar-panel-lifecycle`
@`01a095c1-46c2-7f6e-9afc-3d52dd6c9a0d`입니다. 코드·검사는 checkout의 실행 결과를,
durable 정책과 개정은 Memory를, 후속 작업은 Gateway Work Item HDJG-47을 참조합니다.

현재 실제 Search open 성공으로 내부 생성한 primary panel exit transition은 UI registry에 handle이
전달되지 않습니다. `CloseCompletionContract`가 Popup exit 뒤 query 초기화 지연을 검출합니다.
정확한 내부 transition identity를 UI에 전달하는 headless 연결이 필요한 상태입니다.

## 검증

일반 Story는 안정된 시작 상태와 직접 조작 가능한 제품 예를 제공합니다. 자동 keyboard, focus,
dismiss, 전환 검사는 같은 fixture를 재사용하는 `*.test.stories.tsx`에 두고 `!dev`, `!autodocs` tag로
일반 sidebar와 Docs에서 숨깁니다.

- `*.test.tsx`: jsdom에서 결정적으로 관찰 가능한 제품 props, Action mapping과 정적 DOM 관계
- `*.test.stories.tsx`: Chromium에서 실제 keyboard, focus, portal, outside dismiss, category scroll,
  pointer drag, collision과 motion 결과
- 일반 `*.stories.tsx`: 대표 상태, responsive visual과 직접 조작 가능한 제품 사용 예

```sh
pnpm --filter @window/design test
pnpm --filter @window/design test:storybook
pnpm --filter @window/design build:storybook
```
