# HDJG-39 — [Foundation 01] Primitive Catalog 재감사와 독립 검증 복구

h2. 목적

현재 코드와 Local Work Memory의 Primitive 계약을 다시 맞춘다. 제품 기능을 시작하기 전에 불필요한 Primitive, 실제 소비처가 없는 family, 제품 Story 역참조를 제거하고 독립 검증 기반을 복구한다.

h2. 범위

* {{ButtonUI}}, {{IconButtonUI}}, {{InputUI}}, {{ComboboxUI}}, {{SelectUI}}, {{ContextMenuUI}}, {{PopoverUI}}, {{CollapsibleUI}}의 실제 제품 소비처와 승격 근거 재감사
* 특히 코드에서 제거된 {{SelectUI}}와 현재 Memory catalog의 불일치 해결
* 소비 근거가 없는 Primitive·adapter·export·test·story 정리
* Primitive Story가 제품 Component를 import하는 역방향 의존 제거
* Primitive 단위 Story/Test와 public API 검증 복구
* drag·move·resize를 generic Primitive로 만들지 않는 경계 확인
* 코드와 {{ui-primitive-catalog}}, {{hdjg-25-ui-primitive-scope-decision}}, adapter 계약 동기화

h2. 완료 기준

* Active Primitive마다 실제 소비 근거와 독립 fixture가 있다.
* 제품 Component 없이 Primitive Storybook과 단위 테스트가 실행된다.
* 제거·유지 판단이 코드, export, test, Story, Memory에 동일하게 반영된다.
* 이름 존재 여부가 아니라 public contract와 주요 상태가 자동 검증된다.

h2. Canonical Local Work Memory

* {{ui-primitive-catalog}}
* {{hdjg-25-ui-primitive-scope-decision}}
* {{ui-primitive-adapter-contract}}
* {{ui}}
* {{storybook-authoring}}
* {{testing}}
* {{architecture-layers}}
* {{folder-structure}}

h2. 전달 규칙

이 Jira는 새 로드맵의 첫 작업이다. 최신 Memory revision을 Shape에서 고정한 뒤 구현 PR을 별도로 만들며, 이슈 생성만으로 PR이나 구현 완료를 주장하지 않는다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-39
