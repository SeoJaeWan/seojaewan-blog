# HDJG-45 — [Taskbar 07] Primary Panel Lifecycle·Placement·Motion

h2. 목적

시작 화면과 Search를 상호 배타적인 primary panel로 조합하고 Windows 11식 위치·dismiss·motion을 구현한다.

h2. 선행 작업

* HDJG-44
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* Windows panel의 taskbar 중앙 정렬과 Search panel의 trigger 좌측 정렬
* 화면 아래 1000px에서 올라오고 내려가는 open/close motion
* Windows 버튼 재클릭 close, Search trigger 재클릭 유지
* 바깥 pointer/focus 전환 dismiss와 내부 view 전환
* reduced-motion 및 portal/placement/focus의 UI-local mechanics

h2. 완료 기준

* primary panel이 동시에 두 개 열리지 않는다.
* legacy와 동일 viewport에서 placement와 motion distance/timing을 대조한다.
* focus와 semantic open state의 소유권이 UI와 headless에 맞게 분리된다.

h2. Canonical Local Work Memory

* {{taskbar-panel-lifecycle}}
* {{taskbar-layout}}
* {{transition-lifecycle}}
* {{ui}}
* {{state-ownership}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-45
