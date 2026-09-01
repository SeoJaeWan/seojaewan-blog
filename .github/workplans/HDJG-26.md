# HDJG-26 — [Design 06] Window·Taskbar·Folder UI Component 재구축 (Shape r3)

h2. 목적

현재 CSS Token과 project-owned Primitive를 바탕으로 Window, Taskbar, Folder의 22개
표현 role을 business data와 실행 상태에 독립적인 Component로 제공한다. 이 중 21개는
family 및 global UI entry의 public API이고 resize hit area 한 개는 Window family 내부
구현이다.

h2. Shape r3 범위와 제외

- Window, Taskbar, Folder의 21개 public role과 1개 family-local role을 완성한다.
- Window, Taskbar, Folder Product Reference는 실제 Component와 Primitive를 조합한다.
- WindowTitleBarUI, TaskbarItemUI, FolderFileCardUI의 Context Menu recipe는 기존
  ContextMenuUI를 직접 사용하며 별도 runtime alias를 만들지 않는다.
- active, background, fullscreen, dragging, entering, exiting, minimizing, restoring 표현
  상태와 keyboard, focus, dismissal, reduced-motion, container query를 검증한다.
- Bottom Sheet는 HDJG-26 범위에서 제외하며 public role, recipe 또는 완료 계약을 만들지
  않는다.

h2. Role inventory와 Primitive mapping

| Family  | Role                  | 공개 범위    | 직접 Primitive 또는 Component 조합 |
| ------- | --------------------- | ------------ | ---------------------------------- |
| Window  | WindowFrameUI         | public       | family-local resize handles 조합   |
| Window  | WindowTitleBarUI      | public       | slot composition                   |
| Window  | WindowTabUI           | public       | native presentation                |
| Window  | WindowControlsUI      | public       | IconButtonUI                       |
| Window  | WindowRouteBarUI      | public       | IconButtonUI                       |
| Window  | RouteInputUI          | public       | ComboboxUI                         |
| Window  | TagInputUI            | public       | SelectUI                           |
| Window  | WindowResizeHandlesUI | family-local | native pointer hit area            |
| Taskbar | TaskbarRootUI         | public       | native presentation                |
| Taskbar | TaskbarStartButtonUI  | public       | IconButtonUI                       |
| Taskbar | TaskbarSearchUI       | public       | InputUI                            |
| Taskbar | TaskbarAppListUI      | public       | native layout                      |
| Taskbar | TaskbarItemUI         | public       | IconButtonUI                       |
| Taskbar | TaskbarClockUI        | public       | native presentation                |
| Taskbar | TaskbarPreviewUI      | public       | caller Component slot              |
| Taskbar | WindowPanelUI         | public       | caller Component/Primitive slots   |
| Folder  | FolderFrameUI         | public       | WindowFrameUI + WindowTitleBarUI   |
| Folder  | FolderViewerUI        | public       | sidebar/content slots              |
| Folder  | FolderSidebarUI       | public       | native navigation/list             |
| Folder  | FolderCategoryItemUI  | public       | CollapsibleUI                      |
| Folder  | FolderFileGridUI      | public       | native layout                      |
| Folder  | FolderFileCardUI      | public       | ButtonUI                           |

21개 public role은 `components/{window,taskbar,folder}`, `components`, `ui`, package entry에서
같은 project-owned symbol로 import할 수 있어야 한다. WindowResizeHandlesUI는
WindowFrameUI가 사용하는 family-local implementation이며 aggregate 또는 global entry에서
export하지 않는다. Public prop/event는 React native/project-owned type만 노출하고 Base UI 등
vendor type을 전달하지 않는다.

h2. Selective parity matrix

`packages/ui`와 `packages/shell`은 read-only 시각·asset·interaction·timing evidence다. Shape
r3는 legacy 구조를 복제하지 않고 인식 가능한 치수와 동작만 선택적으로 보존한다.

