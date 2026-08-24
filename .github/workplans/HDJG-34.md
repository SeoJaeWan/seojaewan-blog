# HDJG-34 — [Taskbar 14] Resource Group·Session Preview·Context Menu 구현

h2. 목적

Taskbar를 Pin과 실행 Session에서 파생되는 안정적인 Resource Group으로 구현한다.

h2. 범위

* Taskbar Group selector/connector
* pinned/unpinned group 배치
* hover/click Session Preview
* Resource Group 메뉴와 Session Preview 메뉴
* activate/restore/open Action

h2. 완료 조건

* Resource당 Group 하나만 표시한다.
* Pin 또는 열린 Session이 있으면 Group이 보인다.
* Group은 활성화 때문에 이동하지 않는다.
* Preview는 sessionOrder 순서로 Session별 표시한다.
* 0/1/복수 Session click 동작이 계약과 일치한다.
* Preview 선택이 정확한 Session을 activate/restore한다.

h2. 선행 단계

Core 12, Shell 13

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* 기존 구현은 visual/interaction reference로만 사용한다.
* 기준 문서: Local Work Memory의 최신 HDJG-2 architecture/decision Wiki

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-34
