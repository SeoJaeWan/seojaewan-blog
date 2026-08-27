# HDJG-25 — [Design 05] UI Primitive 재구축

h2. 목적

선택된 adapter와 CSS Token으로 범용 UI interaction 계층을 새로 구현한다.

h2. 범위

- Button/IconButton
- Menu/Context Menu visual primitives
- Popover/Tooltip
- Dialog/Drawer/Sheet 기반
- focus-visible, disabled, reduced-motion

h2. 완료 조건

- Resource, Session, Pin, Content type을 import하지 않는다.
- Provider 없이 Storybook에서 렌더링된다.
- keyboard/focus/aria contract가 검증된다.
- CSS class는 BEM, 값은 Token을 사용한다.
- primitive library 세부 type이 public API에 노출되지 않는다.

h2. 선행 단계

Design 04

h2. 공통 아키텍처 기준

- 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
- 기존 {{packages/ui}}, {{packages/shell}}은 reference implementation으로만 사용
- 기준 문서: Local Work Memory의 「Window Experience 디자인 시스템 아키텍처 컨벤션」과 「HDJG-2 디자인 시스템 리뉴얼 논의 및 결정 기록」

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-25
