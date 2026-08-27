# HDJG-23 — [Design 03] CSS Token과 단일 신규 Theme 구축

h2. 목적

CSS를 원본으로 Reference → Semantic → Component Token과 light/dark 분기 없는 단일 신규 Theme을 구축한다.

h2. 범위

* color, spacing, radius, typography, shadow, duration, easing
* surface, text, border, accent, danger, focus semantic
* Window/Taskbar/Window Panel component token
* Token export 순서와 CSS custom property naming

h2. 완료 조건

* CSS 파일이 Token의 유일한 원본이다.
* Reference/Semantic/Component 의존 방향이 지켜진다.
* 단일 Theme이 Storybook에서 적용된다.
* 기존 UI의 주요 시각값을 설명할 수 있다.
* BEM class naming과 Token naming이 분리된다.

h2. 선행 단계

Design 02

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* 기존 {{packages/ui}}, {{packages/shell}}은 reference implementation으로만 사용
* 기준 문서: Local Work Memory의 「Window Experience 디자인 시스템 아키텍처 컨벤션」과 「HDJG-2 디자인 시스템 리뉴얼 논의 및 결정 기록」

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-23
