# Taskbar

Start·Taskbar 공통 검색의 적용 query·detail, 공유 recent와 실제 열기는
[`search/README.md`](./search/README.md)의 `runtime.search` 연결을 사용한다.
raw 입력과 close 완료는 기존 primaryPanel 공개 Action이 소유한다.

desktop Taskbar의 persistent Pin과 runtime visible order를 `TaskbarStore`가 함께 소유한다. Pin에는 `file-explorer`·`chrome` application identity 또는 `ExternalShortcutResourceRef`만 저장한다. Window target, active/minimized 상태, label, URL과 title은 현재 reader에서 파생한다.

## 파일별 역할

| 경로                                    | 역할                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------- |
| `model/index.ts`                        | application·shortcut identity, snapshot과 reorder intent                    |
| `taskbarStore/index.ts`                 | 초기화, Pin·Unpin·reorder, Window commit queue와 persistence                |
| `taskbarStore/taskbarStorage/index.ts`  | schema version 1의 독립 Taskbar storage port                                |
| `taskbarStore/operationResult/index.ts` | commit, no-op, 거절과 조용한 저장 실패                                      |
| `selectors/index.ts`                    | current Catalog·WindowState 기반 Group, Preview와 mobile read model         |
| `rootController/index.ts`               | 공통 mode·mobile view와 Root·Window Action gateway를 제품 Root에 연결       |
| `timestamp/index.ts`                    | local 형식, 분 경계 scheduler·clock port와 React controller                 |
| `actions/index.ts`                      | Windows·Search·desktop/mobile click, shortcut, close-all intent와 실행 경계 |
| `operations/index.ts`                   | Pin Action의 commit·측정·transition·settled 조율                            |
| `primaryPanel/operations/index.ts`      | Start·Search 상호 전환, close 완료 초기화와 Resource 결과 조율              |
| `primaryPanel/controller/index.ts`      | panel snapshot·Action과 UI transition 완료 신호의 React 경계                |
| `resourceOpen/operations/index.ts`      | Window와 external navigation 완료 결과의 공통 open 분류                     |

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

`TaskbarOperations.execute`는 Pin 목록 변경을 직렬화한다. 새 visible 항목 Pin은 commit 뒤 enter, 실제로 사라질 Unpin은 exit 뒤 commit, reorder는 이전 측정 → commit → 새 측정 → 이동 순서다. 실행 중 application은 Pin·Unpin 뒤에도 visible 항목이 남으므로 항목 transition을 만들지 않는다. `executeTaskbarWindowOperationIntent`는 기존 Taskbar intent를 Window Operation으로 연결하며 close-all은 시작 시 복사한 Session ID마다 Handle을 즉시 만들어 각 Session queue가 독립적으로 진행하게 한다.

정본 계약은 Workbench Local Work Memory의 `taskbar-pin-model`, `taskbar-group`, `pin-store-persistence`, `taskbar-mobile`이다.

## React controller

`useTaskbarController()`는 persistent·visible snapshot의 준비 상태를 `viewModel`로, Pin Action과 transition 완료 신호를 `actions`로 제공한다. snapshot은 TaskbarStore가 소유하며 Provider는 복제하거나 재마운트 때 running-only 위치를 초기화하지 않는다.

Application은 WindowStore와 Catalog·storage를 연결해 TaskbarStore 초기화를 마친 뒤 같은 runtime을 Provider에 전달한다. 실행 중 application의 Pin 변경처럼 표현이 필요 없는 결과는 `presented: not-required`이며, 저장까지 포함한 최종 결과는 `settled`에서 확인한다. SSR에서는 Window singleton과 storage를 읽지 않고 `not-ready`를 사용한다.

`useTaskbarRootController()`는 별도 breakpoint나 browser API를 만들지 않고 Window runtime의
`WindowState.mode`와 `selectMobileTaskbarView()` 결과를 Root 읽기 모델로 투영한다. Windows·Search
trigger는 각각 `{ type: "request-windows" }`, `{ type: "request-search" }` Action을
runtime-local `primaryPanel` Operation의 Start·Search identity로 변환한다. Mobile File Explorer와
Chrome 입력은 `createMobileTaskbarApplicationIntent()`와 `executeTaskbarWindowOperationIntent()`를 거쳐
기존 Window Operation의 `{ type: "launch-mobile-application", applicationId }` Action으로 전달한다.
active application을 다시 누른 경우도 같은 Action을 보내며 same-app no-op과 application 교체는 기존
Window headless 계약이 판정한다. `TaskbarRoot`는 같은 Provider 안에서 이 값을 소비하며, 준비 전에는
안정적인 `not-ready` surface를 렌더링한다.

`useTaskbarTimestampController()`는 Application callback 없이 mount 즉시 현재 `Date`를 읽고
24시간제 `HH:mm`와 `YYYY-MM-DD`를 제공한다. 첫 timeout은 다음 분 경계에 맞추며 각 tick은
이전 값에 1분을 더하지 않고 clock의 현재 `Date`를 다시 읽으므로 지연, 자정과 local timezone
변경을 다음 tick에서 반영한다. server render와 hydration 첫 render는 같은 `not-ready` 표현을
사용하고 cleanup은 예약 timer를 취소한다. Story나 headless host가 시각을 결정적으로 고정해야
할 때는 `TaskbarTimestampClock` port를 사용할 수 있으며 UI 또는 Application 시간 callback은
필요하지 않다.

