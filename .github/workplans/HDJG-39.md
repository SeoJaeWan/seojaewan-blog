# HDJG-39 — [Foundation 01] Project Primitive 계층 제거와 계약 정합화

## 목적

Base UI 위에 다시 얹은 project-owned Primitive 계층을 제거하고, 제품 기능의 소유권을 headless와 product Component로 재배치한다. 코드·Local Work Memory·후속 로드맵이 같은 경계를 가리키게 만든다.

## 선행 및 병렬 관계

- 없음
- 로드맵의 시작점이다.

## 범위

- `packages/design/src/ui/primitives`의 구현·export·test·Story와 primitive 전용 token/checker를 제거한다.
- Base UI와 Fluent Icons 의존성은 유지하되 실제 제품 Component가 필요한 위젯을 직접 조합하도록 public API를 정리한다.
- Primitive catalog/adapter를 현재 계약으로 복구하지 않고 역사 문서로 종료하며, 현재 owner를 Base UI 제품 조합 계약으로 옮긴다.
- HDJG-40–59의 책임·테스트·의존 관계를 새 계층에 맞게 동기화한다.

## 계층 경계

- Base UI가 generic primitive 기반을 소유하며 같은 의미를 감싸는 project adapter를 다시 만들지 않는다.
- 제품 로직은 DOM-free headless model/reducer/selector/operation/controller/hook/provider가 소유한다.
- 제품 Component는 같은 feature의 headless API와 Base UI를 직접 조합한다.

## 완료 기준

- `ui/primitives`와 primitive 전용 public API·검증 스크립트가 남지 않는다.
- 제품 Storybook, package build/test/typecheck와 root verify가 통과한다.
- 코드·Memory·Jira·PR 어디에도 project primitive를 현재 구현 목표로 서술한 항목이 남지 않는다.

## Canonical Local Work Memory

- `base-ui-product-composition-contract`
- `architecture-layers`
- `folder-structure`
- `ui`
- `testing`
- `storybook-authoring`

## 전달 규칙

이 작업은 별도 Shape 갱신 없이 현재 합의와 canonical Local Work Memory를 기준으로 직접 정리한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-39
