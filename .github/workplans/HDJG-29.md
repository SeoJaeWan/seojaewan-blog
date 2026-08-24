# HDJG-29 — [Runtime 09] Context/useReducer Runtime과 Action Gateway 구현

h2. 목적

별도 Store library 없이 Core semantic state를 제공하고 모든 Surface Action을 단일 실행 경로로 연결한다.

h2. 범위

* WindowStateContext/WindowDispatchContext
* useWindowSelector/useWindowActions
* feature command composition reducer
* Action Gateway와 OperationHandle
* Runtime/Catalog/persistence dependency injection

h2. 완료 조건

* UI component가 Context를 직접 읽지 않는다.
* Provider는 Runtime/adapter를 주입하는 얇은 경계다.
* 거대한 callback props와 Surface 간 직접 호출이 없다.
* committed/presented/settled 의미가 정의된다.
* 고빈도 drag/animation progress를 reducer에 넣지 않는다.

h2. 선행 단계

Core 07, Core 08

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* Core는 React, DOM, animation, localStorage, Notion을 모른다.
* 기준 문서: Local Work Memory의 최신 HDJG-2 architecture/decision Wiki

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-29
