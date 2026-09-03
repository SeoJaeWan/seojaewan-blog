# HDJG-47 — [Taskbar 09] Search·Recent·Recommendation·Ranking·Detail

h2. 목적

작업 표시줄 Search의 최근 항목, 추천 Content, fuzzy ranking, 상세 영역과 open 기록을 계약대로 구현한다.

h2. 선행 작업

* HDJG-46
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* 최근 항목: Search에서 연 Content 최대 20개, 검색어 미저장
* 추천 Content: Notion 설정 기반 category별 최대 6개, 최신 작성일 순
* 제목 기반 fuzzy 검색과 일치율 ranking, 한글 초성 지원
* 왼쪽 최고 매치/결과와 오른쪽 상세 icon·구분선·이름·경로·open action
* Start panel 내 Search view와 독립 Search panel의 결과 공유

h2. 완료 기준

* 최근 기록과 자주 방문한 Content 기록이 분리된다.
* 빈 query·입력·결과 없음·상세 선택 상태가 테스트된다.
* Folder/Chrome open intent와 부모 Folder 열기 규칙이 검증된다.

h2. Canonical Local Work Memory

* {{taskbar-search}}
* {{frequent-content-history}}
* {{resource-model}}
* {{application-resource-routing-404}}
* {{testing}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-47
