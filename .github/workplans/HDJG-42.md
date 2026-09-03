# HDJG-42 — [Foundation 04] Pin·Taskbar Group·Visible Order·Persistence

h2. 목적

시작 화면 고정, 작업 표시줄 고정, 실행 중 Group, ExternalShortcut을 서로 다른 모델로 유지하면서 하나의 표시 순서를 만든다.

h2. 선행 작업

* HDJG-41
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* Start Pin과 Taskbar Pin의 독립 상태·사용자 label·localStorage
* 모든 FolderTab을 묶는 전역 Folder Group
* Content별 Chrome Group과 독립 ExternalShortcut launcher
* pinned/running-only 혼합 visible order와 drag reorder
* catalog 변경 시 persistence reconcile

h2. 완료 기준

* 고정·해제·실행·종료·재정렬 조합이 selector test로 검증된다.
* 최근 사용으로 표시 순서가 바뀌지 않는다.
* 모바일에서는 Pin 편집 없이 정적 category launcher만 사용한다.

h2. Canonical Local Work Memory

* {{pin-model}}
* {{taskbar-pin-model}}
* {{start-screen-pin-model}}
* {{taskbar-group}}
* {{taskbar-external-shortcut-launcher}}
* {{taskbar-mobile}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-42
