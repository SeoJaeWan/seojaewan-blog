# Headless 사용 안내

UI 없이 성립하는 Resource 모델과 Start·Taskbar·Workspace·Window 상태 및 명령을 제공한다. React, DOM, Base UI에 의존하지 않으며 화면 렌더링, 실제 라우팅과 저장 매체는 구현하지 않는다.

이 README는 현재 checkout의 코드 탐색과 사용 안내다. 지속적인 아키텍처·계약·컨벤션의 정본은 Workbench Local Work Memory의 `seojaewan/seojaewan-blog` 프로젝트에 있는 `resource-model`, `start-screen-pin-model`, `pin-store-persistence`, `workspace-resource-placement`, `window-session`, `taskbar-mobile`, `chrome-tab-navigation-history`, `application-resource-routing-404`, `module-boundaries`, `coding`, `folder-structure`다.

## Resources와 Workspace의 연결

| 구분        | 답하는 질문                              | 소유 데이터/API                                                             |
| ----------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| Resources   | 이것은 무엇이며 존재하는가?              | UUID, ResourceRef, 종류별 원본 모델, Catalog 계약, ResourceLookup           |
| Start       | Start에 무엇을 어떤 순서로 고정하는가?   | ResourceRef Pin, immutable snapshot, label·reorder, 저장·복원·reconcile     |
| Workspace   | 어디에 놓여 있으며 어떻게 변경하는가?    | Folder 원본, ResourcePlacement, 현재 snapshot, 생성·이름 변경·이동          |
| Window      | 어떤 앱 창과 tab이 현재 열려 있는가?     | runtime Session, frame, tab navigation, mode, snapshot과 route selector     |
| Application | 실제 데이터와 저장 매체는 어디서 오는가? | Content·ExternalShortcut entries, 본문 reader, storage adapter, 최초 초기화 |

예를 들어 Content를 Blog 폴더에서 Desktop으로 이동하면 Workspace의 `placement.parent`만 `null`로 바뀐다. Content의 ID, title, slug와 body는 바뀌지 않는다. Folder 이름을 바꿔도 Folder ID는 유지된다.

Resources는 Workspace를 import하지 않는다. Workspace가 Resource 계약을 사용하며, `FolderCatalog`는 WorkspaceStore의 현재 Folder 원본을 Resource의 공통 Catalog 계약으로 노출한다. Content와 ExternalShortcut 원본은 Application이 제공한다. Folder만 사용자가 runtime에 생성·변경하므로 Store를 읽는 구체 Catalog가 headless에 있다.

## 폴더와 진입점

| 경로                                | 역할                                                                |
| ----------------------------------- | ------------------------------------------------------------------- |
| [index.ts](./index.ts)              | 각 feature의 public API를 모으는 진입점. 자체 제품 로직은 없다.     |
| [resources/](./resources/README.md) | identity, 참조, 원본 및 조회 계약. 파일별 역할과 Catalog 사용 예제. |
| [start/](./start/README.md)         | Start Resource Pin, 순서, storage port, 복원과 조용한 저장 실패.    |
| [taskbar/](./taskbar/README.md)     | Taskbar Pin, visible order, Window Group과 desktop/mobile intent.   |
| [workspace/](./workspace/README.md) | 배치, 초기화, 저장, 구독과 명령. lifecycle과 command queue 설명.    |
| [windows/](./windows/README.md)     | Window model, static Store, geometry와 route 읽기 selector.         |
| [folders/](./folders/README.md)     | File Explorer tab과 Folder 또는 Desktop location model.             |
| [chrome/](./chrome/README.md)       | Chrome tab, Content/new-tab/404 location과 검증된 내부 주소 model.  |

공유 요소는 `resources/model/index.ts`처럼 feature 아래의 동급 **요소 폴더**에 둔다. 단일 owner 전용 요소는 `workspace/workspaceStore/workspaceStorage/index.ts`처럼 owner 아래에 둔다. 각 `*.test.ts`는 같은 폴더의 구현을 검증한다. 폴더 깊이가 내부 소유권을 나타내지만, storage처럼 외부 구현에 필요한 type은 feature 진입점에서 공개할 수 있다.

