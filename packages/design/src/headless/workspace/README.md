# Workspace

브라우저 runtime의 Folder 원본과 Resource 배치를 하나의 `WorkspaceStore` 정적 class가 소유한다. 사용자는 state나 ID generator를 매 명령에 전달하지 않는다. Resource의 원본·참조 계약은 [Resources](../resources/README.md), 전체 연결과 정본 문서 위치는 [Headless 안내](../README.md)를 참고한다.

## 파일별 역할

| 파일                                                                                       | 역할                                                      | 인접 테스트                                                                                  |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [index.ts](./index.ts)                                                                     | 외부에 필요한 Workspace API와 type 재노출                 | 자체 동작 없음                                                                               |
| [model/index.ts](./model/index.ts)                                                         | `WorkspaceState`, `ResourcePlacement` 저장 형태           | type-only; runtime 동작은 Store에서 검증                                                     |
| [seed/index.ts](./seed/index.ts)                                                           | 고정 inbox ID로 Desktop의 Blog와 초기 Content 배치 생성   | [seed.test.ts](./seed/seed.test.ts)                                                          |
| [folderCatalog/index.ts](./folderCatalog/index.ts)                                         | Store의 현재 Folder 원본을 `has/get/list`로 조회          | [folderCatalog.test.ts](./folderCatalog/folderCatalog.test.ts)                               |
| [idGenerator/index.ts](./idGenerator/index.ts)                                             | 생성·복구가 공유하는 내부 Web Crypto UUID 발급기          | [idGenerator.test.ts](./idGenerator/idGenerator.test.ts)                                     |
| [workspaceStore/index.ts](./workspaceStore/index.ts)                                       | 초기화, 검증·동결, 상태, 구독, 명령 계산·직렬화와 저장    | [workspaceStore.test.ts](./workspaceStore/workspaceStore.test.ts)                            |
| [workspaceStore/operationResult/index.ts](./workspaceStore/operationResult/index.ts)       | domain 결과와 사유별 발생 조건                            | type-only; 결과는 Store 테스트에서 검증                                                      |
| [operations/index.ts](./operations/index.ts)                                               | create·rename·move Action과 완료 시점 연결                | [operations.test.ts](./operations/operations.test.ts)                                        |
| [workspaceStore/reconcileWorkspace/index.ts](./workspaceStore/reconcileWorkspace/index.ts) | 중복·stale 참조·잘못된 parent·순환 복구와 새 Content 반영 | [reconcileWorkspace.test.ts](./workspaceStore/reconcileWorkspace/reconcileWorkspace.test.ts) |
| [workspaceStore/workspaceStorage/index.ts](./workspaceStore/workspaceStorage/index.ts)     | Store가 사용하는 비동기 전체 snapshot 저장 port           | type-only; 저장 조율은 Store 테스트에서 검증                                                 |

Store 하위 폴더는 Store 전용 책임이다. `WorkspaceStorage`와 결과 type은 외부 연동에 필요해 공개하지만 `reconcileWorkspace`는 내부 구현이다. `idGenerator`는 명령과 복구에서 공유하며 외부 공개·주입하지 않는다.

## Snapshot과 초기화

`WorkspaceState`는 `schemaVersion: 1`, `contentInbox`, `folders`, `placements`를 담는다. Folder 원본은 `{ ref, name }`, 배치는 `{ resource, parent }`다. `parent: null`은 Desktop이다. Window, tab, history나 Content 본문은 저장하지 않는다.

`initialize`에는 다음 네 dependency를 최초 한 번 전달한다. Component props나 개별 명령 인자가 아니며, 같은 runtime에서 정적 Catalog를 교체하지 않는다.

| 입력                      | 준비 책임                                                              |
| ------------------------- | ---------------------------------------------------------------------- |
| `storage`                 | Application의 `load/save` adapter                                      |
| `seed`                    | `createWorkspaceSeed({ contentInbox, content })`로 만든 최초 기본 상태 |
| `contentCatalog`          | Application의 정적 Content Catalog; 현재 ref 목록도 여기서 파생        |
| `externalShortcutCatalog` | Application의 정적 ExternalShortcut Catalog                            |

