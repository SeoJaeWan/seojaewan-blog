# HDJG-28 — [Core 08] Pin 모델·Command·Selector와 localStorage Persistence 구현

h2. 목적

Taskbar와 Window Panel Pin을 독립 target 상태로 구현하고 새로고침 후 복원한다.

h2. 범위

* PinState, pin/unpin/reorder command
* target별 selector와 duplicate no-op
* versioned localStorage adapter
* Catalog reconcile
* Change record와 단위 테스트

h2. 완료 조건

* 동일 Content는 target마다 최대 하나의 Pin을 가진다.
* 두 target에 동시에 Pin 가능하다.
* Unpin은 다른 target과 Session에 영향이 없다.
* target별 순서가 독립적이다.
* 삭제된 Content ID를 초기 reconcile에서 제거한다.
* 탭 간 live sync와 rollback을 도입하지 않는다.

h2. 선행 단계

Core 07

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* Core는 React, DOM, animation, localStorage, Notion을 모른다.
* 기준 문서: Local Work Memory의 최신 HDJG-2 architecture/decision Wiki

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-28
