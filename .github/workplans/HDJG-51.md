# HDJG-51 — [Window 13] Common Window Frame·Controls·Move·Resize·Motion

h2. 목적

Folder와 Chrome이 공유하는 frame, controls, move, resize, bounds, cascade, motion을 common UI와 headless 조합으로 구현한다.

h2. 선행 작업

* HDJG-50
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* 공용 frame/title region/minimize/maximize/close controls
* 8방향 resize cursor·pointer capture·viewport bounds
* title drag, maximize/restore, cascade 오른쪽+위 50px 반복
* open/close/minimize/restore motion과 z-order focus
* mobile fullscreen, resize/move/maximize 제거, -와 X만 유지

h2. 완료 기준

* drag/resize semantic 계산은 headless, pointer/focus/DOM mechanics는 UI 경계에 있다.
* Folder와 Chrome이 frame을 복사하지 않고 common을 조합한다.
* 동일 viewport에서 legacy frame geometry와 controls/motion을 비교한다.

h2. Canonical Local Work Memory

* {{common-window-frame-interaction}}
* {{product-surfaces-window-shell}}
* {{window-session}}
* {{transition-lifecycle}}
* {{window-layout}}
* {{folder-structure}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-51
