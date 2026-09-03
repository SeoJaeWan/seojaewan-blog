# HDJG-49 — [Taskbar 11] Context Menu 제품 조합

h2. 목적

공용 ContextMenu primitive 위에 Taskbar·시작 화면·모두 보기·Search별 제품 메뉴를 capability와 위치 규칙으로 조합한다.

h2. 선행 작업

* HDJG-48
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* 자주 방문한 사이트 → 위치 이동 → 시작 화면 → 작업 표시줄 순서
* Folder Group에는 최대 6개 frequent Content와 Folder label
* Content·Folder·ExternalShortcut별 가능한 항목 차이
* 첫/중간/마지막 위치 이동과 pin label 전환
* 여러 active target의 모든 창 닫기 및 해당 Group 포함 tab만 닫기

h2. 완료 기준

* 메뉴 entry는 한 거대한 조건문이 아니라 section/command selector로 합성된다.
* 합의되지 않은 파일 열기·최근 목록 제거·경로 복사 항목이 들어가지 않는다.
* 모바일에서는 Context Menu가 제공되지 않는다.

h2. Canonical Local Work Memory

* {{taskbar-context-menu}}
* {{context-menu-architecture}}
* {{frequent-content-history}}
* {{taskbar-group}}
* {{taskbar-mobile}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-49
