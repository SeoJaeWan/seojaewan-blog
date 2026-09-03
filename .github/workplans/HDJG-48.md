# HDJG-48 — [Taskbar 10] Group·ExternalShortcut·Indicator·Click·Drag

h2. 목적

Folder Group, Content Group, ExternalShortcut launcher의 표시·상태선·click·순서를 작업 표시줄에서 완성한다.

h2. 선행 작업

* HDJG-47
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* 전역 Folder Group과 Content별 Group projection
* ExternalShortcut standalone pinned launcher
* active theme line, minimized/inactive gray line
* 0·1·2개 이상 target별 click 동작과 preview 진입
* pinned/running-only 혼합 순서 drag reorder

h2. 완료 기준

* Folder Group 클릭은 해당 session의 target tab을 활성화한다.
* 한 Group에 여러 session/tab target이 있을 때 직접 창을 열지 않고 preview를 요청한다.
* 미고정 항목도 표시 배열에서 재정렬되고 종료 시 나머지 순서가 보존된다.

h2. Canonical Local Work Memory

* {{taskbar-group}}
* {{taskbar-root-category-icons}}
* {{taskbar-external-shortcut-launcher}}
* {{taskbar-pin-model}}
* {{window-session}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-48
