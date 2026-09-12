import { useEffect, useMemo, useState } from "react";

import {
  createHeadlessRuntime,
  createResourceRef,
  createStaticCatalog,
  type HeadlessRuntimeAdapters,
  HeadlessRuntimeProvider,
  type PrimaryPanelId,
  type ResourceRef,
  usePrimaryPanelController,
  useTaskbarSearchController,
  type WindowMode,
  type WindowState,
  type WindowStoreResult,
  type WorkspaceState,
} from "../../../../../headless/index.js";
import { TaskbarRoot } from "../../root/index.js";

export const searchFolder = createResourceRef("folder", "40000000-0000-4000-8000-000000000001");
export const searchShortcut = createResourceRef(
  "external-shortcut",
  "40000000-0000-4000-8000-000000000002",
);
export const searchContents = Array.from({ length: 30 }, (_, index) => ({
  ref: createResourceRef(
    "content",
    `40000000-0000-4000-8000-${(index + 10).toString().padStart(12, "0")}`,
  ),
  title:
    index === 0
      ? "React 상태 관리 검색 문서와 아주 긴 제목으로 작은 화면에서 잘리는 표현 확인"
      : `검색 문서 ${String(index + 1).padStart(2, "0")}`,
  slug: `search-document-${index}-very-long-canonical-address-for-narrow-viewport`,
  summary: "검색 fixture",
  date: `2026-08-${String(30 - index).padStart(2, "0")}`,
  tags: ["react", "검색"],
  cover: null,
  source: { kind: "notion" as const, pageId: String(index) },
}));
export const searchResources = {
  folder: createStaticCatalog([
    { ref: searchFolder, name: "검색 폴더의 아주 긴 이름과 표시 경로 확인" },
  ]),
  content: createStaticCatalog(searchContents),
  externalShortcut: createStaticCatalog([
    {
      ref: searchShortcut,
      name: "검색 외부 바로가기의 아주 긴 이름 확인",
      url: "https://example.com/very/long/external/address?query=resource-search&locale=ko-KR",
    },
  ]),
};

/**
 * 각 검사에서 독립 adapter와 실제 Search/PrimaryPanel/ResourceOpen Operation을 만든다.
 * 성공·실패·지연 응답과 저장 실패를 외부 adapter 경계에서 명시적으로 제공한다.
 */
export const createSearchFixture = ({
  onOpen = () => undefined,
  saveReject = false,
  deferred = false,
  fail = false,
}: {
  onOpen?: (resource: ResourceRef | null) => void;
  saveReject?: boolean;
  deferred?: boolean;
  fail?: boolean;
} = {}) => {
  let mode: WindowMode = "desktop";
  let snapshot: WindowState = {
    mode,
    workArea: { x: 0, y: 0, width: 1440, height: 850 },
    sessions: [],
    stackingOrder: [],
    activeSessionId: null,
  };
  const listeners = new Set<() => void>();
  const workspace: WorkspaceState = {
    schemaVersion: 1,
    contentInbox: searchFolder,
    folders: searchResources.folder.list(),
    placements: [
      { resource: searchFolder, parent: null },
      { resource: searchShortcut, parent: null },
      ...searchContents.map((entry) => ({ resource: entry.ref, parent: searchFolder })),
    ],
  };
  let resolvePending: (() => void) | null = null;
  /** adapter 응답을 명시적 거절 또는 이미 충족된 실제 Window open 결과로 완료한다. */
  const open = (resource: ResourceRef | null): Promise<WindowStoreResult> => {
    onOpen(resource);
    if (fail) return Promise.reject(new Error("fixture open failure"));
    const result: WindowStoreResult = {
      ok: true,
      changed: false,
      reason: "no-op",
      value: snapshot,
    };
    return deferred
      ? new Promise((resolve) => {
          resolvePending = () => resolve(result);
        })
      : Promise.resolve(result);
  };
  const windows = {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    openContent: open,
    openFolder: open,
    createFileExplorerWindow: () => open(null),
  } as unknown as NonNullable<HeadlessRuntimeAdapters["windows"]>;
  const startSnapshot = Object.freeze({ pinnedItems: Object.freeze([]) });
  const adapters = {
    windows,
    workspace: {
      getSnapshot: () => workspace,
      subscribe: () => () => undefined,
    } as unknown as NonNullable<HeadlessRuntimeAdapters["workspace"]>,
    start: {
      getSnapshot: () => startSnapshot,
      subscribe: () => () => undefined,
    } as unknown as NonNullable<HeadlessRuntimeAdapters["start"]>,
  };
  const runtime = createHeadlessRuntime({
    adapters,
    fileExplorerResources: searchResources,
    searchClock: { now: () => 1789171200000 },
    searchStorage: {
      load: () => ({ schemaVersion: 1, recent: [{ resource: searchShortcut, openedAt: 1 }] }),
      save: () => (saveReject ? Promise.reject(new Error("fixture save failure")) : undefined),
    },
    externalNavigation: {
      openNewTab: () => {
        onOpen(searchShortcut);
        return fail ? { status: "failed", reason: "fixture" } : { status: "succeeded" };
      },
    },
  });
  return {
    runtime,
    resolveOpen: () => resolvePending?.(),
    setMode: (nextMode: WindowMode) => {
      mode = nextMode;
      snapshot = { ...snapshot, mode };
      for (const listener of listeners) listener();
    },
  };
};

