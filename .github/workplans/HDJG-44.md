# HDJG-44 — [Taskbar 06] Root·Trigger·Timestamp·Mobile Launcher

h2. 목적

작업 표시줄의 고정 골격과 Windows/Search trigger, Timestamp, desktop/mobile 구성을 legacy 결과와 동등하게 구현한다.

h2. 선행 작업

* HDJG-43
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* desktop Windows 버튼·30px Search pill·고정/실행 항목 영역·Timestamp
* Search hover/active icon 색상과 전용 mask asset
* Timestamp의 시간·날짜 표시와 갱신
* mobile 정적 category launcher + Timestamp, Windows/Search 제거
* UI controlled props를 trigger/root/timestamp 단위로 분리

h2. 완료 기준

* 동일 viewport에서 packages/ui reference와 크기·간격·asset·상태가 비교된다.
* desktop/mobile 구성 차이가 Story와 interaction test로 고정된다.
* Root Component가 panel/group/session 전체 상태를 거대한 props 하나로 받지 않는다.

h2. Canonical Local Work Memory

* {{taskbar-feature-architecture}}
* {{taskbar-layout}}
* {{taskbar-root-category-icons}}
* {{taskbar-timestamp}}
* {{taskbar-mobile}}
* {{ui}}
* {{testing}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-44
