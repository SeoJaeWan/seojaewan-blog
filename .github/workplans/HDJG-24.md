# HDJG-24 — [Design 04] Radix와 Base UI Primitive 비교 Spike

h2. 목적

Base UI 전환을 미리 확정하지 않고 Button, Context Menu, Drawer/Sheet의 실제 요구사항으로 primitive library를 검증한다.

h2. 범위

* controlled/uncontrolled state
* keyboard/focus/dismissal 접근성
* exit presence와 animation 제어
* BEM/CSS Token 적용 방식
* DOM composition과 type 노출
* migration/bundle/maintenance 비용

h2. 완료 조건

* 세 primitive의 동일한 비교 시나리오가 있다.
* 선택 근거와 보류 근거가 기록된다.
* 선택 library가 ui/primitives 내부 adapter 뒤에 숨겨진다.
* application과 shell에 library type이 누출되지 않는다.

h2. 선행 단계

Design 03

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* 기존 {{packages/ui}}, {{packages/shell}}은 reference implementation으로만 사용
* 기준 문서: Local Work Memory의 「Window Experience 디자인 시스템 아키텍처 컨벤션」과 「HDJG-2 디자인 시스템 리뉴얼 논의 및 결정 기록」

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-24