/** 실제 두 Surface의 현재 입력·적용 query·recent를 제품 밖 보조 영역에서 관찰한다. */
const SearchProbe = () => {
  const primary = usePrimaryPanelController();
  const search = useTaskbarSearchController();
  return (
    <div style={{ position: "fixed", insetInlineEnd: 16, insetBlockStart: 16 }}>
      <output aria-label="활성 검색 패널">
        {primary.viewModel.snapshot?.activePanel ?? "없음"}
      </output>
      <output aria-label="시작 검색 상태">
        query={primary.viewModel.snapshot?.startQuery ?? ""};detail=
        {search.viewModel.panels.start.detail?.id ?? "none"}
      </output>
      <output aria-label="독립 검색 상태">
        query={primary.viewModel.snapshot?.searchQuery ?? ""};detail=
        {search.viewModel.panels.search.detail?.id ?? "none"}
      </output>
      <output aria-label="적용된 검색어">{search.viewModel.panels.search.query}</output>
      <output aria-label="검색 recent 개수">{search.viewModel.recent.length}</output>
    </div>
  );
};

/**
 * 고정 데이터와 시각 시작 상태를 실제 TaskbarRoot에 주입하는 독립 Story fixture다.
 * 보조 probe와 adapter 조작은 제품 바깥에 두고 runtime 결과를 관찰한다.
 */
export const SearchProductStory = ({
  initialPanel,
  initialQuery = "",
  detail,
  saveReject = false,
  deferred = false,
  fail = false,
  reducedMotion = false,
}: {
  initialPanel?: PrimaryPanelId;
  initialQuery?: string;
  detail?: ResourceRef;
  saveReject?: boolean;
  deferred?: boolean;
  fail?: boolean;
  reducedMotion?: boolean;
}) => {
  const [openCount, setOpenCount] = useState(0);
  const fixture = useMemo(
    () =>
      createSearchFixture({
        onOpen: () => setOpenCount((count) => count + 1),
        saveReject,
        deferred,
        fail,
      }),
    [saveReject, deferred, fail],
  );
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    void fixture.runtime.search.initialize().then(async () => {
      if (initialPanel) {
        await fixture.runtime.primaryPanel.execute({
          type: "update-query",
          panel: initialPanel,
          query: initialQuery,
        }).settled;
        await fixture.runtime.search.execute({
          type: "search.apply-query",
          panel: initialPanel,
          query: initialQuery,
          version: fixture.runtime.search.getSnapshot().panels[initialPanel].version,
        });
        void fixture.runtime.primaryPanel.execute({ type: "trigger", panel: initialPanel });
        if (detail)
          await fixture.runtime.search.execute({
            type: "search.show-detail",
            panel: initialPanel,
            resource: detail,
          });
      }
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [detail, fixture, initialPanel, initialQuery]);
  if (!ready) return null;
  return (
    <HeadlessRuntimeProvider runtime={fixture.runtime}>
      <div
        lang="ko-KR"
        style={{ background: "linear-gradient(135deg, #c9def4, #eef4f8)", minHeight: "100vh" }}
      >
        {reducedMotion ? (
          <style>{`.taskbar-panel-widget__popup { transition-duration: 0s !important; }`}</style>
        ) : null}
        <TaskbarRoot
          resourceReaders={searchResources}
          timestampClock={{
            now: () => new Date(2026, 8, 12, 9),
            setTimeout: () => 0 as never,
            clearTimeout: () => undefined,
          }}
        />
        <SearchProbe />
        <div style={{ position: "fixed", insetInlineStart: 16, insetBlockStart: 16 }}>
          <button type="button">패널 밖</button>
          <button type="button" onClick={() => fixture.resolveOpen()}>
            대기 중 열기 완료
          </button>
          <button type="button" onClick={() => fixture.setMode("mobile")}>
            모바일로 전환
          </button>
          <output aria-label="검색 open 횟수">{openCount}</output>
        </div>
      </div>
    </HeadlessRuntimeProvider>
  );
};
