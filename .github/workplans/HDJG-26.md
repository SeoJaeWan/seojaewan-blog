# HDJG-26 — [Design 06] Window·Taskbar·Folder UI Component 재구축

h2. 목적

현재 `main`의 CSS Token과 project-owned primitive를 바탕으로 Window, Taskbar,
WindowPanel, Folder UI를 business data와 실행 상태에 독립적인 표현 component로
재구축한다.

h2. 범위

- WindowFrameUI, WindowTitleBarUI, WindowControlsUI
- TaskbarRootUI, TaskbarItemUI, TaskbarPreviewUI
- WindowPanelUI, FolderFrameUI, FolderViewerUI
- 기존 ContextMenuUI를 직접 사용하는 Window, Taskbar, Folder Story 조합
- active, background, fullscreen, dragging, entering, exiting, minimizing, restoring 표현 상태
- keyboard, focus, dismissal, reduced-motion과 container-query 검증

h2. 완료 조건

- component는 작은 표시 props, slot, native DOM props와 ID 없는 UI event만 노출한다.
- ResourceId, SessionId, Store, Runtime 또는 product business type을 public API에 노출하지
  않는다.
- Window, Taskbar, WindowPanel, Folder component는 Provider 없이 Storybook에서
  결정적으로 렌더링된다.
- Context Menu 예시는 별도 runtime alias 없이 기존 ContextMenuUI를 직접 조합한다.
- unit test와 Chromium Storybook test가 상태, 접근성, focus 복원, motion semantic
  equivalence를 검증한다.
- CSS class는 BEM을 따르고 값은 기존 Reference → Semantic → Component Token 계층을
  사용한다.

h2. 아키텍처 경계

- 구현과 public export는 `packages/design/src/ui`에만 둔다.
- `packages/design` UI는 Core, Shell, Application을 import하지 않으며 상태 저장,
  business action dispatch, global portal lifecycle을 소유하지 않는다.
- `packages/ui`와 `packages/shell`은 visual, asset, interaction, timing을 확인하는
  read-only legacy evidence로만 사용한다.
- Shell은 business entry, section, identifier, action dispatch와 window lifecycle을
  계속 소유한다.
- component aggregate는 project-owned UI symbol만 export하며 vendor type을 전달하지
  않는다.

h2. 선행 단계

Design 05

h2. 구현 순서

1. WindowFrameUI, WindowTitleBarUI, WindowControlsUI와 표현 상태를 구현한다.
2. TaskbarRootUI, TaskbarItemUI, TaskbarPreviewUI, WindowPanelUI를 구현한다.
3. 검증된 Window 계약 위에 FolderFrameUI와 FolderViewerUI를 조합한다.
4. component aggregate에서 아홉 component의 project-owned public API를 통합한다.
5. ContextMenuUI를 직접 사용하는 Story 조합과 browser interaction을 검증한다.

h2. 공통 아키텍처 기준

- 신규 구현 위치: `packages/design/src/ui`
- 기준 문서: Local Work Memory의 「Window Experience 디자인 시스템 아키텍처
  컨벤션」, 「UI 구현·리뷰 규칙」, 「Context Menu Architecture」,
  「Primitive Catalog」와 「HDJG-2 디자인 시스템 리뉴얼 논의 및 결정 기록」

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-26
