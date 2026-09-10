# Window 사용 안내

이 디렉터리는 열린 앱 창과 탭의 runtime 상태를 제공한다. 현재 코드의 진입점과 사용 순서를 안내하며, 제품 계약의 정본은 Workbench Local Work Memory의 `seojaewan/seojaewan-blog` 프로젝트에 있는 `window-session`, `taskbar-mobile`, `state-ownership`, `common-window-frame-interaction`이다.

## 코드 탐색

| 진입점                                                                         | 역할                                                         |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| [index.ts](./index.ts)                                                         | WindowStore, 모델과 읽기 selector를 조합한다.                |
| [model/index.ts](./model/index.ts)                                             | WindowRect, frame, 앱별 Session과 WindowState를 정의한다.    |
| [windowStore/index.ts](./windowStore/index.ts)                                 | 초기화, 창·탭 명령과 구독을 제공한다.                        |
| [windowStore/operationResult/index.ts](./windowStore/operationResult/index.ts) | commit, no-op과 거부 결과를 설명한다.                        |
| [operations/index.ts](./operations/index.ts)                                   | Action을 Session queue와 transition에 연결한다.              |
| [geometry/index.ts](./geometry/index.ts)                                       | 숫자 배치를 계산하고 `getWindowBounds`로 표시 영역을 읽는다. |
| [gestures/index.ts](./gestures/index.ts)                                       | move·resize 시작 frame과 Esc rollback을 관리한다.            |
| [routeSelector/index.ts](./routeSelector/index.ts)                             | active tab에서 현재 주소를 파생한다.                         |
| [../folders/README.md](../folders/README.md)                                   | File Explorer tab의 위치와 탐색 모델을 안내한다.             |
| [../chrome/README.md](../chrome/README.md)                                     | Chrome tab의 위치와 탐색 모델을 안내한다.                    |

## 초기화

Application이 WorkspaceStore를 먼저 초기화하고, 동일한 Content Catalog와 현재 Workspace를 읽는 port를 WindowStore에 연결한다. 아래 숫자는 예제이며 실제 값은 Application에서 결정한다.

```ts
import { WindowStore, WorkspaceStore, type ContentCatalogReader } from "@window/design";

/**
 * Workspace 초기화 후 현재 runtime에 Window dependency와 숫자 배치 설정을 연결한다.
 */
async function initializeWindows(contentCatalog: ContentCatalogReader) {
  return WindowStore.initialize({
    workspace: WorkspaceStore,
    contentCatalog,
    placementConfig: {
      defaultSize: { width: 800, height: 600 },
      minSize: { width: 320, height: 200 },
      edgeMargin: 16,
      cascadeOffset: { x: 24, y: 24 },
      titlebarRecoverySize: { width: 120, height: 32 },
    },
    mode: "desktop",
    workArea: { x: 0, y: 0, width: 1280, height: 720 },
  });
}
```

정적 Store이므로 서버 요청 사이에서 사용자 상태를 공유하는 용도로 초기화하면 안 된다. 초기화 전 접근과 다른 dependency 재연결은 lifecycle 오류다. 같은 초기화 요청인지 비교할 때 reader와 `placementConfig`의 참조도 사용하므로 연결 객체를 안정적으로 유지한다. 실행 중 responsive 변경은 `setMode`와 `setWorkArea`를 같은 측정 cycle에서 연속 호출한다. 두 명령은 어느 순서로 와도 desktop frame을 보존하지만, 사이에 무관한 제품 명령을 끼우지 않는다.

## 명령과 결과

```ts
const result = await WindowStore.createFileExplorerWindow(null);

if (!result.ok) {
  // result.reason을 사용해 입력·참조·ID 발급 실패를 처리한다.
} else if (result.changed) {
  // result.value는 반영된 snapshot, result.change는 의미 있는 변경이다.
} else {
  // no-op: 현재 snapshot을 유지하고 구독 알림을 발생시키지 않았다.
}
```

