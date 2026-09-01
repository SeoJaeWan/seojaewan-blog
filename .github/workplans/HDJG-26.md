# HDJG-26 — UI/headless 기반 Window·Folder·Taskbar 결과 재구성 (Shape r4)

## 목적과 경계

`packages/ui`의 구조를 runtime으로 옮기지 않고, 관찰 가능한 props·JSX·CSS·asset·variant·
responsive 결과를 증거로 삼아 `packages/design`을 재구성한다. `ui`와 `headless`는 서로
import하지 않는 형제 경계이며 Application이 둘을 조합한다. UI는 렌더링, DOM lifecycle,
focus, portal, placement, presence와 widget-local pointer 상태를 소유한다. headless는 제품
상태와 규칙을 소유한다.

완성형 제품 조합은 소유 family의 Component다. `components/common`은 같은 계약의 두 번째
소비자가 확인되기 전에는 만들지 않는다. legacy package는 아래 inventory를 위한 read-only
evidence이며 runtime dependency가 아니다.

## Evidence inventory 규칙

- 분류값은 `match`, `intentional divergence`, `higher-layer`, `docs-only` 중 하나다.
- `match`는 현재 production Component가 결과를 소유함을 뜻한다.
- `higher-layer`는 지정된 후속 task가 production Component로 결과를 소유함을 뜻한다.
- `intentional divergence`는 legacy 구조 대신 현재 UI/headless 결정으로 대체함을 뜻한다.
- `docs-only`는 시각/동작 근거로만 남고 runtime API가 되지 않음을 뜻한다.
- architecture check는 아래 evidence 경로를 source tree에서 발견한다. 새 production
  Component family와 export는 이름 allowlist 수정 없이 자동 발견한다.

## Legacy owner matrix

각 행의 evidence는 `index.tsx`의 props/JSX와 같은 디렉터리 CSS/Story를 함께 포함한다.

