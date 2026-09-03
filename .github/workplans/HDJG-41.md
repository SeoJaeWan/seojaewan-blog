# HDJG-41 — [Foundation 03] WindowSession·FolderTab·ChromeTab 상태 모델

h2. 목적

Folder와 Chrome을 sibling 제품으로 유지하면서 WindowSession, tab, active, z-order, mobile 단일 세션 규칙을 headless 상태로 확정한다.

h2. 선행 작업

* HDJG-40
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* WindowSession identity, kind, active, zOrder, minimized, bounds
* FolderTab·ChromeTab 생성·복제·활성·종료·닫은 탭 복원
* desktop 다중 세션과 mobile 최대 1개 세션 invariant
* 창을 닫거나 최소화했을 때 route와 다른 창 자동 활성화 금지

h2. 완료 기준

* 세션과 탭 전이가 pure reducer/selector test로 검증된다.
* Folder와 Chrome의 공통점은 common shell 계약으로, 제품 상태는 각 tab 모델로 분리된다.
* mobile에서 Folder→Chrome open 시 기존 Folder가 닫히는 규칙이 검증된다.

h2. Canonical Local Work Memory

* {{window-session}}
* {{folder-tab-navigation-history}}
* {{chrome-tab-navigation-history}}
* {{product-surfaces-window-shell}}
* {{state-ownership}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-41
