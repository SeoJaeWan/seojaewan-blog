# HDJG-31 — [Transition 11] Pin 제거·Reorder와 Transition Coordinator 구현

h2. 목적

animation 완료와 Core commit 순서를 동작별로 조율하고 충돌 요청의 최종 상태를 보장한다.

h2. 범위

* before-animation/after-animation 전략
* Pin 제거 exit 후 commit
* Reorder old/new layout 측정과 FLIP
* completed/cancelled/superseded
* 대상별 실행권, Promise, watchdog, reduced-motion

h2. 완료 조건

* 제거 대상이 animation 중간에 unmount되지 않는다.
* Reorder는 Core 순서 변경 후 새 위치로 animation된다.
* 예상하지 못한 cancel에서도 중간 semantic 상태가 남지 않는다.
* 같은 대상은 마지막 유효 요청이 최종 상태를 소유한다.
* committed/presented/settled test가 있다.

h2. 선행 단계

Slice 10

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* Core는 React, DOM, animation, localStorage, Notion을 모른다.
* 기준 문서: Local Work Memory의 최신 HDJG-2 architecture/decision Wiki

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-31