| Evidence source                                                                    | 관찰 role·상태                                                  | 분류                   | `packages/design` owner                                    |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------- |
| `packages/ui/src/components/window/windowFrameUI/index.tsx`                        | frame, folder/file, active/background, fullscreen, drag, motion | match                  | window / TASK-002 확장                                     |
| `packages/ui/src/components/window/chrome/windowTitleBarUI/index.tsx`              | title row, pointer drag, fullscreen toggle                      | match                  | window / TASK-002 확장                                     |
| `packages/ui/src/components/window/chrome/windowTabUI/index.tsx`                   | icon/title tab chrome                                           | match                  | window                                                     |
| `packages/ui/src/components/window/chrome/windowControlsUI/index.tsx`              | minimize, maximize/restore, close                               | match                  | window / TASK-002 확장                                     |
| `packages/ui/src/components/window/chrome/windowResizeHandlesUI/index.tsx`         | edge/corner directions and pointer start                        | match                  | window family-local / TASK-002                             |
| `packages/ui/src/components/window/chrome/windowRouteBarUI/index.tsx`              | history, route, tag row                                         | match                  | window                                                     |
| `packages/ui/src/components/window/input/routeInputUI/index.tsx`                   | edit/open/value and folder/file visual                          | match                  | window                                                     |
| `packages/ui/src/components/window/input/tagInputUI/index.tsx`                     | open, selected tag, clear/select                                | match                  | window                                                     |
| `packages/ui/src/components/window/folder/folderViewerUI/index.tsx`                | sidebar/content split                                           | match                  | folder / TASK-004 aggregate                                |
| `packages/ui/src/components/window/folder/folderSidebarUI/index.tsx`               | category navigation surface                                     | match                  | folder / TASK-004 extension                                |
| `packages/ui/src/components/window/folder/folderCategoryItemUI/index.tsx`          | disclosure, selection, nested item                              | higher-layer           | folder / TASK-004 separates actions                        |
| `packages/ui/src/components/window/folder/folderFileGridUI/index.tsx`              | big/middle/small responsive grid                                | match                  | folder / TASK-004 aggregate                                |
| `packages/ui/src/components/window/folder/folderFileCardUI/index.tsx`              | cover/title/selected action                                     | match                  | folder / TASK-004 extension                                |
| `packages/ui/src/components/taskbar/taskbarRootUI/index.tsx`                       | fixed root and centered controls                                | match                  | taskbar / TASK-003 aggregate                               |
| `packages/ui/src/components/taskbar/taskbarAppListUI/index.tsx`                    | running app layout                                              | match                  | taskbar / TASK-003                                         |
| `packages/ui/src/components/taskbar/taskbarClockUI/index.tsx`                      | caller-provided date/time                                       | match                  | taskbar / TASK-003                                         |
| `packages/ui/src/components/taskbar/taskbarSearchUI/index.tsx`                     | search trigger/input/open visual                                | match                  | taskbar / TASK-003                                         |
| `packages/ui/src/components/taskbar/button/taskbarStartButtonUI/index.tsx`         | Windows mark trigger                                            | match                  | taskbar / TASK-003                                         |
| `packages/ui/src/components/taskbar/button/taskbarIconButtonUI/index.tsx`          | open/active/running/dragging visual                             | higher-layer           | taskbar item / TASK-003                                    |
| `packages/ui/src/components/taskbar/button/taskbarTaskButtonUI/index.tsx`          | product task item adapter                                       | intentional divergence | presentation DTO in taskbar; product action stays headless |
| `packages/ui/src/components/taskbar/button/panelIconButtonUI/index.tsx`            | panel tile, line clamp, selection                               | higher-layer           | taskbar family-local / TASK-005                            |
| `packages/ui/src/components/taskbar/input/taskSearchInputUI/index.tsx`             | query input and disabled state                                  | higher-layer           | taskbar search view / TASK-005                             |
| `packages/ui/src/components/taskbar/panel/taskbarPanelLayerUI/index.tsx`           | floating portal layer                                           | higher-layer           | private taskbar UI lifecycle / TASK-003                    |
| `packages/ui/src/components/taskbar/panel/taskbarPanelContainerUI/index.tsx`       | opening/closing presence container                              | higher-layer           | private taskbar UI lifecycle / TASK-003                    |
| `packages/ui/src/components/taskbar/panel/windowsPanelUI/index.tsx`                | Start surface and search header                                 | higher-layer           | taskbar / TASK-003 then TASK-005                           |
| `packages/ui/src/components/taskbar/panel/searchPanelUI/index.tsx`                 | recommendation/result/detail surface                            | higher-layer           | taskbar / TASK-005                                         |
| `packages/ui/src/components/taskbar/panel/taskHoverPanelUI/index.tsx`              | hover preview surface                                           | higher-layer           | taskbar / TASK-005                                         |
| `packages/ui/src/components/taskbar/panel/taskbarContextMenuUI/index.tsx`          | task context actions and placement                              | higher-layer           | taskbar / TASK-005                                         |
| `packages/ui/src/components/taskbar/view/windowsPanelPinnedViewUI/index.tsx`       | pinned grid                                                     | higher-layer           | taskbar / TASK-005                                         |
| `packages/ui/src/components/taskbar/view/windowsPanelAllViewUI/index.tsx`          | all apps and category overlay                                   | higher-layer           | taskbar / TASK-005                                         |
| `packages/ui/src/components/taskbar/view/taskSearchRecommendationViewUI/index.tsx` | deterministic recommendations                                   | higher-layer           | taskbar / TASK-005                                         |
| `packages/ui/src/components/taskbar/view/taskSearchResultViewUI/index.tsx`         | result list and selected detail                                 | higher-layer           | taskbar / TASK-005                                         |
| `packages/ui/src/components/base/panel/scaledPreviewUI/index.tsx`                  | scaled window preview geometry                                  | higher-layer           | taskbar family-local / TASK-005                            |
| `packages/ui/src/components/base/panel/taskPanelUI/index.tsx`                      | generic translucent panel shell                                 | intentional divergence | owner-specific taskbar surfaces / TASK-003                 |

Source discovery 결과 위 범위의 미분류 role은 없다. legacy의 product identifier, action chain,
store/provider 연결은 시각 role이 아니며 headless/Application 소유로 분리한다.

## CSS, variants, responsive evidence

