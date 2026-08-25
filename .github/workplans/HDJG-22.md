# HDJG-22 — [Design 02] 기존 UI 스타일 인벤토리와 시각 기준선 고정

h2. 목적

기존 구현을 복사하지 않고 신규 Token의 근거로 사용할 실제 color, spacing, typography, radius, shadow, duration과 주요 visual state를 목록화한다.

h2. 범위

- 기존 CSS와 Storybook의 실제 값 수집
- Window, Taskbar, Window Panel, Folder, Context Menu, Bottom Sheet 상태 목록
- 중복값과 의미가 다른 동일값 구분
- 주요 화면 회귀 비교 기준 정리

h2. 완료 조건

- Reference/Semantic/Component Token 후보가 구분된다.
- default, active, disabled, entering, exiting 상태가 정리된다.
- 근거 없이 새 Token을 추가하지 않는 inventory가 준비된다.
- 기존 구현이 구조가 아니라 visual reference임이 문서화된다.

h2. 선행 단계

Design 01

h2. 공통 아키텍처 기준

- 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
- 기존 {{packages/ui}}, {{packages/shell}}은 reference implementation으로만 사용
- 기준 문서: Local Work Memory의 「Window Experience 디자인 시스템 아키텍처 컨벤션」과 「HDJG-2 디자인 시스템 리뉴얼 논의 및 결정 기록」

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-22
