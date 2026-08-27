# HDJG-21 — [Design 01] packages/design 신규 패키지 골격 구성

h2. 목적

기존 분리 패키지에 신규 구조를 끼워 넣지 않고 단일 {{packages/design}} package의 빌드·공개 API·논리 경계를 구성한다.

h2. 범위

* package.json, tsconfig.json, vite.config.ts
* src/ui, src/core, src/shell과 각 index.ts
* Storybook/Vitest/ESLint 진입점
* ui/core/shell import 방향 검증 기반

h2. 완료 조건

* design package가 독립적으로 build/typecheck된다.
* ui/core/shell public entry point가 정의된다.
* 기존 packages/ui와 packages/shell을 import하지 않는 빈 골격이 만들어진다.
* deep import와 역방향 의존을 방지할 기준이 있다.

h2. 선행 단계

없음

h2. 공통 아키텍처 기준

* 신규 구현 위치: {{packages/design/src/{ui,core,shell}}}
* 기존 {{packages/ui}}, {{packages/shell}}은 reference implementation으로만 사용
* 기준 문서: Local Work Memory의 「Window Experience 디자인 시스템 아키텍처 컨벤션」과 「HDJG-2 디자인 시스템 리뉴얼 논의 및 결정 기록」

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-21
