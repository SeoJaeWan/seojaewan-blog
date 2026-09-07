# Taskbar

desktop Taskbar의 persistent Pin과 runtime visible order를 `TaskbarStore`가 함께 소유한다. Pin에는 `file-explorer`·`chrome` application identity 또는 `ExternalShortcutResourceRef`만 저장한다. Window target, active/minimized 상태, label, URL과 title은 현재 reader에서 파생한다.

## 파일별 역할

| 경로                                    | 역할                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `model/index.ts`                        | application·shortcut identity, snapshot과 reorder intent               |
| `taskbarStore/index.ts`                 | 초기화, Pin·Unpin·reorder, Window commit queue와 persistence           |
| `taskbarStore/taskbarStorage/index.ts`  | schema version 1의 독립 Taskbar storage port                           |
| `taskbarStore/operationResult/index.ts` | commit, no-op, 거절과 조용한 저장 실패                                 |
| `selectors/index.ts`                    | current Catalog·WindowState 기반 Group, Preview와 mobile read model    |
| `actions/index.ts`                      | desktop/mobile click, shortcut, close-all intent와 Window command 연결 |

## 초기화와 Window 연결

Application은 `WindowStore`를 먼저 초기화하고 Taskbar 전용 storage와 현재 `ExternalShortcutCatalog`를 연결한다. Store는 초기 Window bootstrap을 반영하고 Window subscriber를 load 전에 설치한다. subscriber callback 안에서 commit된 `WindowState`를 즉시 캡처하므로 느린 저장 중 close 다음 reopen이 발생해도 중간 target 0을 잃지 않는다.

```ts
await TaskbarStore.initialize({
  storage: taskbarStorage,
  externalShortcutCatalog: ExternalShortcutCatalog,
  windowReader: WindowStore,
});

const unsubscribe = TaskbarStore.subscribe(() => {
  renderTaskbar(
    selectTaskbarVisibleViews(TaskbarStore.getSnapshot(), WindowStore.getSnapshot(), {
      content: ContentCatalog,
      folder: FolderCatalog,
      externalShortcut: ExternalShortcutCatalog,
    }),
  );
});
```

저장값이 없거나 전체 형식이 손상되면 Explorer→Chrome seed를 복구한다. 정상 빈 배열은 보존한다. 해석 가능한 snapshot에서는 malformed·missing 항목만 제거하고 중복의 첫 등장을 유지한다. 저장 실패는 메모리 commit을 rollback하지 않으며 다음 persistent 변경이 최신 전체 목록을 다시 저장한다.

## visible order와 명령

새 Pin과 새로 실행된 unpinned application은 visible sequence 끝에 추가된다. visible application을 Pin 또는 Unpin해도 위치는 유지된다. unpinned application의 마지막 Window가 닫히면 항목과 위치가 사라지고 재실행 때 끝에 추가된다. activate, minimize와 tab 변경은 target만 바꾸며 Group 위치를 바꾸지 않는다.

```ts
const chrome = createTaskbarApplicationItem("chrome");
await TaskbarStore.unpin(chrome);
await TaskbarStore.pin(chrome);
await TaskbarStore.reorder(chrome, { type: "index", index: 0 });
await TaskbarStore.reconcileResources();
await TaskbarStore.reload();
```

`reorder`는 visible 항목을 한 commit으로 옮기고 Pin 여부는 유지한다. 저장 순서는 이동 뒤 visible sequence에서 pinned 항목만 추린 projection이다. Content와 Folder는 Taskbar Pin 입력으로 거절되며 StartStore와 Workspace를 변경하지 않는다.

## Group과 intent

`selectTaskbarVisibleViews`는 application별 WindowSession을 `stackingOrder` topmost 우선으로 반환한다. minimized Session도 running target이다. Group click은 target 0에서 기본 창, target 1 active에서 minimize, target 1 inactive에서 activate, target many에서 Preview open intent가 된다. close-all intent는 생성 시 target ID를 복사하고 실행할 때 각 ID를 한 번씩 닫는다.

ExternalShortcut은 현재 Catalog URL의 `{ target: "_blank" }` intent만 만든다. 실제 browser window와 Preview DOM은 Application/UI가 소유한다. mobile selector는 desktop Pin과 독립된 파일 탐색기→Chrome→Timestamp 구성을 반환하고 mobile intent는 `WindowStore.launchMobileApplication`의 same-app no-op 및 other-app 교체 계약을 그대로 사용한다.

정본 계약은 Workbench Local Work Memory의 `taskbar-pin-model`, `taskbar-group`, `pin-store-persistence`, `taskbar-mobile`이다.
