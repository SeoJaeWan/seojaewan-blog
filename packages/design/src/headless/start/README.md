# Start

desktop Start의 persisted Pin은 `StartStore`, pinned/all view와 index overlay의 transient 상태는
runtime별 `startScreen` channel이 소유한다. Pin에는 `ResourceRef`만 남기며 title, icon, URL,
parent, body, Window와 Taskbar 상태는 저장하지 않는다. Resource 원본은
[Resources](../resources/README.md), Folder 배치와 복원 순서는 [Workspace](../workspace/README.md),
전체 진입점은 [Headless 안내](../README.md)를 참고한다.

## 파일별 역할

| 파일                                                                         | 역할                                                     | 인접 테스트                                                    |
| ---------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| [index.ts](./index.ts)                                                       | Start public API와 type 재노출                           | 자체 동작 없음                                                 |
| [model/index.ts](./model/index.ts)                                           | `StartPinnedItem`, snapshot과 reorder intent             | type-only; Store 행동 테스트에서 검증                          |
| [startStore/index.ts](./startStore/index.ts)                                 | 초기화, 구독, Pin·Unpin·reorder·reload·reconcile와 queue | [startStore.test.ts](./startStore/startStore.test.ts)          |
| [startStore/operationResult/index.ts](./startStore/operationResult/index.ts) | commit, no-op, 거절과 조용한 저장 실패                   | type-only; Store 행동 테스트에서 검증                          |
| [startStore/startStorage/index.ts](./startStore/startStorage/index.ts)       | schema version 1의 Start 전용 비동기 load/save port      | type-only; Store persistence 테스트에서 검증                   |
| [operations/index.ts](./operations/index.ts)                                 | Pin Action의 commit·transition·settled 순서              | [operations.test.ts](./operations/operations.test.ts)          |
| [screen/model/index.ts](./screen/model/index.ts)                             | pinned/all view와 index overlay snapshot                 | screen state·command 테스트에서 검증                           |
| [screen/state/index.ts](./screen/state/index.ts)                             | runtime-local transient state와 구독                     | [state.test.ts](./screen/state/state.test.ts)                  |
| [screen/selectors/index.ts](./screen/selectors/index.ts)                     | 모두 보기 대상, canonical group과 정렬                   | [selectors.test.ts](./screen/selectors/selectors.test.ts)      |
| [screen/operations/index.ts](./screen/operations/index.ts)                   | serializable view·index·reset Action                     | [operations.test.ts](./screen/operations/operations.test.ts)   |
| [screen/controller/index.ts](./screen/controller/index.ts)                   | `startScreen` runtime의 React 구독·Action 경계           | [controller.test.tsx](./screen/controller/controller.test.tsx) |

## 브라우저 초기화

headless는 DOM, Next.js와 `localStorage`를 import하지 않는다. Application은 브라우저에서 Workspace 복원을 먼저 완료하고 실제 `FolderCatalog`가 포함된 `ResourceLookup`을 만든 뒤 Start 전용 storage adapter와 함께 초기화한다. 서버 요청 사이의 사용자 상태를 이 정적 Store에 공유하면 안 된다.

```ts
import { createResourceLookup, StartStore, WorkspaceStore } from "@window/design";

await WorkspaceStore.initialize(workspaceInitialization);

const resourceLookup = createResourceLookup({
  content: ContentCatalog,
  folder: FolderCatalog,
  externalShortcut: ExternalShortcutCatalog,
});

const initialized = await StartStore.initialize({
  storage: startStorage,
  resourceLookup,
});

if (!initialized.ok && initialized.reason === "storage-write-failed") {
  // 메모리 복원은 commit됨: 사용자 오류 알림 없이 현재 snapshot을 계속 사용한다.
}
```

`StartStorage.load()`는 adapter가 Start 전용 새 key에서 읽은 parsed JSON 값이나 `null`을 반환한다. legacy key 검색, ID 변환과 다른 탭의 실시간 동기화는 adapter와 Store 모두 수행하지 않는다. `save()`는 `{ schemaVersion: 1, resources: ResourceRef[] }` 전체를 저장한다.

저장값이 없거나 전체 형식이 손상되면 현재 빈 seed를 사용한다. 정상 빈 배열은 그대로 유지한다. 해석 가능한 snapshot의 malformed·missing 항목만 제거하고 중복은 첫 등장을 보존한다. Folder는 초기화가 끝난 Workspace 기반 lookup으로 확인하므로 이름이나 placement 변경은 Pin identity와 순서를 바꾸지 않는다.

## 명령과 결과

```ts
const unsubscribe = StartStore.subscribe(() => {
  renderStart(StartStore.getSnapshot());
});

await StartStore.pin(resource);
await StartStore.reorder(resource, "first");
await StartStore.reorder(resource, { type: "index", index: dropIndex });
await StartStore.unpin(resource);

const label = StartStore.getPinLabel(resource);
const actions = StartStore.getReorderActions(resource);
unsubscribe();
```

`pin`, `unpin`과 `reorder`는 초기화·save와 한 queue에서 직렬화한다. Context Menu는 `first`·`left`·`right`, drag는 `{ type: "index", index }`를 같은 `reorder` 명령에 전달하므로 임의 목적 위치도 commit과 save 한 번으로 반영한다. duplicate Pin, 미고정 Unpin과 불가능한 경계 이동은 `{ ok: false, reason: "no-op" }`이며 snapshot·알림·저장을 만들지 않는다. 잘못된 ref, missing Resource와 지원하지 않는 reorder intent는 명시적인 거절 결과다.

