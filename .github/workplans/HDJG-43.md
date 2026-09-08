# HDJG-43 - Headless Action/Operation/Controller Runtime

## 구현 결과

기존 Window·Workspace·Start·Taskbar Store에 Action·Operation·React Controller 실행 기반을 연결했다. 같은 창의 후속 요청은 앞선 Operation의 애니메이션·저장·정리가 끝난 뒤 실행되며, 서로 다른 창은 독립적으로 진행한다.

- OperationHandle의 committed·presented·settled와 명령별 Store commit 통지를 연결했다.
- 동작별 commit 전후 전환, operation ID·phase 완료/중단/실패, 중복·늦은 신호 무시와 UI watchdog을 구현했다.
- ResourceRef만 받는 open-content는 실제 실행 대상이 바뀌면 해당 창의 queue를 확보하고 Store mutation 직전에 대상을 다시 검증한다. A가 닫혀 B로 대상이 바뀌면 B의 이전 Operation 종료 후 실행된다.
- no-op·거부·저장 실패의 결과를 보존하고 Handle 대기와 queue 정리를 연결했다.
- runtime과 Provider는 기존 Store를 전달·구독하며 authoritative 상태를 복제하지 않는다. 서버 snapshot과 초기화 전 View Model을 분리했다.
- Window 공개 export를 연결하고 실제 public Store 동작을 사용하는 회귀 테스트로 검증했다.
- feature README, 개발 용어집과 사용자 행동별 실행 플로우를 정리했다.

## 검증

구현 커밋 `b415c92fa47f7e192c7f3390d5e2fc305bb7d168`에서 다음 검증이 통과했다. 이후 통합된 실행 소스는 동일하며 추가 변경은 문서다.

- `pnpm --filter @window/design lint`
- `pnpm --filter @window/design typecheck`
- `pnpm --filter @window/design test`: 32 files / 392 tests
- `pnpm --filter @window/design build`
- 대상 변경 A→B, Store 대기 중 재선택, 같은 대상 FIFO, 이전 대상 점유 해제, 창 소멸 후 신규 생성과 독립 창 실행 회귀 검증
- 추가 실행 플로우 문서의 형식·내부 이동·소스 링크 검증

## 후속 범위

Search·Preview·제품별 Context Menu의 세부 기능과 실제 제품 UI 연결은 기존 후속 Taskbar·Window·Folder·Chrome·Desktop 작업에서 구현한다. 실제 DOM motion, browser/visual 검증과 Application bootstrap·adapter 연결도 해당 소비자 작업에서 수행한다.

## 코드와 지식 탐색

- [Headless 실행 플로우](../../docs/플로우.md)
- [개발 용어집](../../docs/용어집.md)
- Local Work Memory: `headless-execution-flow-guide`
- 현재 계약: `action-operation`, `transition-lifecycle`, `module-boundaries`, `workspace-resource-placement`, `pin-store-persistence`

현재 delivery 상태는 GitHub PR과 Gateway Work Item을 확인한다.

## 추적

- [PR #24](https://github.com/SeoJaeWan/seojaewan-blog/pull/24)
- [HDJG-43](https://seojaewan.atlassian.net/browse/HDJG-43)
