# Start

desktop Start 화면의 Folder, Content와 ExternalShortcut Pin을 독립된 `StartStore`가 소유한다. Pin에는 `ResourceRef`만 남기며 title, icon, URL, parent, body, Window와 Taskbar 상태는 저장하지 않는다. Resource 원본은 [Resources](../resources/README.md), Folder 배치와 복원 순서는 [Workspace](../workspace/README.md), 전체 진입점은 [Headless 안내](../README.md)를 참고한다.

## 파일별 역할

| 파일                                                                         | 역할                                                     | 인접 테스트                                           |
| ---------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------- |
| [index.ts](./index.ts)                                                       | Start public API와 type 재노출                           | 자체 동작 없음                                        |
| [model/index.ts](./model/index.ts)                                           | `StartPinnedItem`, snapshot과 reorder intent             | type-only; Store 행동 테스트에서 검증                 |
| [startStore/index.ts](./startStore/index.ts)                                 | 초기화, 구독, Pin·Unpin·reorder·reload·reconcile와 queue | [startStore.test.ts](./startStore/startStore.test.ts) |
| [startStore/operationResult/index.ts](./startStore/operationResult/index.ts) | commit, no-op, 거절과 조용한 저장 실패                   | type-only; Store 행동 테스트에서 검증                 |
| [startStore/startStorage/index.ts](./startStore/startStorage/index.ts)       | schema version 1의 Start 전용 비동기 load/save port      | type-only; Store persistence 테스트에서 검증          |
| [operations/index.ts](./operations/index.ts)                                 | Pin Action의 commit·transition·settled 순서              | [operations.test.ts](./operations/operations.test.ts) |

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
