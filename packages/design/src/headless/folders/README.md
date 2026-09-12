# File Explorer headless 사용 안내

Folder는 Resource이며 이 디렉터리는 File Explorer의 tab 모델, 위치별 view settings, 제품 read model과 Action controller를 제공한다. 제품 계약의 정본은 Workbench Local Work Memory의 `seojaewan/seojaewan-blog` 프로젝트에 있는 `folder-tab-navigation-history`, `folder-search`, `folder-sidebar`, `folder-view-sort-settings`, `folder-window-layout-responsive`와 `context-menu-architecture`다.

- [model/index.ts](./model/index.ts): `FileExplorerTab`과 위치·history 타입. Desktop 위치는 `null`이다.
- [fileExplorerTabId/index.ts](./fileExplorerTabId/index.ts): Resource ID와 구분되는 runtime tab ID 검증.
- [selectors/index.ts](./selectors/index.ts): title/address/breadcrumb, direct children/search, Sidebar/status와 mobile projection.
- [actions/index.ts](./actions/index.ts): 제품 root가 한 실행 진입점으로 전달하는 serializable intent.
- [controller/index.ts](./controller/index.ts): 기존 Window·Workspace·Start·view settings 구독과 Action routing.
- [contextMenu/index.ts](./contextMenu/index.ts): Sidebar invocation target, capability와 callback 없는 menu entry.
- [viewSettings/index.ts](./viewSettings/index.ts): location-global persistent view/sort settings Store.
- [index.ts](./index.ts): feature에서 사용할 계약을 조합한다.

Application은 Workspace와 Folder view settings 초기화 뒤 Catalog reader를 runtime에 연결한다. controller는 기존 Store snapshot을 Context state로 복사하지 않고 `useSyncExternalStore`로 각각 구독한다.

```ts
const runtime = createHeadlessRuntime({
  fileExplorerResources: {
    content: ContentCatalog,
    externalShortcut: ExternalShortcutCatalog,
  },
});

const explorer = useFileExplorerController(sessionId);
if (explorer.viewModel.status === "ready") {
  explorer.actions.execute({
    type: "file-explorer.navigation.submit-address",
    path: "/Blog/React",
  });
}
```

주소 submit은 Workspace path resolver 결과를 정상 또는 `unresolved-path` Window Action으로 보낸다. `actions.execute`가 반환한 기존 Operation Handle 또는 view settings Promise에서 commit과 저장 실패를 해석하며, `committed: true` 저장 실패를 validation 거절처럼 재실행하지 않는다. raw address/search input과 IME composition은 Product Component에 남긴다.

Sidebar Context Menu의 create/rename entry를 실행하면 Store를 바꾸지 않고 `inline-edit-request`가 반환된다. Product Component는 이 값으로 draft와 focus를 연 뒤 Enter에서 `file-explorer.folder.create` 또는 `file-explorer.folder.rename`을 실행한다. Esc와 focus-out은 Action을 보내지 않는다.

read model의 `directChildren`은 현재 정상 위치의 세 Resource kind 전체이며, `items`는 location-global sort와 tab-local query가 적용된 표시 목록이다. 오류 위치는 제출 주소를 유지하면서 breadcrumb, collection, selection과 Sidebar current row를 비운다. mobile에서는 `tabs`, `sidebar`, `status`가 `null`이고 effective view는 Medium Icons다.

mobile에서는 Explorer Window와 tab이 각각 최대 하나다. `addFileExplorerTab`과 `minimize`는 snapshot·알림·ID 발급이 없는 no-op이며, 고정 Taskbar 버튼은 `launchMobileApplication("file-explorer")`을 사용한다. Explorer를 명시적으로 닫으면 창 없는 Desktop으로 돌아간다.