| Evidence                                                                                       | 관찰 결과                                                                                                  | owner/disposition              |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `packages/ui/src/components/window/windowFrameUI/windowFrameUI.css`                            | folder/file header, active/background, fullscreen, dragging, open/close/minimize/restore, desktop geometry | window; 결과 보존              |
| `packages/ui/src/components/window/chrome/windowControlsUI/windowControlsUI.css`               | mobile control reduction                                                                                   | window; TASK-002 browser check |
| `packages/ui/src/components/window/chrome/windowResizeHandlesUI/windowResizeHandlesUI.css`     | desktop edge/corner hit areas                                                                              | window family-local            |
| `packages/ui/src/components/window/input/routeInputUI/routeInputUI.css`                        | folder/file and editing state                                                                              | window                         |
| `packages/ui/src/components/window/input/tagInputUI/tagInputUI.css`                            | active/open selection surface                                                                              | window                         |
| `packages/ui/src/components/window/folder/folderSidebarUI/folderSidebarUI.css`                 | container-width sidebar behavior                                                                           | folder; TASK-004               |
| `packages/ui/src/components/window/folder/folderFileGridUI/folderFileGridUI.css`               | mobile wrapping                                                                                            | folder; TASK-004               |
| `packages/ui/src/components/window/folder/folderFileCardUI/folderFileCardUI.css`               | view-size card metrics and mobile                                                                          | folder; TASK-004               |
| `packages/ui/src/components/taskbar/taskbarClockUI/taskbarClockUI.css`                         | desktop-only expanded clock                                                                                | taskbar; TASK-003              |
| `packages/ui/src/components/taskbar/panel/taskbarPanelContainerUI/taskbarPanelContainerUI.css` | opening/closing presence timing                                                                            | private taskbar UI; TASK-003   |
| `packages/ui/src/components/taskbar/view/windowsPanelAllViewUI/windowsPanelAllViewUI.css`      | category overlay open state                                                                                | taskbar; TASK-005              |

Reduced motion은 각 family의 production Story browser check에서 검증한다. 고정 screenshot
baseline은 없으므로 동일 viewport/state의 computed geometry, public DOM interaction, 수동
side-by-side 결과를 기록하되 pixel approval을 주장하지 않는다.

## Asset ownership

| Evidence asset                               | 분류                            | owner                                              |
| -------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| `packages/ui/src/assets/windows.svg`         | fixed project mark              | taskbar asset / TASK-003                           |
| `packages/ui/src/assets/windows.webp`        | fixed legacy rendering evidence | docs-only; SVG 우선                                |
| `packages/ui/src/assets/task-input-mask.svg` | fixed taskbar field mask        | taskbar asset candidate / TASK-003                 |
| `packages/ui/src/assets/file.png`            | fixed file glyph                | window/folder asset / TASK-002·004                 |
| `packages/ui/src/assets/folder.png`          | fixed folder glyph              | folder asset / TASK-004                            |
| `packages/ui/src/assets/github.png`          | product app identity            | Application-injected asset / TASK-005 fixture only |
| `packages/ui/src/assets/linkedIn.png`        | product app identity            | Application-injected asset / TASK-005 fixture only |

## Active Primitive requirements

HDJG-26 production parity는 ButtonUI, IconButtonUI, InputUI, ComboboxUI, SelectUI,
ContextMenuUI, PopoverUI, CollapsibleUI를 조합한다. Primitive checker는 디렉터리를 자동
발견하고 각 family의 단일 public widget과 aggregate export를 검증한다. MenuUI와 DialogUI는
삭제하지 않지만 이 작업의 required set이나 완료 근거로 사용하지 않는다. 새 Primitive는
추가하지 않는다.

## Discovery gates

- production Component family 디렉터리와 family index를 자동 발견한다.
- public export가 concrete production source에 연결되는지 검증한다.
- public이 아닌 production Component가 family-local consumer 없이 orphan인지 검증한다.
- family Story 부재와 Story-only `*UI` 구현을 검출한다.
- UI에서 legacy package, Application, headless, retired layer, vendor implementation import를
  검출한다.
- generated fixture로 additive Component export가 allowlist 변경 없이 통과하고 illegal import가
  실패하는지 검증한다.
- legacy source-only composition이 이 owner matrix에 모두 분류됐는지 검증한다.
- token family는 파일 namespace로 자동 확장되며 이름 개수를 완료 계약으로 사용하지 않는다.

## Delivery sequence

1. TASK-001: 이 inventory, UI/headless root와 discovery gates를 확립한다.
2. TASK-002: Window chrome, FileWindow/FileViewport와 UI-local gestures를 완성한다.
3. TASK-003: Taskbar foundation과 private lifecycle을 완성한다.
4. INT-001: Window/File과 Taskbar foundation을 통합한다.
5. TASK-004: FolderWindow와 disclosure/selection/child-file 결과를 완성한다.
6. TASK-005: Taskbar views, preview, context menu와 aggregate를 완성한다.
7. INT-002: global exports, Product References, provider descriptions와 전체 gate를 봉인한다.

## 완료 조건

- legacy source discovery에서 unowned observed role이 없다.
- package root와 test/lint project는 UI/headless 경계만 사용한다.
- additive valid Component는 checker allowlist 변경 없이 통과한다.
- production UI에서 legacy runtime import와 headless import가 없다.
- 현재 required Primitive가 존재하고 candidate Primitive가 required로 오인되지 않는다.
- design lint, typecheck, unit tests가 통과한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-26