Folder 기본 열기는 `openFolder(folderRef)`, Content 기본 열기는 `openContent(contentRef)`를 사용한다. 명시적인 새 창은 `createFileExplorerWindow` 또는 `openContentInNewWindow`를 사용한다. Explorer 내부 탐색은 `navigateFileExplorer(sessionId, tabId, target)`로 요청하며 target은 `{ kind: "location", location: folderRef | null }` 또는 `{ kind: "unresolved-path", path }`다. unresolved path도 정상 target과 같은 back/forward stack entry다.

Explorer tab은 navigation 외에 `query`, `expandedFolderIds`, `selection`을 독립적으로 보존한다. 정상 target 이동과 back/forward는 query와 selection을 비우고, 같은 target 이동은 scroll을 포함한 tab 상태를 보존하는 no-op이다. unresolved target의 scroll은 항상 0이다. `setFileExplorerQuery`, `setFileExplorerExpandedFolderIds`, `setFileExplorerSelection`과 `setFileExplorerScrollTop`으로 각 runtime 값을 바꾼다.

`FileExplorerWindowSession.sidebarWidth`는 같은 Window의 tab들이 공유하며 새 runtime Window의 기본값은 `DEFAULT_FILE_EXPLORER_SIDEBAR_WIDTH`다. `setFileExplorerSidebarWidth`는 다른 Explorer Window 폭을 바꾸지 않는다. tab 상태와 Sidebar 폭은 browser reload에 저장하지 않는다.

`refreshFileExplorer(sessionId, tabId, resolvedLocation?)`는 history를 추가하지 않는다. 정상 target에서는 query·selection을 비우고 scroll을 0으로 만든다. unresolved path가 다시 해석되면 controller가 최신 `resolvedLocation`을 전달해 current entry만 정상 target으로 교체하며, 계속 누락이면 인자를 생략해 같은 오류 target을 유지한다. 문자열 path 해석 자체는 Workspace selector와 controller가 담당한다. Chrome의 `refreshChrome`은 기존 location·history·scroll을 유지하고 reload revision만 증가시키는 별도 동작이다.

mobile Taskbar의 고정 앱 버튼은 `launchMobileApplication("file-explorer" | "chrome")`을 사용한다. 현재 앱은 Session·tab·history를 그대로 두는 no-op이고 다른 앱은 Explorer의 Desktop 위치(`null`) 또는 Chrome `new-tab` 창으로 한 commit에 교체된다. desktop 호출은 `mobile-mode-required`로 거부된다. mobile의 `minimize`, `addFileExplorerTab`, `addChromeTab`, move·resize·maximize는 ID 발급·snapshot 교체·알림이 없는 no-op이다. `openContent`는 현재 mobile Chrome의 유일한 tab history에서 navigate하고 Explorer가 열려 있으면 Chrome 하나로 교체한다.

명령은 queue에서 순차 실행되며 반환 Promise는 semantic 상태 반영과 동기 구독 알림 이후 완료된다. animation이나 router 완료를 기다리는 Promise는 아니다. 알림 안에서 요청한 다음 명령은 현재 commit 뒤에 실행된다.

제품 Action은 `WindowOperations.execute(action)`으로 실행한다. 같은 Session은 앞 Handle의 `settled` 뒤에 실행되고 다른 Session은 독립적이다. `close`·`minimize`는 transition 뒤 Store commit, 생성·최소화 복원·maximize·최대화 해제는 Store commit 뒤 transition을 기다린다. 생성 commit은 새 ID를 일반 subscriber에 알리기 전에 해당 Session queue에 연결하므로 재진입 요청도 생성 Operation을 추월하지 않는다. 이동·resize와 tab·navigation 명령은 별도 animation 없이 numeric intent를 Store에 전달한다.

Handle의 `committed`는 snapshot 반영, `presented`는 이 Operation이 소유한 transition, `settled`는 둘과 정리를 모두 기다린다. UI는 Handle의 `operationId`와 phase를 `TransitionRegistry`에 완료·중단·실패로 전달한다. no-op과 `session-not-found` 같은 거절은 transition을 새로 만들지 않고 모든 Handle 대기를 끝낸다.