| Role                  | 분류             | 보존하거나 새로 정의하는 기준                                 | 수동 visual review     |
| --------------------- | ---------------- | ------------------------------------------------------------- | ---------------------- |
| WindowFrameUI         | selective parity | 창 surface, geometry, foreground/background, transition state | Product Reference 필수 |
| WindowTitleBarUI      | selective parity | 30px chrome와 title/control 배치                              | Product Reference 필수 |
| WindowTabUI           | selective parity | 18px icon, 한 줄 title, 폭 제한                               | Product Reference 필수 |
| WindowControlsUI      | selective parity | minimize/maximize/restore/close icon action geometry          | Product Reference 필수 |
| WindowRouteBarUI      | selective parity | 36px history/route/tag row                                    | Product Reference 필수 |
| RouteInputUI          | new contract     | predefined route 검색과 ID-free event                         | Product Reference 필수 |
| TagInputUI            | new contract     | predefined tag 단일 선택과 ID-free event                      | Product Reference 필수 |
| WindowResizeHandlesUI | selective parity | edge/corner pointer hit area, fullscreen 제외                 | Product Reference 필수 |
| TaskbarRootUI         | selective parity | 50px fixed taskbar, blur, 중앙 control 배치                   | Product Reference 필수 |
| TaskbarStartButtonUI  | selective parity | Windows mark와 40px action                                    | Product Reference 필수 |
| TaskbarSearchUI       | selective parity | search field visual과 native input                            | Product Reference 필수 |
| TaskbarAppListUI      | new contract     | app item layout만 소유                                        | Product Reference 필수 |
| TaskbarItemUI         | selective parity | idle/running/active/disabled와 indicator                      | Product Reference 필수 |
| TaskbarClockUI        | selective parity | caller time, locale date/time 표시                            | Product Reference 필수 |
| TaskbarPreviewUI      | selective parity | hover preview surface와 deterministic motion state            | Product Reference 필수 |
| WindowPanelUI         | selective parity | Start panel surface와 responsive width                        | Product Reference 필수 |
| FolderFrameUI         | new composition  | 검증된 Window chrome 위 Folder slots                          | Product Reference 필수 |
| FolderViewerUI        | selective parity | container 기반 sidebar/content layout                         | Product Reference 필수 |
| FolderSidebarUI       | selective parity | category navigation/list surface                              | Product Reference 필수 |
| FolderCategoryItemUI  | selective parity | disclosure, selected, nested category                         | Product Reference 필수 |
| FolderFileGridUI      | selective parity | card size와 container-based wrapping                          | Product Reference 필수 |
| FolderFileCardUI      | selective parity | 3:2 cover, 한 줄 title, selected action                       | Product Reference 필수 |

수동 visual review는 Window, Taskbar, Folder, 세 Context Menu Product Reference를 Chromium에서
열어 role 식별 가능성, 겹침, focus ring, menu placement를 확인하고 통합 기록에 결과를 남기는
완료 gate다. 이 work item에는 screenshot baseline이 없으며 pixel-diff 승인을 주장하지 않는다.
향후 baseline을 추가하기 전까지 computed geometry/browser interaction과 수동 review를 함께
사용한다.

- 2026-09-01 Shape r3 local Chromium review: Window·Taskbar·Folder와 Context Menu target/menu가
  각각 식별 가능하고 주요 surface 겹침 없이 표시됨을 확인했다. 검토용 capture는 일시적 QA
  자료이며 repository screenshot baseline으로 추가하지 않았다.

h2. 완료 조건

- 21개 public role이 family/global project-owned entry에서 compile/import되고
  WindowResizeHandlesUI는 global export에 없다.
- Component는 작은 표시 props, slot, native DOM props와 ID 없는 UI event만 노출하며
  ResourceId, SessionId, Store, Runtime 또는 product business type을 노출하지 않는다.
- Product Reference는 Provider 없이 결정적으로 렌더링되고 재사용 가능한 role의 inline
  surrogate를 만들지 않는다.
- Context Menu recipe는 WindowTitleBarUI, TaskbarItemUI, FolderFileCardUI를 trigger로 사용하고
  Chromium에서 keyboard navigation, outside/Escape dismissal, focus restoration을 통과한다.
- component architecture check는 legacy/Core/Shell/Application 및 vendor implementation import를
  거부하고 21-role public contract와 9개 직접 Primitive consumer mapping을 검증한다.
- unit test와 Chromium Storybook test가 상태, 접근성, focus 복원, motion semantic equivalence를
  검증한다.
- CSS class는 BEM을 따르고 Reference → Semantic → Component Token 계층을 사용한다.

h2. 아키텍처 경계

- 구현과 public export는 `packages/design/src/ui`에만 둔다.
- `packages/design` UI Component는 Core, Shell, Application, legacy packages를 import하지 않고
  상태 저장, business action dispatch, global portal lifecycle을 소유하지 않는다.
- Shell은 business entry, section, identifier, action dispatch와 window lifecycle을 계속
  소유한다.
- Product-specific 시각은 Component token과 composition으로 만들며 Primitive 구현을 바꾸지
  않는다.
- architecture check는 role/consumer contract만 검사하고 무관한 repository snapshot 또는
  vendor 내부 구조를 고정하지 않는다.

h2. 구현 순서

1. Window 8-role inventory와 4개 직접 Primitive consumer를 검증한다.
2. Taskbar 8-role inventory와 3개 직접 Primitive consumer를 검증한다.
3. Folder 6-role inventory와 2개 직접 Primitive consumer를 검증한다.
4. 21개 public export 및 private resize role 경계를 family/global entry에서 검증한다.
5. 실제 Component를 조합한 Product Reference와 ContextMenuUI recipe browser interaction을
   검증한다.
6. selective parity matrix의 수동 visual review를 기록한다.

h2. 공통 아키텍처 기준

- 신규 구현 위치: `packages/design/src/ui`
- 선행 단계: Design 05
- 기준 문서: Local Work Memory의 「Window Experience 디자인 시스템 아키텍처 컨벤션」,
  「UI 구현·리뷰 규칙」, 「Context Menu Architecture」, 「Primitive Catalog」와
  「HDJG-2 디자인 시스템 리뉴얼 논의 및 결정 기록」

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-26