```tsx
const runtime = createHeadlessRuntime({ externalNavigation, windowPresentation });

<HeadlessRuntimeProvider runtime={runtime}>
  <TaskbarRoot resourceReaders={resourceReaders} />
</HeadlessRuntimeProvider>;
```

현재 Root는 desktop에서 Windows→Search→빈 실행 항목 배치 영역→Timestamp, mobile에서
파일 탐색기→Chrome→Timestamp 순서를 제공한다. `TaskbarApplicationButton`은 앱 identity·label·active·running
표현과 callback을 받아 두 화면에서 사용할 수 있다. mobile Root는 기존 mobile Action을 연결하며
향후 desktop Group은 자신의 실행 정책을 연결한다. 버튼 내부에서 mode나 Window 정책을 계산하지 않는다.
`active`는 실행 중임을 포함하며, `running`은 비활성·최소화된 앱의 표시선을 표현한다.

`TaskbarSearch`는 Base UI Input을 직접 조합한다. `TaskbarSearchPanel`이 실제 Taskbar input 하나를
Popover trigger와 `primaryPanel` query에 연결한다. 클릭·Tab focus로 Search를 열고, 이미 열린 input을
재클릭하면 focus를 유지한다. 문자·한글 조합·연속 공백은 추가 열기 요청 없이 query에 그대로 전달된다.
실제 input focus는 푸른 돋보기 표현과 연결되며, 누르는 동안에도 아이콘 크기를 유지한다.

```tsx
<HeadlessRuntimeProvider runtime={runtime}>
  <TaskbarRoot />
</HeadlessRuntimeProvider>
```

`TaskbarRoot`는 Start와 Search에 같은 primary panel connection을 전달하므로 둘을 동시에 표시하지
않고 현재 panel의 close 완료 뒤 다음 panel을 연다. Start는 전달받은 `ResourceReaders`로 현재
pinned label과 Content·ExternalShortcut 모두 보기 group을 만들고 Folder는 모두 보기에서 제외한다.
pinned keyboard·pointer drag와 All/Index focus·scroll은 제품 Component가 연결한다.
Search 결과·recent·detail과 desktop Group은 후속 작업에서 연결한다. Storybook의 설명·상태 미리보기 작성 규칙은
Memory의 `storybook-authoring`을 따른다.
관찰 가능한 입력값·Action을 표시하며 실제 Window 완료를 가짜로 처리하지 않는다.

## Primary panel Operation

`PrimaryPanelOperations`는 Start와 Search가 공유하는 하나의 transition queue를 사용한다. switch는
현재 panel의 `primary-panel-exit` 완료·중단·watchdog을 기다리고 close 완료 command로 해당 query를
초기화한 다음, 실행 시점에도 desktop이면 target을 activate하고 `primary-panel-enter`를 기다린다.
일반 연속 trigger는 취소하지 않고 앞 Operation의 settled 뒤 최신 snapshot에서 다시 판정한다.

query Action은 panel transition과 다른 target에 두어 opening animation 중 한글 조합과 공백 입력을
지연하지 않는다. `dismiss-for-mobile`은 호출 즉시 현재 activation을 무효화하므로 진행 중 switch의
exit 뒤 desktop panel이 다시 열리지 않는다. Component unmount는 `abortTransition`으로 표현 대기를
끝내며 제품 close·query 정리와 queue 진행은 계속된다. reduced-motion은 Component가 같은 phase를
즉시 `completeTransition`하면 별도 semantic 분기 없이 같은 최종 snapshot에 도달한다.

Resource 연결은 실제 open 직전 `track-resource-open`으로 request ID를 Start 또는 Search의 현재
activation에 묶고, 완료 뒤 `settle-resource-open`으로 명시적인 `succeeded` 또는 `failed`를 전달한다.
실패는 panel, query와 browse/result/detail 상태를 바꾸지 않는다. 성공은 같은 activation일 때만 close하고,
이미 닫히거나 다시 열린 뒤 도착한 결과는 `stale-resource-open` no-op이다. menu 종료와 focus 이동은
Resource 성공 Action이 아니며 이 경계를 대신 호출하지 않는다.

`resourceOpen` runtime은 Folder·Content를 기존 Window Operation으로 전달한다. Window Store가
commit했거나 대상이 이미 충족된 no-op이고 presentation이 실패하지 않았을 때 성공이다. Store 거절,
Operation 실패·throw와 presentation 실패는 각각 구분된 실패다. ExternalShortcut은
`externalNavigation.openNewTab({ type: "open-external-shortcut", url, target: "_blank" })`를 한 번
호출하고 그 명시적 결과 또는 throw만 분류하며 Window Operation을 호출하지 않는다. 사용 가능 여부
상태와 enabled filter는 없다.

Start close가 transition까지 settled되면 같은 `HeadlessRuntime`의 `startScreen`만 pinned/closed-index로
reset한다. `StartStore` Pin은 유지한다. 실제 browser navigation adapter와 Application bootstrap은
HDJG-58, Search 결과 제품 body는 HDJG-47이 소유한다.