save 실패는 `{ ok: false, reason: "storage-write-failed", committed: true, value }`를 반환한다. 메모리 snapshot과 구독 알림은 유지하고 toast나 경고를 발생시키지 않는다. 다음 변경이 성공하면 앞선 미저장 변경을 포함한 최신 전체 snapshot을 저장한다.

`StartOperations.execute`는 전체 Start 목록을 하나의 target으로 직렬화한다. 추가는 commit 뒤 enter, 제거는 exit 뒤 commit, reorder는 이전 측정 → commit → 새 측정 → 이동 transition 순서다. Store의 optional command context가 commit만 알리고 기존 Promise가 저장 결과를 반환하므로 `committed`는 저장보다 먼저 끝날 수 있지만 `settled`는 저장과 transition을 모두 기다린다. no-op·거절은 측정, animation과 저장을 만들지 않는다.

`reload()`는 명시적인 저장소 재읽기 경계다. 최신 값을 초기화와 같은 부분 복구 규칙으로 queue에서 반영하고, identity와 순서가 같으면 no-op이다. `reconcileResources()`는 현재 Catalog에서 삭제된 Resource만 제거한다. 두 명령 모두 실제 변경이 있을 때만 알리고 정리된 전체 목록을 저장한다.

현재 canonical 계약은 Local Work Memory의 `start-screen-pin-model`, `pin-store-persistence`, `resource-model`과 `workspace-resource-placement`다.

## Start screen과 모두 보기

`startScreen` snapshot은 `{ view: "pinned" | "all", indexOpen: boolean }`만 포함한다. `set-view`,
`set-index-open`과 `reset`은 immutable changed/no-op 결과를 반환한다. pinned로 돌아갈 때 index가
닫히며, close 완료와 mobile 전환의 reset은 항상 `{ view: "pinned", indexOpen: false }`로 돌아간다.
이 state는 `StartStore`를 참조하지 않으므로 stored Pin을 변경할 수 없다.

`selectStartScreenAllGroups()`는 현재 Content와 ExternalShortcut Catalog를 읽고 Folder reader는
호출하지 않는다. 순서는 A–Z, 한글 초성 ㄱ–ㅎ, 첫 글자별 0–9, 기호 #이며 비어 있는 group은 결과에서
생략한다. 각 group 안에서는 current title/name을 `ko-KR`로 정렬하고 같은 label은 kind와 ID로
안정화한다. ExternalShortcut의 별도 사용 가능 여부나 filter는 이 model에 없다.

## Public runtime과 React controller

`useStartController()`의 `viewModel`은 준비 상태와 StartStore의 immutable snapshot을 구분하고, `actions`는 Pin Action과 operation ID별 transition 완료 신호를 제공한다. Provider 재마운트나 StrictMode의 구독 cleanup은 Pin 상태를 초기화하거나 사용자 Action을 취소하지 않는다.

`useStartScreenController()`는 별도의 `startScreen` snapshot과 synchronous Action 결과를 제공한다.
`createHeadlessRuntime()`은 주입된 `startScreen` state가 없으면 새 runtime-local state를 만들며,
primary panel의 Start close가 settled된 뒤 `close-complete` reset을 실행한다. mobile dismiss는 panel
활성 여부와 관계없이 `mobile` reset을 실행한다.

Application은 Workspace 기반 `resourceLookup`과 storage로 StartStore 초기화를 끝낸 뒤 runtime을
render 바깥에서 한 번 만들고 같은 `ResourceReaders`를 `TaskbarRoot`에 전달한다. ExternalShortcut을
실제로 열려면 명시적 `externalNavigation` port를 주입해야 한다. 생략하면 runtime은
`adapter-not-configured` 실패를 반환한다.

```tsx
const runtime = createHeadlessRuntime({
  externalNavigation,
  windowPresentation,
});

<HeadlessRuntimeProvider runtime={runtime}>
  <TaskbarRoot
    resourceReaders={{
      content: ContentCatalog,
      folder: FolderCatalog,
      externalShortcut: ExternalShortcutCatalog,
    }}
    renderStartSearchBody={(query) => <StartSearchBoundary query={query} />}
  />
</HeadlessRuntimeProvider>;
```

`committed`는 Pin 메모리 반영, `presented`는 항목 표현, `settled`는 저장과 정리를 포함하므로 Pin
caller는 보통 `settled`를 기다린다. Resource open은 Window commit과 이미 충족된 Window no-op을
성공으로 해석하고 Store 거절, 실행 오류와 presentation 실패를 실패로 해석한다. ExternalShortcut은
navigation port의 명시적 결과만 사용하며 내부 `WindowSession`을 만들거나 외부 사이트 상태를
조회하지 않는다. current panel activation의 성공만 close를 시작하고 실패·중복·stale 결과는 현재
화면을 보존한다. SSR은 storage를 읽지 않고 Store-backed controller에서 `not-ready`를 반환한다.

Search result·recent·ranking·detail은 HDJG-47, Start Context Menu UI는 HDJG-49, 실제
Catalog·router·storage·navigation adapter와 제품 tree bootstrap은 HDJG-58이 소유한다.
