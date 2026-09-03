# HDJG-52 — [Folder 14] Shell·Tabs·Address·History·Sidebar·Status

h2. 목적

Folder 제품의 창 골격과 탭 탐색, 주소, 내부 history, sidebar, status bar를 common frame 위에 구현한다.

h2. 선행 작업

* HDJG-51
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* icon+folder title tab, + clone, close, overflow 전 < > 이동
* back/forward/refresh, 주소창 기본 label과 active URL 입력
* 검색도 포함하는 tab별 internal history와 browser URL 분리
* category-only sidebar, tab별 임시 펼침 상태, mobile sidebar 제거
* 하단 전체/선택 항목 수와 오른쪽 보통 아이콘 quick-view 버튼

h2. 완료 기준

* Ctrl/Cmd tab shortcut과 history navigation이 headless test로 검증된다.
* tab이 좁아진 뒤 overflow control이 나타나며 가로 scrollbar를 쓰지 않는다.
* desktop/mobile Folder shell이 별도 Story에서 visual parity 검증된다.

h2. Canonical Local Work Memory

* {{folder-feature-architecture}}
* {{folder-window-layout-responsive}}
* {{folder-tab-navigation-history}}
* {{folder-sidebar}}
* {{application-resource-routing-404}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-52