소비 Application은 package의 공개 진입점을 사용하고 내부 파일을 deep import하지 않는다. `IdGenerator`, `reconcileWorkspace`와 Store의 상태 계산 helper는 공개 API가 아니다.

## 사용 순서

1. Application이 정적 Catalog, 고정 ID의 Workspace seed와 Store별 storage를 준비한다.
2. 브라우저에서 `WorkspaceStore.initialize(...)`의 완료를 기다린다.
3. 초기화된 `FolderCatalog`와 정적 Catalog로 `ResourceLookup`을 구성한 뒤 `StartStore.initialize(...)`를 호출한다.
4. 현재 상태는 각 Store의 `getSnapshot()`, 변경 알림은 `subscribe()`로 읽는다. 원본 조회는 종류별 Catalog를 사용한다.
5. Workspace 변경은 `createFolder`, `renameFolder`, `moveResource`로, Start 변경은 `pin`, `unpin`, `reorder`로 요청한다. 각 Store가 알림과 저장을 담당한다.

서버 요청 사이에 이 정적 Store로 사용자 상태를 공유하면 안 된다.

## WindowStore와 route projection

소비 Application은 package root에서 Window API를 가져온다. 먼저 Workspace를 초기화한 뒤 현재 Workspace snapshot과 Content Catalog를 WindowStore에 연결한다. responsive adapter는 browser 폭을 Store가 읽게 하지 않고 명시적인 `setMode` 명령을 보낸다.

```ts
import { WindowStore, selectWindowRoute } from "@window/design";

await WindowStore.initialize({
  workspace: WorkspaceStore,
  contentCatalog: ContentCatalog,
  placementConfig,
  mode: "desktop",
  workArea,
});

const unsubscribe = WindowStore.subscribe(() => {
  const route = selectWindowRoute(WindowStore.getSnapshot(), ContentCatalog);
  syncApplicationRoute(route);
});

await WindowStore.setMode("mobile");
```

`selectWindowRoute`는 active Chrome tab에서 주소 문자열만 파생한다. raw URL parsing, router 호출, direct-entry bootstrap과 같은 주소의 중복 호출 생략은 Application adapter가 담당한다. WindowStore 결과는 semantic snapshot commit과 구독 알림 완료를 뜻하며 animation이나 router 완료를 뜻하지 않는다.

## 초기화와 변경의 안전 경계

- 초기화는 `contentCatalog`, `externalShortcutCatalog`를 한 번 연결한다. Folder는 복원 중인 후보에서 확인하므로 미초기화 Store나 전체 lookup을 읽지 않는다. 전역 ID 충돌은 commit 전에 거부한다.
- 이동은 입력 ID와 실제 placement의 kind 일치를 확인한다. 불일치는 `resource-kind-mismatch`로 거부하며 상태·알림·저장을 만들지 않는다.
- 초기화의 load부터 첫 저장까지 명령과 같은 queue에서 실행한다. 진행 중 요청한 명령은 첫 작업 뒤에서 대기한다. 초기화가 snapshot 생성 전에 실패하면 대기 명령도 초기화 오류로 거부한다.
- 첫 저장만 실패하면 메모리 snapshot은 유지하고 `committed: true` 결과를 반환한다. 후속 명령은 그 snapshot을 사용한다.

정적 Catalog의 실제 데이터와 저장 adapter는 Application 소유이며 실행 중 교체하지 않는다. 초기화 알림은 저장 완료 알림이 아니다. 초기화 작업이나 storage adapter가 뒤에 대기하는 Store 명령을 await하면 안 된다.

초기화 중 명령 대기 정책과 Catalog 연결·실패 처리의 정본은 Local Work Memory의 `workspace-resource-placement`다. 이 안내는 해당 계약을 현재 코드의 사용 순서로 설명한다.
