# HDJG-41 — [Foundation 03] WindowSession·FileExplorerTab·ChromeTab 상태 모델

## 목적

File Explorer와 Chrome의 WindowSession·FileExplorerTab·ChromeTab 상태와 전이를 정적 WindowStore로 구현한다. Folder는 Workspace Resource이며 두 앱은 공통 frame을 사용하는 독립 제품이다.

## 선행 작업

- HDJG-40 완료 및 main 병합: `0bb86124b498ca67028fe6731cf011656c3378b4`
- 구현 준비 시 최신 canonical Memory를 확인하고 Shape/Prepare에 revision을 고정한다.

## 범위

- WindowState의 sessions, stackingOrder, activeSessionId와 WindowFrameState의 normalBounds, placement, minimized를 모델링한다. z-index와 maximized bounds는 파생한다.
- 공개 변경 진입점은 WindowStore의 static 명령이다. snapshot·명령 계산·commit·Session/tab ID 발급은 내부가 소유한다.
- FileExplorerTab·ChromeTab 생성·선택·종료, 독립 navigation history·scroll과 Chrome reloadRevision을 구현한다.
- Folder 외부 열기는 active tab exact-match Window를 재사용하고, Content 기본 열기는 활성/MRU Chrome Window에 새 tab을 만든다.
- active close/minimize 뒤 최상위 visible Window를 자동 활성화한다. inactive close/minimize는 기존 active를 유지한다.
- 숫자 기반 frame·placement와 workArea 변경, desktop 다중 세션·mobile 최대 한 세션 규칙을 구현한다.
- active Chrome의 active tab에서 route projection을 파생한다. WindowState는 runtime-only이며 reload 복원 대상이 아니다.

## 모바일 규칙

- 일반 tab 종료는 남은 tab과 Window를 유지한다.
- 마지막 Chrome tab 또는 Window 전체의 명시적 종료에서만 복귀 규칙을 적용한다. 전체 종료는 종료 직전 active tab 기준이다.
- 정상 Content: 현재 Workspace parent Folder의 새 File Explorer를 연다. parent null이면 Desktop 위치의 File Explorer를 연다.
- new-tab·404: 새 창 없이 Desktop을 표시한다. 다른 tab/history의 Content로 대체하지 않는다.
- desktop→mobile: 최소화된 창을 모두 닫고 active 창 하나만 유지한다. active가 없으면 최상위 visible 창을 남기고 활성화한다. 보이는 창이 없으면 창 없이 Desktop을 표시한다.
- 다른 앱으로의 교체와 responsive 정리에서는 Folder 복귀를 연쇄 실행하지 않는다.
- mobile→desktop에서 닫힌 세션은 복원하지 않는다.

## 계층 경계

- tab 복제·닫은 tab 복원·drag reorder·detach는 이번 Foundation 범위에서 제외한다.
- UI frame·pointer capture·animation 구현은 HDJG-51, Operation animation 완료·취소 조율은 HDJG-43, 실제 router/bootstrap 연결은 HDJG-58이 소유한다.
- headless는 DOM·React·UI·Application 구현을 import하지 않는다. 독립 mutation 함수와 내부 ID generator를 package public API로 노출하지 않는다.

## 완료 기준

- Store 공개 명령과 selector를 통해 Session/tab/history/frame 불변식, 거절과 no-op, 입력 불변성을 검증한다.
- 공통 Window 상태와 File Explorer/Chrome 고유 tab 상태가 분리된다.
- active close/minimize, 마지막 tab 종료, 모바일 앱 교체·종료·responsive 전이와 route projection을 headless test로 검증한다.
- 제품 UI·browser·Application E2E 검증은 해당 구현을 소유한 후속 작업에서 수행한다.

## Canonical Local Work Memory

- `window-session`
- `folder-tab-navigation-history`
- `chrome-tab-navigation-history`
- `taskbar-mobile`
- `common-window-frame-interaction`
- `application-resource-routing-404`
- `product-surfaces-window-shell`
- `state-ownership`
- `workspace-resource-placement`
- `module-boundaries`

## Jira

- [HDJG-41](https://seojaewan.atlassian.net/browse/HDJG-41)