`WindowOperations`의 `presentation` port는 실제 queue 실행 시점에 `{ operationId, sessionId, phase }`만 전달받는다. Operation은 registry 대기를 먼저 등록한 뒤 port를 호출하므로 reduced motion 구현이 호출 안에서 동기 완료를 보고해도 신호가 유실되지 않는다. port가 throw하거나 반환 Promise가 거절되면 같은 phase의 `failed` 결과로 정리하고 다음 queue를 계속 실행한다.

## move·resize gesture

```ts
import { resizeWindowBounds, WindowGestures, WindowStore } from "@window/design";

const gestures = new WindowGestures(WindowStore);
const started = gestures.begin({ sessionId, kind: "resize" });

if (started.status === "started") {
  const nextBounds = resizeWindowBounds(
    started.handle.startFrame.normalBounds,
    "nw",
    { x: pointerDeltaX, y: pointerDeltaY },
    WindowStore.getSnapshot().workArea,
    placementConfig,
  );
  await started.handle.update(nextBounds);
  await started.handle.finish();
}
```

Product Component는 pointer input을 frame 단위로 모은 뒤 계산된 숫자 bounds만 `update`에 전달한다. `update`는 위치·크기를 한 commit으로 반영한다. maximized move의 첫 update는 `normalBounds`와 normal placement를 즉시 반영해 일반 maximize/restore motion을 기다리지 않는다. `cancel()`은 먼저 접수된 update 뒤 시작 시점의 `normalBounds`·placement·minimized 값을 복구하며, 종료 또는 취소 뒤의 늦은 `update`는 `inactive`로 끝나 Store를 호출하지 않는다.

## 구독과 읽기

```ts
const unsubscribe = WindowStore.subscribe(() => {
  const snapshot = WindowStore.getSnapshot();
  // 외부 UI에 새 snapshot을 전달한다.
});

unsubscribe();
```

snapshot은 중첩 객체까지 읽기 전용이다. 직접 수정하지 않고 Store 명령을 사용한다. `getWindowBounds(frame, workArea, mode)`는 mobile이면 전체 workArea, desktop이면 placement에 맞는 사각형을 반환하고, `selectWindowRoute(snapshot, contentCatalog)`는 현재 주소를 반환한다. raw URL 파싱과 실제 router 호출은 Application에서 수행한다.

모바일 전환과 종료 정책의 정본은 `taskbar-mobile`, 주소 투영의 정본은 `application-resource-routing-404`와 `chrome-tab-navigation-history`다. WindowStore는 Workspace를 저장하거나 수정하지 않는다.

## 검증

- `pnpm --filter @window/design exec vitest run --project headless --no-cache`
- `pnpm --filter @window/design exec tsc --noEmit --incremental false -p tsconfig.json`
- `pnpm --filter @window/design lint`
- `pnpm --filter @window/design build`

함수의 정상·오류·부수 효과는 소유 요소의 인접 테스트에서 검증한다. queue와 모바일 교체 같은 여러 명령의 조합은 Store 통합 시나리오에서 검증한다. package export 이름 목록을 고정하는 테스트는 두지 않는다.

## React controller

제품 root는 `HeadlessRuntimeProvider` 아래에서 `useWindowController()`를 호출한다. `viewModel.status === "ready"`일 때의 `snapshot`은 WindowStore가 반환한 같은 immutable 객체이며, `actions.execute`는 `WindowAction`을 `WindowOperations`로 보낸다. `actions.beginGesture`는 runtime과 같은 Store를 쓰는 `WindowGestures` Handle을 반환한다. `completeTransition`·`abortTransition`·`failTransition`은 Handle의 `operationId`와 현재 phase만 전달한다.

SSR 또는 브라우저 초기화 전에는 `not-ready`이며 hook이 WindowStore를 대신 초기화하지 않는다. Application은 Workspace와 Catalog를 준비해 WindowStore를 먼저 초기화하고 runtime을 한 번 만든다. 일반 caller는 semantic commit, 표현과 정리가 모두 필요한 경우 `handle.settled`를 기다린다.
