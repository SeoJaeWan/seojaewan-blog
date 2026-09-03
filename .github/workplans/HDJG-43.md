# HDJG-43 — [Foundation 05] Action·Operation·Transition Lifecycle

h2. 목적

UI callback에서 제품 의도를 받고 Application controller가 상태 전이, DOM 효과, animation 완료를 조율하는 실행 경계를 만든다.

h2. 선행 작업

* HDJG-42
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* 제품별 작은 action union과 command/selector
* Operation·Controller·Event·OperationHandle
* commit-before/after-motion 전략과 취소·watchdog
* 키보드 shortcut을 거대한 Component handler가 아닌 headless command mapping으로 분리
* UI/headless/Application import 방향과 Provider 경계

h2. 완료 기준

* UI는 reducer, persistence, catalog, 제품 session을 소유하지 않는다.
* 거대한 flat props 대신 역할별 compound contract와 action group을 제공한다.
* 동작별 transition 순서와 취소가 orchestration test로 검증된다.

h2. Canonical Local Work Memory

* {{action-operation}}
* {{transition-lifecycle}}
* {{architecture-layers}}
* {{module-boundaries}}
* {{coding}}
* {{state-ownership}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-43
