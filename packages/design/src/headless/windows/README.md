# Window 사용 안내

이 디렉터리는 열린 앱 창과 탭의 runtime 상태를 제공한다. 현재 코드의 진입점과 사용 순서를 안내하며, 제품 계약의 정본은 Workbench Local Work Memory의 `seojaewan/seojaewan-blog` 프로젝트에 있는 `window-session`, `taskbar-mobile`, `state-ownership`, `common-window-frame-interaction`이다.

## 코드 탐색

| 진입점                                                                         | 역할                                                         |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| [index.ts](./index.ts)                                                         | WindowStore, 모델과 읽기 selector를 조합한다.                |
| [model/index.ts](./model/index.ts)                                             | WindowRect, frame, 앱별 Session과 WindowState를 정의한다.    |
| [windowStore/index.ts](./windowStore/index.ts)                                 | 초기화, 창·탭 명령과 구독을 제공한다.                        |
| [windowStore/operationResult/index.ts](./windowStore/operationResult/index.ts) | commit, no-op과 거부 결과를 설명한다.                        |
| [geometry/index.ts](./geometry/index.ts)                                       | 숫자 배치를 계산하고 `getWindowBounds`로 표시 영역을 읽는다. |
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

정적 Store이므로 서버 요청 사이에서 사용자 상태를 공유하는 용도로 초기화하면 안 된다. 초기화 전 접근과 다른 dependency 재연결은 lifecycle 오류다. 같은 초기화 요청인지 비교할 때 reader와 `placementConfig`의 참조도 사용하므로 연결 객체를 안정적으로 유지한다. 실행 중 변경은 `setMode`와 `setWorkArea`를 사용한다.

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

Folder 기본 열기는 `openFolder(folderRef)`, Content 기본 열기는 `openContent(contentRef)`를 사용한다. 명시적인 새 창은 `createFileExplorerWindow` 또는 `openContentInNewWindow`를 사용한다. Explorer 내부 탐색은 `navigateFileExplorer(sessionId, tabId, folderRef)`로 요청한다.

Chrome의 `addChromeTab`, `navigateChrome`, `goBackChrome`, `goForwardChrome`, `setChromeScrollTop`, `refreshChrome`은 Session·tab ID를 받는다. Explorer에도 대응하는 tab·history·scroll 명령이 있다. 각 함수의 입력과 오류 조건은 해당 JSDoc을 확인한다.

명령은 queue에서 순차 실행되며 반환 Promise는 semantic 상태 반영과 동기 구독 알림 이후 완료된다. animation이나 router 완료를 기다리는 Promise는 아니다. 알림 안에서 요청한 다음 명령은 현재 commit 뒤에 실행된다.

## 구독과 읽기

```ts
const unsubscribe = WindowStore.subscribe(() => {
  const snapshot = WindowStore.getSnapshot();
  // 외부 UI에 새 snapshot을 전달한다.
});

unsubscribe();
```

snapshot은 중첩 객체까지 읽기 전용이다. 직접 수정하지 않고 Store 명령을 사용한다. `getWindowBounds(frame, workArea)`는 표시할 사각형을 반환하고, `selectWindowRoute(snapshot, contentCatalog)`는 현재 주소를 반환한다. raw URL 파싱과 실제 router 호출은 Application에서 수행한다.

모바일 전환과 종료 정책의 정본은 `taskbar-mobile`, 주소 투영의 정본은 `application-resource-routing-404`와 `chrome-tab-navigation-history`다. WindowStore는 Workspace를 저장하거나 수정하지 않는다.

## 검증

- `pnpm --filter @window/design exec vitest run --project headless --no-cache`
- `pnpm --filter @window/design exec tsc --noEmit --incremental false -p tsconfig.json`
- `pnpm --filter @window/design lint`
- `pnpm --filter @window/design build`

함수의 정상·오류·부수 효과는 소유 요소의 인접 테스트에서 검증한다. queue와 모바일 교체 같은 여러 명령의 조합은 Store 통합 시나리오에서 검증한다. package export 이름 목록을 고정하는 테스트는 두지 않는다.
