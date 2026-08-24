# HDJG-30 — [Slice 10] Taskbar Context Menu에서 Window Panel Pin까지 Vertical Slice 구현

h2. 목적

Resource Action, Core Pin, selector, animation과 persistence 경계가 실제 교차 Surface 흐름에서 동작하는지 검증한다.

h2. 흐름

Taskbar Context Menu → resource.pin Action → Action Gateway → Core Pin commit → Window Panel selector update → enter animation → localStorage → Operation settled

h2. 완료 조건

* Taskbar가 Window Panel component/callback을 알지 않는다.
* Menu Entry에는 실행 callback 대신 Action descriptor가 있다.
* Window Panel이 selector 변경으로 자동 갱신된다.
* 중복 Pin은 no-op이다.
* animation 0 duration에서도 같은 semantic 결과가 나온다.
* 새로고침 후 Pin이 복원된다.

h2. 선행 단계

Design 05, Design 06, Core 08, Runtime 09

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* Core는 React, DOM, animation, localStorage, Notion을 모른다.
* 기준 문서: Local Work Memory의 최신 HDJG-2 architecture/decision Wiki

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-30
