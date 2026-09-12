# Search 사용 안내

`headless/taskbar` 또는 package의 공개 진입점에서 `useTaskbarSearchController`,
`selectTaskbarSearchResults`, `selectSearchRecommendations`를 사용한다.
현재 제품 계약은 Workbench Local Work Memory의 `taskbar-search`,
`resource-search`, `taskbar-panel-lifecycle`에서 확인한다.

## Runtime 연결

Application은 기존 `fileExplorerResources` Catalog와 초기화된 Workspace를 연결하고
브라우저 저장소에 접근할 수 있는 시점에 recent를 복원한다. 생성과 SSR 구독만으로는
Catalog, Workspace singleton이나 localStorage를 읽지 않는다.

```ts
const runtime = createHeadlessRuntime({
  fileExplorerResources: { content: contentCatalog, externalShortcut: shortcutCatalog },
  searchStorage: { load: loadSearchRecent, save: saveSearchRecent },
});

await runtime.search.initialize();
```

`initialize()`는 Catalog·Workspace가 준비되지 않았으면 `false`이고 저장값을 읽지 않는다.
준비된 뒤 다시 호출하면 versioned `{ schemaVersion: 1, recent }`를 복원·정리한다.
저장 key와 실제 localStorage 접근은 Application adapter가 소유한다.
복원 전에 발생한 성공 기록도 세션에 유지하고 복원 시 합친다.

## 입력과 결과

raw 입력은 `runtime.primaryPanel`의 `update-query`로 전달한다. 그 호출은 detail을 즉시
비우고 Search의 입력 `version`을 바꾼다. Component가 timer와 IME를 관리하고 완료 후
같은 version의 적용 query를 전달한다. 늦은 version이나 현재 raw와 다른 query는 무시한다.

```ts
await runtime.primaryPanel.execute({ type: "update-query", panel: "search", query: raw }).settled;
const version = runtime.search.getSnapshot().panels.search.version;

// Component의 debounce·composition 완료 후 실행한다.
runtime.search.execute({ type: "search.apply-query", panel: "search", query: raw, version });

const readers = runtime.search.getReaders();
const snapshot = runtime.search.getSnapshot();
const results = readers ? selectTaskbarSearchResults(snapshot, "search", readers) : [];
```

`panels.start`와 `panels.search`는 적용 query·pending·detail을 독립적으로 보존한다.
`useTaskbarSearchController().viewModel`은 Workspace 변경도 구독해
`results.start`, `results.search`, `recommendations`, `ready`를 현재 원본에서 파생한다.
pending 동안 이전 적용 결과는 유지하고 detail/open Action은 실행하지 않는다.
빈 정규화 입력은 즉시 기본 화면으로 돌아간다. Start의 기본 browse는 기존 Start screen을,
독립 Search의 기본 화면은 공유 `recent`와 `selectSearchRecommendations(readers)`를 사용한다.
목록 active row, scroll, opener focus와 IME 상태는 Store에 넣지 않는다.

## Detail과 실제 열기

`search.show-detail`은 현재 결과 또는 기본 화면의 recent·추천에 있는 ref를 선택한다.
`search.hide-detail`은 query와 recent를 보존한다. 열기는 다음 공개 Action을 실행한다.

```ts
const result = await runtime.search.execute({
  type: "search.open-file-location", // 일반 대상 열기는 search.open-resource
  panel: "search",
  resource: contentRef,
});
```

실제 Window/외부 navigation 결과가 성공한 경우에만 recent를 기록하고 해당 activation의
panel을 닫는다. 원본 external ref는 URL 변환 뒤에도 유지한다. 파일 위치는 실행 때 최신
Workspace placement에서 조회한다. Folder는 기존 `open-folder`, Desktop은 기존
`create-file-explorer-window`의 `location: null`을 실행하며 Desktop 기록은 없다.

Search open Promise는 실제 open 결과를 반환하며 panel exit나 recent 저장 완료를 뜻하지
않는다. 실패는 query·detail·panel을 보존한다. 저장 실패는 세션 기록을 유지하고 안내나
rollback 없이 내부 persistence 결과로 분류한다. 늦은 성공은 기록하지만 현재 activation을
닫지 않는다. close 완료와 mobile 정리는 runtime의 panel Operation에서 연결된다.

Taskbar 제품 연결은 `usePrimaryPanelController().actions.subscribeOperations(listener)`로
Search 내부 settle을 포함한 exact Handle을 추적한다. 등록 시 미종료 Handle을 재전달하고
동일 ID는 중복 등록하지 않는다. 실제 widget callback이 해당 ID와 enter/exit phase의
완료·중단을 보고하며 close 완료 뒤 query와 detail을 초기화한다. 구독 해제는 실행을
취소하지 않는다. 표현 listener가 예외를 던지면 해당 연결만 해제하며 누락 신호는 기존
1000ms watchdog으로 정리한다. Search open 결과를 UI close 완료로 대신 보고하지 않는다.

## 검증 위치

`src/testing/taskbarSearchPublic.test.ts`는 실제 WindowStore와 공개 Search/ResourceOpen/
PrimaryPanel Operations, 주입한 load/save port로 결과를 관찰한다.
Component의 keyboard·focus·IME·debounce·scroll과 실제 브라우저 저장 adapter는 소비 UI와
Application의 검증 범위다.
