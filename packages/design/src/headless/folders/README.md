# File Explorer tab 사용 안내

Folder는 Resource이며 이 디렉터리는 File Explorer 앱의 tab 모델을 제공한다. 제품 계약의 정본은 Workbench Local Work Memory의 `seojaewan/seojaewan-blog` 프로젝트에 있는 `folder-tab-navigation-history`와 `folder-feature-architecture`다.

- [model/index.ts](./model/index.ts): `FileExplorerTab`과 위치·history 타입. Desktop 위치는 `null`이다.
- [fileExplorerTabId/index.ts](./fileExplorerTabId/index.ts): Resource ID와 구분되는 runtime tab ID 검증.
- [index.ts](./index.ts): feature에서 사용할 계약을 조합한다.

앱에서는 package root의 타입과 `WindowStore`를 사용한다. tab 생성·활성화·종료와 탐색은 Store가 소유하며 이 디렉터리의 모델을 직접 변경하지 않는다.

```ts
await WindowStore.createFileExplorerWindow(null);
await WindowStore.openFolder(folderRef);
await WindowStore.navigateFileExplorer(sessionId, tabId, childFolderRef);
```

위 예제의 ref는 현재 Workspace의 Folder ref이고 ID는 Store snapshot에서 얻는다. 초기화와 결과의 거부·no-op 처리는 [Window 사용 안내](../windows/README.md)를 따른다.

mobile에서는 Explorer Window와 tab이 각각 최대 하나다. `addFileExplorerTab`과 `minimize`는 snapshot·알림·ID 발급이 없는 no-op이며, 고정 Taskbar 버튼은 `launchMobileApplication("file-explorer")`을 사용한다. Explorer를 명시적으로 닫으면 창 없는 Desktop으로 돌아간다.