저장값을 읽고 schema를 검증한다. 저장값이 `null`이거나 읽기·파싱에 실패하면 seed를 사용한다. 이어서 reconcile로 유효한 사용자 배치를 보존하고, 누락 inbox와 새 Content 등을 반영한다. 결과를 복제·동결해 현재 snapshot으로 바꾼 뒤 구독자를 알리고 저장한다. seed는 매 실행마다 사용자 배치를 덮어쓰는 값이 아니다.

반복 초기화는 네 dependency가 각각 같은 객체 참조일 때 기존 초기화 Promise를 돌려준다. 내용만 같은 새 객체로 교체하면 거부한다. Folder는 복원 중인 후보 목록에서 검증하고 정적 원본과의 전역 ID 중복은 commit 전에 거부한다. 초기화가 실패하면 같은 dependency로 재호출해도 기존 실패 Promise를 돌려주며 자동 재시도하지 않는다.

아래는 Application이 공개 API로 연결하는 순서다. `contentEntries`, `shortcutEntries`, `storage`, 고정 `inboxRef`는 Application이 준비한 값이다.

```ts
const contentCatalog = createStaticCatalog<Content>(contentEntries);
const externalShortcutCatalog = createStaticCatalog<ExternalShortcut>(shortcutEntries);
const seed = createWorkspaceSeed({
  contentInbox: inboxRef,
  content: contentCatalog.list().map(({ ref }) => ref),
});
const initialized = await WorkspaceStore.initialize({
  storage,
  seed,
  contentCatalog,
  externalShortcutCatalog,
});
if (!initialized.ok) {
  // 저장 실패는 committed: true: 메모리 상태는 사용 가능하지만 사용자에게 안내한다.
}
const resourceLookup = createResourceLookup({
  content: contentCatalog,
  folder: FolderCatalog,
  externalShortcut: externalShortcutCatalog,
});
```

기존 initialize 입력의 `currentContent`와 `resourceLookup`은 제거되었다. 전체 lookup은 초기화 이후 구성하며 Store 초기화에 다시 주입하지 않는다.

## 초기화 이후 사용

다음은 초기화 완료 후 공개 API를 사용하는 코드 조각이다. `targetFolder`는 현재 snapshot에서 얻은 Folder다.

```ts
const unsubscribe = WorkspaceStore.subscribe(() => {
  const snapshot = WorkspaceStore.getSnapshot();
  // snapshot을 읽어 화면에 필요한 값을 다시 계산한다.
});

const targetFolder = WorkspaceStore.getSnapshot().folders[0];
if (targetFolder !== undefined) {
  const result = await WorkspaceStore.renameFolder(targetFolder.ref, "내 글");
  if (!result.ok) {
    if (result.reason === "storage-write-failed") {
      // 메모리에는 이미 반영됨: result.committed === true
      // 사용자에게 저장 실패를 안내한다. 성공이나 rollback으로 취급하지 않는다.
    } else if (result.reason !== "no-op") {
      // domain 거절 사유를 안내한다. 상태는 변경되지 않았다.
    }
  }
}

await WorkspaceStore.createFolder("자료", null); // Desktop 아래 새 Folder
// 이동할 ref를 얻었다면 WorkspaceStore.moveResource(ref, parent)를 사용한다.
unsubscribe(); // 소비자 정리 시 구독 해제
```

실제 호출부는 생성·이동 결과도 이름 변경처럼 처리한다. 예상하지 못한 예외나 초기화 오류는 domain 결과와 별개로 처리해야 한다. `subscribe`는 등록 즉시 호출하지 않으며 알림에서 저장 완료를 의미하지도 않는다. 현재 snapshot은 직접 읽고, 변경은 명령으로만 요청한다.

제품 Action 경계에서는 `WorkspaceOperations.execute`를 사용한다. 목록 queue는 create·rename·move를 순서대로 실행하고 `committed`는 메모리 반영 직후, `settled`는 Store의 저장 성공 또는 rollback 없는 저장 실패까지 끝난 뒤 완료된다. Workspace 변경은 이 단계에서 별도 UI transition을 소유하지 않으므로 `presented`는 `not-required`다.

## Command queue 원리

