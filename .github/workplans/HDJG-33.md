# HDJG-33 — [Shell 13] Window Connector와 Lifecycle Animation 구현

h2. 목적

Core WindowSession을 WindowFrame UI에 연결하고 close/minimize/open/restore의 Operation과 visual lifecycle을 구현한다.

h2. 범위

* WindowSession connector와 View Model
* activate, close, minimize, restore Operation
* Transition Coordinator 연결
* drag/resize local state와 final bounds commit
* Context Menu Action 연결

h2. 완료 조건

* WindowFrame UI는 Store/Content를 직접 읽지 않는다.
* Close/Minimize는 animation 완료 후 Core를 commit한다.
* Open은 Session 생성 후 enter animation을 수행한다.
* Activate는 active/zOrder를 즉시 변경한다.
* closing 중 같은 Resource open은 새 Session으로 독립 실행된다.
* animation cancel/supersede 정책이 테스트된다.

h2. 선행 단계

Design 06, Transition 11, Core 12

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* 기존 구현은 visual/interaction reference로만 사용한다.
* 기준 문서: Local Work Memory의 최신 HDJG-2 architecture/decision Wiki

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-33
