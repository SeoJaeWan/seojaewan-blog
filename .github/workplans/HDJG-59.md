# HDJG-59 — [Migration 21] Vertical Slice·Visual Parity·Legacy 제거

h2. 목적

완성된 제품 흐름을 실제 reference fixture와 비교해 회귀를 막고, 검증된 뒤에만 legacy 구조를 제거한다.

h2. 선행 작업

* HDJG-58
* 선행 이슈의 구현 완료·Memory 정합화 후 이 작업의 Shape를 시작한다.

h2. 범위

* Desktop→Folder→Chrome→Taskbar Group/Preview/Search vertical slice
* 동일 viewport packages/ui·packages/shell side-by-side fixture
* asset·geometry·motion·responsive·keyboard·context menu 회귀 검증
* 자기참조 테스트가 아닌 legacy expected result 기반 visual gate
* canonical packages/design 전환 후 legacy import·obsolete checker 제거

h2. 완료 기준

* 컴포넌트 이름/Story 존재가 아니라 실제 렌더링과 interaction이 통과한다.
* 합의되지 않은 intentional divergence가 남지 않는다.
* legacy 삭제 전후 production build와 주요 E2E가 통과하고 Memory/README가 동기화된다.

h2. Canonical Local Work Memory

* {{legacy-reference-sources}}
* {{testing}}
* {{test-and-quality}}
* {{ui}}
* {{window-experience-design-system-architecture}}
* {{product-surfaces-window-shell}}

h2. 전달 규칙

최신 Memory revision을 Shape에서 고정하고, Prepare 이후 이 작업 전용 PR을 하나만 만든다. Jira 생성만으로 구현 또는 시각 동등성 완료를 주장하지 않는다. UI 작업은 동일 viewport의 legacy reference 비교를 완료 조건으로 포함한다.

## Jira

- https://seojaewan.atlassian.net/browse/HDJG-59
