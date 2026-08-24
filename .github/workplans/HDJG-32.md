# HDJG-32 — [Core 12] WindowSession·active·zOrder·minimize/restore 상태 전이 구현

h2. 목적

하나의 Resource가 여러 독립 Session으로 열리는 Window semantic 상태와 focus stack을 구현한다.

h2. 범위

* WindowSession, sessions Record
* sessionOrder와 zOrder 분리
* activeSessionId
* open/activate/close/minimize/restore command
* position/size final commit

h2. 완료 조건

* 같은 Resource open마다 새 Session을 만든다.
* activate는 zOrder 최상위로 이동한다.
* active close/minimize 후 다음 visible Session을 활성화한다.
* inactive close/minimize는 기존 active를 유지한다.
* restore는 기존 Session을 normal, active, topmost로 만든다.
* Session은 새로고침 후 복원하지 않는다.

h2. 선행 단계

Core 07, Runtime 09

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* Core는 React, DOM, animation, localStorage, Notion을 모른다.
* 기준 문서: Local Work Memory의 최신 HDJG-2 architecture/decision Wiki

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-32
