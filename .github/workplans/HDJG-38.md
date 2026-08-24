# HDJG-38 — [Migration 18] Legacy Reference 회귀 검증과 기존 구조 제거

h2. 목적

신규 packages/design과 application 연결이 visual/behavior 기준을 충족한 뒤 기존 packages/ui와 packages/shell 계약을 제거한다.

h2. 범위

* visual/interaction regression 비교
* 기존 WindowItem, windowsItems Context, 분리 Pin Provider 제거
* 요청 event와 Surface별 callback switch 제거
* legacy package/import/script 정리
* README, Workplan, Local Work Memory, Jira 결과 갱신

h2. 완료 조건

* 신규 UI/Core/Shell test와 Storybook이 통과한다.
* 주요 Window/Taskbar/Folder visual 회귀가 확인된다.
* application이 packages/design public API만 사용한다.
* legacy Provider/event/callback 계약이 남지 않는다.
* 사용하지 않는 dependency와 package가 제거된다.
* 실제 package.json 기준으로 명령 Wiki가 갱신된다.

h2. 선행 단계

Design 01~17의 적용 범위 완료

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* 기존 구현은 visual/interaction reference로만 사용한다.
* 기준 문서: Local Work Memory의 최신 HDJG-2 architecture/decision Wiki

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-38
