# HDJG-54 — [Chrome 16] Shell·Tabs·Navigation·Omnibox·404

h2. 목적

Chrome 제품의 탭, navigation, 둥근 omnibox, 내부/외부 link와 전용 404를 common frame 위에 구현한다.

h2. 선행 작업

* HDJG-53
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* ChromeTab clone/close/restore/order/shortcut
* back/forward/refresh와 tab별 internal history
* 기본 둥근 omnibox, active 시 사각형 입력 상태, Folder식 오른쪽 검색 제거
* Content 제목 fuzzy candidate와 URL 확정
* 존재하지 않는 /{categorySlug}/{contentSlug}의 Chrome 404

h2. 완료 기준

* 내부 Content link는 같은 tab history, 새 탭/새 창 intent를 지원한다.
* 외부 link는 blank browser navigation으로 분리된다.
* 주소·tab title·404 history/refresh가 계약대로 테스트된다.

h2. Canonical Local Work Memory

* {{chrome-feature-architecture}}
* {{chrome-window-layout-responsive}}
* {{chrome-tab-navigation-history}}
* {{chrome-omnibox}}
* {{chrome-404}}
* {{application-resource-routing-404}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-54