```ts
const result = WorkspaceStore.commandQueue.then(command, command);
WorkspaceStore.commandQueue = result.then(
  () => undefined,
  () => undefined,
);
return result;
```

`Promise.then(onFulfilled, onRejected)`의 첫 인자는 성공 handler, 둘째 인자는 실패 handler다. 앞 Promise가 성공하면 첫 번째 `command`, 실패하면 두 번째 `command`가 실행된다. **둘 중 하나만 한 번 실행된다.** 첫 handler가 실패한다고 같은 `then`의 둘째 handler가 실행되는 것도 아니다. 그 실패는 새 `result`의 rejection이 된다.

`command`는 이전 결과를 인자로 사용하지 않는 함수다. 앞 작업이 끝날 때까지 기다린 뒤 실행하고, 반환한 Promise가 끝날 때까지 새 `result`도 기다린다. 따라서 초기화 이후 명령 A의 계산·commit·저장이 끝나야 명령 B가 최신 snapshot에서 계산을 시작한다.

두 번째 `then`은 내부 대기열의 꼬리를 `Promise<void>`로 만든다. 성공값도 오류도 내부적으로는 `undefined`로 정리하여 다음 명령이 앞선 rejection 때문에 막히지 않게 한다. 현재 꼬리는 항상 성공하도록 정규화하므로 첫 줄의 실패 handler는 방어적인 분기다.

호출자에게는 정규화한 queue가 아니라 **원래 `result`**를 반환한다. 그러므로 호출자는 성공값이나 예외를 그대로 관찰할 수 있다. `{ ok: false, reason }`은 실패를 표현한 정상 반환값이지 Promise rejection은 아니다. 내부 꼬리의 정규화가 이를 성공 결과로 바꾸지는 않는다.

초기화 전체도 queue의 첫 작업이다. 시작 전 명령은 즉시 초기화 오류로 거부하며, 진행 중 명령은 대기 후 snapshot을 확인한다. 초기화가 snapshot 생성 전에 실패하면 대기 명령은 reject된다. 첫 저장만 실패하면 committed snapshot을 유지하고 후속 명령을 이어 간다. 구독자나 storage adapter가 초기화 뒤의 명령 완료를 초기화 작업 자체에서 기다리도록 연결하면 교착될 수 있으므로 그런 역방향 대기는 만들지 않는다.

이동은 실제 placement의 ID와 kind를 확인하고 `resource-kind-mismatch`를 별도로 반환한다. Folder 검증은 확인된 실제 ref를 사용한다. 새 Folder ID는 Workspace뿐 아니라 배치되지 않은 정적 원본과의 충돌도 검사한다.

## Storage와 실행 환경

`load()`는 저장값 또는 `null`을, `save(snapshot)`은 전체 snapshot의 저장 완료를 전달한다. 저장 key, JSON 처리, migration과 localStorage 접근은 Application adapter가 구현한다. 명령마다 Application이 수동으로 저장하지 않는다.

이 분리는 React 여부가 아니라 서버·브라우저 경계 때문이다. Next.js 등의 서버 렌더링에서는 브라우저에서 접근 가능한 시점에 초기화하고, 서버 요청 사이에 이 singleton으로 사용자 상태를 공유하지 않는다. headless import만으로 localStorage 접근이나 ID 발급은 일어나지 않는다. 새 Folder 생성과 inbox 복구 시에는 `crypto.randomUUID()`를 지원하는 runtime이 필요하다.

## React controller

`useWorkspaceController()`는 `viewModel`과 `actions`를 분리한다. ready snapshot은 WorkspaceStore가 소유한 immutable 상태이고 `actions.execute`는 create·rename·move Action을 기존 Store 명령과 저장 결과에 연결한다. Context에 Workspace snapshot을 복사하지 않는다.

서버에서는 항상 안정적인 `not-ready` 값을 사용한다. Application은 브라우저 storage와 Catalog로 WorkspaceStore 초기화를 끝낸 뒤 `createHeadlessRuntime()`을 한 번 호출한다. Workspace Operation은 별도 표현 전환이 없으므로 `presented`는 `not-required`이고, 저장까지 포함한 결과는 `settled`에서 확인한다.
