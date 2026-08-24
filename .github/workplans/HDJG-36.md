# HDJG-36 — [Mobile 16] Bottom Sheet와 공통 Resource Action 연결

h2. 목적

Mobile Bottom Sheet가 Desktop Window와 같은 Resource 원본과 Action Gateway를 사용하도록 구현한다.

h2. 범위

* Sheet UI primitive/pattern
* Mobile Resource connector
* Resource/Content View Model
* Context Menu 또는 Action section 재사용
* open/pin 등 공통 Resource Action

h2. 완료 조건

* Bottom Sheet가 별도 Content snapshot을 소유하지 않는다.
* Desktop과 Mobile이 같은 Catalog 원본을 읽는다.
* 기능별 callback props가 누적되지 않는다.
* focus, dismissal, swipe/reduced-motion 접근성이 검증된다.
* UI Sheet는 Resource/Content를 모른다.

h2. 선행 단계

Design 05, Design 06, Runtime 09

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* 기존 구현은 visual/interaction reference로만 사용한다.
* 기준 문서: Local Work Memory의 최신 HDJG-2 architecture/decision Wiki

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-36
