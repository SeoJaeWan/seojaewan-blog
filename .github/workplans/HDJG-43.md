# HDJG-43 - Headless Action/Operation/Controller Runtime

## 목적

기존 Window·Workspace·Start·Taskbar Store 명령을 제품 Component가 소비할 DOM-free Action·Operation·controller 실행 기반으로 연결한다. 같은 창의 연속 요청은 animation과 저장·정리까지 완료한 뒤 순서대로 처리한다.

## 선행 및 후속 관계

- HDJG-42 완료 및 canonical Memory 정합화를 기반으로 진행한다.
- 완료 후 Taskbar, Common Window/Folder/Chrome, Desktop 트랙이 진행된다.
- Search·Preview·제품별 Context Menu 등 신규 기능의 headless 로직과 실제 제품 UI는 기존 후속 PR에서 함께 구현한다. 이 PR로 범위를 이동하지 않는다.

## 범위

- 기존 Foundation 명령을 연결하는 Action·Operation·controller와 OperationHandle을 구현한다.
- Store commandQueue를 유지하고, 같은 창의 Operation은 settled 이후 다음 요청을 실행한다. 서로 다른 창의 Operation은 동시에 진행할 수 있다.
- 동작별 commit-before/after-motion과 operation ID 기반 완료·중단 통지, 중복·늦은 신호 무시, watchdog 정리를 구현한다.
- 각 Operation은 자신이 소유한 전환만 기다린다. 창 닫기가 Taskbar 항목 제거 animation까지 기다리지 않는다.
- Store의 명령별 commit 통지와 저장 결과를 연결해 committed·presented·settled를 구분한다.
- no-op·거절·저장 실패가 모든 대기를 종료하고 후속 요청을 막지 않도록 처리한다.
- Catalog·router·storage·clipboard·preview 등의 port와 Provider 경계를 정의한다. Provider는 실행 기반과 adapter를 전달하며 Store 상태를 복제하거나 재마운트만으로 초기화하지 않는다.
- 기존 명령을 여러 입력 경로에서 같은 Action으로 호출할 수 있게 한다. 신규 검색·메뉴 정책과 browser 입력 mechanics는 후속 기능 작업에 둔다.

## 계층 경계

- headless는 JSX·DOM·Base UI를 import하지 않는다.
- 상태 계산·commit·저장은 기존 Store가 소유한다. Operation이 내부 계산이나 저장을 복제하지 않는다.
- focus·portal·placement·presence·pointer sampling·실제 animation은 Product Component/Base UI가 소유한다.
- Application은 infrastructure adapter를 주입하며 버튼별 callback glue나 제품 정책을 조립하지 않는다.

## 완료 기준

- 기존 Foundation의 View Model과 Action을 공개 controller API로 소비할 수 있다.
- 동일 창 순차 실행, 서로 다른 창의 독립 진행, 실행 시점 최신 상태 검증이 orchestration test로 확인된다.
- 동작별 commit 순서, 완료·중단·watchdog·중복 신호와 Handle 종료 결과를 검증한다.
- commit 통지는 저장 완료보다 먼저 관찰 가능하고, animation과 저장·정리가 끝나야 settled가 완료된다.
- 저장 실패 시 commit을 되돌리지 않으며 no-op·거절은 불필요한 animation·저장을 만들지 않는다.
- UI/headless/Application 의존 방향, Provider 재마운트 시 Store 상태 유지와 package public API를 자동 검증한다.
- 실제 제품 motion·browser/visual 검증은 각 후속 UI 작업이 수행한다. 본 PR은 그 연결 계약과 실행 기반을 검증한다.

## Canonical Local Work Memory

상세 계약은 Wiki를 정본으로 사용한다. 아래는 2026-09-08 합의 반영 revision이며 Shape/Prepare에서 최신 상태를 다시 확인한다.

- `transition-lifecycle`: `01a07eac-5fd6-7b34-8bc9-bbf4184daadf`
- `action-operation`: `01a07eac-da07-7f4a-b28d-d6a26d1319c1`
- `module-boundaries`: `01a07ead-290c-7e8b-b4be-72c6506a4dec`
- `base-ui-product-composition-contract`
- `architecture-layers`
- `coding`
- `state-ownership`
- `pin-store-persistence`
- `workspace-resource-placement`

## 전달 규칙

기존 PR #24에서 진행한다. Shape/Prepare는 분석 checkout과 Memory revision을 고정하고 구현 완료를 선행해서 주장하지 않는다.

## Jira

- [HDJG-43](https://seojaewan.atlassian.net/browse/HDJG-43)
