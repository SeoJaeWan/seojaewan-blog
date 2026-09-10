# HDJG-52 — [Folder 14] Shell·Tabs·Address·History·Sidebar·Status

## 목적

[PR #33](https://github.com/SeoJaeWan/seojaewan-blog/pull/33)에서 Common Window 위에 File Explorer 제품 UI를 조합하고, 탭·주소·탐색·검색·Sidebar·보기·상태·반응형 동작을 실제 headless 실행 경계에 연결한다.

이 문서는 구현 완료 보고서가 아니라 현재 구현 계약과 검증 계획이다. 기존 PR 본문의 `no-new-headless` 방침과 주소·refresh·검색·보기·status 보류는 최신 Shape와 충돌하므로 적용하지 않는다. 아래 범위를 지원하는 headless model, selector, Action, controller를 이 작업에서 함께 구현한다.

## 기준과 선행 작업

- 기준 commit: `21924ad0300d6be802480c7055330e5156b02b51` (`main`)
- 선행 작업: HDJG-51
- Shape Artifact: `memory://seojaewan/seojaewan-blog/HDJG-52/analysis/01a08953-1528-733f-bb71-20969f5e375e`
- Shape 상태: READY, blockers 없음, unresolved questions 없음
- Jira: [HDJG-52](https://seojaewan.atlassian.net/browse/HDJG-52)

구현 중 checked-in source와 이 문서가 canonical Memory의 현재 계약과 다르면 문서 drift로 기록하고 현재 계약에 맞춰 명시적으로 조정한다.

## PR #33 포함 범위

### 탭과 탐색 기록

- File Explorer Window와 tab strip을 Common Window에 조합한다.
- 새 탭은 같은 Window 끝에 Desktop 위치, 빈 history, scroll 0으로 만들고 활성화한다.
- 탭은 최소 폭 이후 좌우 overflow control을 사용하며 native scrollbar를 숨긴다. 새 탭과 활성 탭은 viewport 안으로 이동한다.
- tab focus에서 Left/Right로 인접 탭을 선택하고 끝에서 순환한다.
- 마지막 탭을 닫으면 Window를 닫는다.
- 정상 location과 `unresolved-path`를 같은 navigation stack의 일반 entry로 저장하고 back/forward로 복원한다.

### 주소와 오류 상태

- 정상 위치는 breadcrumb로 표시하고 뒤쪽 빈 영역 click으로 현재 절대 경로 전체가 선택된 input으로 전환한다.
- Desktop 경로는 `/`이며 Folder path는 저장된 casing을 표시한다. segment 비교는 case-insensitive이고 trailing `/`는 무시한다.
- Enter 전 Esc 또는 focus-out은 편집 전 값을 복원하고 breadcrumb로 돌아간다. 제출 전에는 Content를 바꾸지 않는다.
- 정상 경로 Enter 후 Content viewport에 focus를 옮기되 항목을 자동 선택하지 않는다.
- 없는 경로는 `unresolved-path` entry로 남기고 제출 문자열을 input에 유지한다. Esc로 오류 상태를 닫지 않는다.
- 오류 Content에서는 Folder를 찾을 수 없음을 표시하고 Sidebar selection, search/view control, item count를 비운다. Sidebar expansion과 width는 유지한다.
- 긴 breadcrumb는 중간 조상을 `…`로 접고 메뉴에서 해당 조상으로 이동할 수 있게 한다.

### refresh와 검색

- refresh는 Catalog fetch나 browser/data reload가 아니라 Explorer runtime 상태를 전이하는 동작이다.
- 정상 위치의 refresh는 query와 selection을 비우고 scroll을 0으로 만들며 location, history, view/sort, Sidebar expansion/width를 유지한다.
- `unresolved-path`의 refresh는 같은 path를 다시 해석하며 새 history entry를 만들지 않는다. 해석에 성공하면 현재 entry를 정상 location으로 교체한다.
- 검색은 현재 위치의 direct child Folder, Content, ExternalShortcut 표시 이름에 case-insensitive contains를 즉시 적용한다.
- Enter나 debounce는 사용하지 않고 IME composition 확정 뒤 matching한다.
- query는 tab-local runtime 상태이며 location 이동과 refresh에서 비운다. view/sort 변경에서는 query, selection, scroll을 유지한다.
- 검색 결과가 0개면 `검색 결과가 없습니다` 상태를 표시한다.

### Sidebar와 Folder mutation

- Desktop을 첫 행으로 두고 nested Folder만 표시한다. sibling은 case-insensitive 이름 오름차순으로 정렬한다.
- row click/Enter는 현재 탭을 탐색하고 focus는 해당 행에 유지한다. 화살표는 펼침 상태만 바꾼다.
- Up/Down은 visible row focus를 이동하고 Left/Right는 collapse/expand를 수행한다.
- 외부 navigation은 ancestor를 자동으로 펼쳐 현재 행을 보이게 하되 focus를 가져오지 않는다.
- 우클릭은 navigation이나 selection을 바꾸지 않고 invocation row만 Context Menu target으로 사용한다.
- expansion은 tab-local runtime, width는 window-local runtime이며 reload에 저장하지 않는다. width는 pointer drag만 지원한다.
- 새 폴더 이름은 `새 폴더`, `새 폴더 (2)` 순으로 가장 작은 빈 번호를 제안한다.
- create/rename은 inline input에서 Enter로 확정하고 Esc 또는 focus-out으로 취소한다. 검증 거절 시 input, focus, 오류를 유지한다.
- `committed: true` storage failure에서는 반영된 결과를 유지하고 같은 mutation을 다시 실행하지 않는다.
- Desktop Context Menu는 새 폴더와 새 창에서 열기를 제공한다.
- Folder Context Menu는 열기, 새 창에서 열기, 새 폴더, 이름 바꾸기, 시작 화면 Pin을 제공한다.
- Folder 이름은 Windows형 금지 문자·예약 장치명·길이·trailing space/period 규칙과 같은 parent의 normalization/case-insensitive uniqueness를 Workspace Store commit 전에 검증한다.

### 보기·status·mobile

- desktop status bar는 현재 표시 수, selection 수, search result 수를 표시한다.
- Details와 Medium Icons quick view는 현재 보기의 pressed 상태를 표시한다.
- view/sort/details-column 설정은 location별로 저장하고 같은 Folder를 보는 desktop tab과 Window가 공유한다. view 변경은 query, selection, scroll을 유지한다.
- mobile은 title/close, back/forward/refresh/address, full-width 검색, Content만 표시한다.
- mobile은 Medium Icons로 고정하고 Sidebar, status, tab 추가, minimize, maximize, resize, move를 제공하지 않는다.

### headless와 제품 조합 경계

- WindowStore는 resolved location과 `unresolved-path`, tab-local query/expansion/selection, window-local Sidebar width, history/refresh 상태 전이를 소유한다.
- WorkspaceStore는 Folder 이름 mutation invariant를 소유하고 path resolver, breadcrumb, Sidebar tree, 새 폴더 이름 제안을 pure selector로 제공한다.
- Folder view settings는 location-global persistent Store로 분리한다.
- FileExplorerWindow는 Window, Workspace, Start, view settings를 read model과 Action으로 조합하는 Product composition root다.
- Tabs, Input, Context Menu는 Product Component에서 Base UI를 직접 조합하며 headless public API에 DOM, ref, Base UI type을 노출하지 않는다.

## HDJG-53 / PR #34 경계

[HDJG-53 / PR #34](https://github.com/SeoJaeWan/seojaewan-blog/pull/34)는 Resource 본문 항목 렌더링, 항목 selection gesture, 항목과 빈 Content 영역의 Context Menu를 소유한다.

PR #33은 #34가 소비할 정렬·검색된 Resource ref, selection 상태, empty/error 상태의 Content read model까지만 제공한다. 임시 item grid나 가짜 selection gesture, Content Context Menu를 만들어 #34 범위를 선점하지 않는다. Sidebar Context Menu는 PR #33 범위다.

## 제외 범위

- closed tab restore, clone, tab reorder/detach, parent/up control
- legacy command bar의 create/cut/copy/paste/share/delete UI
- Folder별 Taskbar pin, 새 탭에서 열기, delete/trash
- body item rendering, selection gesture, item/empty Content Context Menu — HDJG-53 / PR #34
- Ctrl+Tab, Ctrl+Shift+Tab, Ctrl/Cmd+L, Ctrl+Shift+1..8, Ctrl+mouse-wheel
- Sidebar width의 keyboard 조절과 double-click reset
- 실제 browser URL/history 변경, browser reload, Catalog/data reload

## 불변 조건

- Desktop은 `null` location이다.
- Explorer Window에는 항상 최소 한 탭이 있고 `activeTabId`는 실제 탭을 가리킨다.
- `unresolved-path`는 navigation stack의 일반 entry다.
- query와 Sidebar expansion은 tab-local, Sidebar width는 window-local, view settings는 location-global persistent state다.
- Workspace mutation 거절은 snapshot, notification, save를 만들지 않는다.
- `committed: true` storage failure는 memory state를 rollback하지 않는다.
- Explorer path/query는 browser URL/history를 바꾸지 않는다.
- 이 문서는 구현 범위를 정의하며 구현 또는 시각 동등성 완료를 주장하지 않는다.

## 검증 기준

1. 정상 location과 `unresolved-path`를 섞은 navigate/back/forward/refresh, 같은 정상 path no-op, query/selection/scroll 보존 표를 headless unit test로 검증한다.
2. path resolver, breadcrumb, Sidebar tree, 새 폴더 제안, name validation과 sibling duplicate를 pure selector/Store test로 검증한다.
3. 검색 direct-child/kind/IME/query lifetime과 view/sort 변경 시 query·selection·scroll 보존을 검증한다.
4. view settings의 location 공유, reload 복원, mobile 무시, write failure, stale Folder 정리를 검증한다.
5. production FileExplorerWindow가 정확한 Window, Workspace, Start, view Action과 target/count에 연결되는지 component integration test로 검증한다.
6. tab overflow/scroll-into-view, address focus, Sidebar keyboard/focus, splitter drag를 Storybook Chromium에서 검증한다.
7. Sidebar Context Menu portal/keyboard/Escape/outside dismissal과 invocation target 유지를 browser test로 검증한다.
8. desktop/mobile Story를 legacy reference와 같은 viewport에서 비교하고 의도적인 차이를 기록한다.
9. design tests, Storybook browser tests, typecheck, lint와 repository verify를 통과한다.
10. #34 소유인 body item rendering, selection gesture, Content Context Menu가 diff에 없는지 확인한다.

## Canonical Local Work Memory

아래 revision을 이 작업의 구현 기준으로 고정한다.

- `folder-tab-navigation-history@01a0893e-2cb9-72af-8b75-77556d92bab8`
- `folder-search@01a0893e-d089-771c-a39a-1cd31b49d852`
- `folder-sidebar@01a08940-6683-7668-8129-af4f7f723d7f`
- `folder-view-sort-settings@01a08941-25c9-7a9a-a2e0-baa92d293f0d`
- `folder-window-layout-responsive@01a08941-f956-75cd-9daf-a9fb3537e3c8`
- `workspace-resource-placement@01a0893f-9c7f-77d1-a80a-3610cfffd5d7`
- `folder-feature-architecture@01a07a56-5890-748a-8f02-62193a5a8051`
- `base-ui-product-composition-contract@01a07a71-54e2-7213-9167-0f925335b245`
- `context-menu-architecture@01a06bf6-04f5-7324-80f0-83e6b7178afe`
- `common-window-frame-interaction@01a08511-9bfb-7ba7-a2d8-2e859c7a0c67`

## 전달 규칙

PR #33 본문은 이 문서의 현재 포함·제외 범위와 #34 경계에 맞춰 후속 수동 전달 단계에서 동기화한다. 이 작업계획 변경에서는 PR 본문 갱신, push, merge를 수행하지 않는다.
