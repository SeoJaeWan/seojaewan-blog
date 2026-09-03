# HDJG-46 — [Taskbar 08] 시작 화면·고정·모두 보기·Index

h2. 목적

시작 화면의 고정 영역과 모두 보기 목록, 범주 index 이동을 독립 view와 상태 전이로 구현한다.

h2. 선행 작업

* HDJG-45
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* 상단 Search 입력, 시작 화면 고정 항목, 모두 보기 진입
* 고정 항목 reorder와 위치 이동 가능 여부
* 모두 보기에는 Content만 표시하고 A-Z·ㄱ-ㅎ·기호 category 정렬
* 오른쪽→왼쪽 view 전환 animation과 category index overlay/scroll
* 검색 입력 시 shell은 유지하고 하단 영역만 Search 결과 view로 전환

h2. 완료 기준

* 고정 1번째/중간/마지막 항목별 메뉴 가능 상태가 검증된다.
* index 선택 후 대상 위치로 scroll하고 overlay가 닫힌다.
* 목록/고정/검색 전환이 start-screen 계약과 일치한다.

h2. Canonical Local Work Memory

* {{start-screen}}
* {{start-screen-pin-model}}
* {{taskbar-panel-lifecycle}}
* {{taskbar-context-menu}}
* {{taskbar-search}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-46
