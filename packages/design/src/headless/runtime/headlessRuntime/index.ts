/**
 * @file Store 구독과 Foundation Operation을 하나의 안정적인 headless runtime으로 조합한다.
 *
 * Store 초기화와 상태 계산은 기존 Store가 소유하며 이 파일은 React나 DOM을 사용하지 않는다.
 */
import type { FileExplorerResourceReaders } from "../../folders/selectors/index.js";
import type {
  FolderViewSettingsAction,
  FolderViewSettingsSnapshot,
  FolderViewSettingsStoreResult,
} from "../../folders/viewSettings/index.js";
import { FolderViewSettingsStore } from "../../folders/viewSettings/index.js";
import { normalizeResourceSearchQuery, type ResourceReaders } from "../../resources/index.js";
import type { StartSnapshot } from "../../start/model/index.js";
import {
  type StartAction,
  type StartOperationHandle,
  StartOperations,
  type StartOperationStore,
} from "../../start/operations/index.js";
import type { StartScreenSnapshot } from "../../start/screen/model/index.js";
import {
  type StartScreenAction,
  type StartScreenOperationResult,
  StartScreenOperations,
} from "../../start/screen/operations/index.js";
import { createStartScreenState, type StartScreenState } from "../../start/screen/state/index.js";
import { StartStore } from "../../start/startStore/index.js";
import type { TaskbarSnapshot } from "../../taskbar/model/index.js";
import {
  type TaskbarOperationHandle,
  TaskbarOperations,
  type TaskbarOperationStore,
  type TaskbarPinAction,
} from "../../taskbar/operations/index.js";
import type { PrimaryPanelSnapshot } from "../../taskbar/primaryPanel/model/index.js";
import {
  type PrimaryPanelAction,
  type PrimaryPanelOperationHandle,
  PrimaryPanelOperations,
} from "../../taskbar/primaryPanel/operations/index.js";
import {
  createPrimaryPanelState,
  type PrimaryPanelState,
} from "../../taskbar/primaryPanel/state/index.js";
import {
  type ExternalShortcutNavigationPort,
  type ResourceOpenAction,
  ResourceOpenOperations,
  type ResourceOpenResult,
} from "../../taskbar/resourceOpen/operations/index.js";
import {
  type SearchAction,
  type SearchOpenAction,
  type SearchOpenResult,
  type SearchRecentStorage,
  type SearchResourceReader,
  TaskbarSearchOperations,
  type TaskbarSearchResult,
  type TaskbarSearchSnapshot,
  TaskbarSearchStore,
} from "../../taskbar/search/index.js";
import { TaskbarStore } from "../../taskbar/taskbarStore/index.js";
import {
  type WindowGestureRequest,
  WindowGestures,
  type WindowGestureStartResult,
  type WindowGestureStore,
} from "../../windows/gestures/index.js";
import type { WindowState } from "../../windows/model/index.js";
import {
  type WindowAction,
  type WindowOperationHandle,
  WindowOperations,
  type WindowOperationStore,
  type WindowPresentationPort,
} from "../../windows/operations/index.js";
import { WindowStore } from "../../windows/windowStore/index.js";
import type { WorkspaceState } from "../../workspace/model/index.js";
import {
  type WorkspaceAction,
  type WorkspaceOperationHandle,
  WorkspaceOperations,
  type WorkspaceOperationStore,
} from "../../workspace/operations/index.js";
import { WorkspaceStore } from "../../workspace/workspaceStore/index.js";
import { TransitionRegistry } from "../transitionRegistry/index.js";

/** Store의 현재 immutable snapshot을 React 독립적으로 읽고 구독하는 최소 port다. */
export type ExternalStoreReader<Snapshot> = Readonly<{
  /** 현재 commit된 snapshot을 반환하며 초기화 전에는 Store 고유 오류를 던질 수 있다. */
  getSnapshot(): Snapshot;
  /** commit 알림을 등록하고 정확한 구독 해제 함수를 반환한다. */
  subscribe(listener: () => void): () => void;
}>;

/** controller가 Store 준비 여부와 현재 snapshot을 구분해 제공하는 읽기 모델이다. */
export type ControllerViewModel<Snapshot> =
  /** SSR 또는 브라우저 Store 초기화 전이라 아직 사용자 snapshot을 읽지 않았다. */
  | Readonly<{ status: "not-ready"; snapshot: null }>
  /** 브라우저 Store가 초기화되어 현재 immutable snapshot을 읽을 수 있다. */
  | Readonly<{ status: "ready"; snapshot: Snapshot }>;

/** 한 feature의 읽기 모델 구독과 serializable Action 실행을 묶는 runtime channel이다. */
export type HeadlessFeatureRuntime<Snapshot, Action, Handle> = Readonly<{
  /** 같은 Store snapshot에는 같은 View Model 객체를 반환한다. */
  getSnapshot(): ControllerViewModel<Snapshot>;
  /** 서버 render와 hydration 첫 읽기에 함께 쓰는 안정적인 준비 전 View Model을 반환한다. */
  getServerSnapshot(): ControllerViewModel<Snapshot>;
  /** Store commit 알림을 구독하며 cleanup은 제품 Action을 취소하지 않는다. */
  subscribe(listener: () => void): () => void;
  /** serializable Action을 feature Operation으로 보내고 완료 단계별 Handle을 반환한다. */
  execute(action: Action): Handle;
}>;

/** 기본 runtime 대신 연결할 Store port 모음이다. */
export type HeadlessRuntimeAdapters = Readonly<{
  /** Window snapshot, 구독과 명령을 제공하는 adapter다. */
  windows?: ExternalStoreReader<WindowState> & WindowOperationStore & WindowGestureStore;
  /** Workspace snapshot, 구독과 명령을 제공하는 adapter다. */
  workspace?: ExternalStoreReader<WorkspaceState> & WorkspaceOperationStore;
  /** Start snapshot, 구독과 Pin 명령을 제공하는 adapter다. */
  start?: ExternalStoreReader<StartSnapshot> & StartOperationStore;
  /** runtime별 Start screen transient state를 제공하는 adapter다. */
  startScreen?: StartScreenState;
  /** Taskbar snapshot, 구독과 Pin 명령을 제공하는 adapter다. */
  taskbar?: ExternalStoreReader<TaskbarSnapshot> & TaskbarOperationStore;
  /** runtime별 primary panel transient state를 제공하는 adapter다. */
  primaryPanel?: PrimaryPanelState;
  /** File Explorer 위치별 view settings snapshot과 update 명령을 제공하는 adapter다. */
  folderViewSettings?: ExternalStoreReader<FolderViewSettingsSnapshot> &
    Readonly<{
      dispatch(action: FolderViewSettingsAction): Promise<FolderViewSettingsStoreResult>;
    }>;
}>;

/** runtime 생성 시 Store adapter와 transition registry를 선택하는 입력이다. */
export type HeadlessRuntimeOptions = Readonly<{
  /** 생략한 feature에는 기존 정적 Store를 사용한다. */
  adapters?: HeadlessRuntimeAdapters;
  /** 여러 Foundation Operation과 UI 완료 신호가 공유할 registry다. */
  transitions?: TransitionRegistry;
  /** Window queue 실행 시 실제 UI transition 시작을 전달하는 DOM-free port다. */
  windowPresentation?: WindowPresentationPort;
  /** ExternalShortcut actual browser 새 탭 결과를 반환하는 Application port다. */
  externalNavigation?: ExternalShortcutNavigationPort;
  /** File Explorer item 표시 이름과 Content date를 조회하는 Application Catalog port다. */
  fileExplorerResources?: FileExplorerResourceReaders;
  /**
   * recent를 명시적 browser 초기화 이후 load/save하는 Application port다.
   */
  searchStorage?: SearchRecentStorage;
  /**
   * Search 실제 open 완료 시각을 제공하며 테스트에서 고정할 수 있다.
   */
  searchClock?: Readonly<{ now(): number }>;
}>;

/**
 * Search transient 구독, 명시적 recent 복원과 실제 대상 open을 제공하는 runtime channel이다.
 *
 * raw query는 primaryPanel, DOM 입력·timer·IME는 제품 Component가 소유한다.
 */
export type HeadlessTaskbarSearchRuntime = Readonly<{
  /**
   * 현재 적용 query·detail과 공유 recent를 읽는다.
   */
  getSnapshot(): TaskbarSearchSnapshot;
  /**
   * SSR에서는 저장소·Catalog를 읽지 않고 생성 당시 빈 snapshot을 반환한다.
   */
  getServerSnapshot(): TaskbarSearchSnapshot;
  /**
   * Store commit을 구독하며 해제는 실제 open을 취소하지 않는다.
   */
  subscribe(listener: () => void): () => void;
  /**
   * Catalog·Workspace 준비 후 recent를 복원하며 준비 전 호출은 false이고 load하지 않는다.
   */
  initialize(): Promise<boolean>;
  /**
   * 현재 준비된 typed reader를 제공하며 준비 전 빈 Catalog 대신 null을 반환한다.
   */
  getReaders(): ResourceReaders | null;
  /**
   * query 적용·detail·reconcile 또는 실제 대상 열기를 제품 Operation으로 실행한다.
   */
  execute(
    action: SearchAction | SearchOpenAction,
  ): TaskbarSearchResult | Promise<TaskbarSearchResult | SearchOpenResult>;
}>;

/** Resource 종류별 open을 Window 또는 external navigation port로 보내는 runtime channel이다. */
export type HeadlessResourceOpenRuntime = Readonly<{
  /** 명시적 완료 결과를 성공 또는 실패로 정규화한다. */
  execute(action: ResourceOpenAction): Promise<ResourceOpenResult>;
}>;

/** Provider와 controller가 공유하는 Store 구독, Action gateway와 transition 기반이다. */
export type HeadlessRuntime = Readonly<{
  /** Window snapshot과 WindowAction 실행 channel이다. */
  windows: HeadlessFeatureRuntime<WindowState, WindowAction, WindowOperationHandle>;
  /** move·resize 시작 frame과 Esc rollback을 관리하는 즉시 반영 gesture API다. */
  windowGestures: Readonly<{
    /** visible desktop Session에서 gesture를 시작하고 DOM-free Handle을 반환한다. */
    begin(request: WindowGestureRequest): WindowGestureStartResult;
  }>;
  /** Workspace snapshot과 WorkspaceAction 실행 channel이다. */
  workspace: HeadlessFeatureRuntime<WorkspaceState, WorkspaceAction, WorkspaceOperationHandle>;
  /** Start snapshot과 StartAction 실행 channel이다. */
  start: HeadlessFeatureRuntime<StartSnapshot, StartAction, StartOperationHandle>;
  /** persisted Pin과 분리된 Start browse semantic state와 Action channel이다. */
  startScreen: HeadlessFeatureRuntime<
    StartScreenSnapshot,
    StartScreenAction,
    StartScreenOperationResult
  >;
  /** Taskbar snapshot과 TaskbarPinAction 실행 channel이다. */
  taskbar: HeadlessFeatureRuntime<TaskbarSnapshot, TaskbarPinAction, TaskbarOperationHandle>;
  /** runtime-local primary panel snapshot과 순차 transition Action channel이다. */
  primaryPanel: HeadlessFeatureRuntime<
    PrimaryPanelSnapshot,
    PrimaryPanelAction,
    PrimaryPanelOperationHandle
  > &
    Readonly<{
      /**
       * 내부 Search settle을 포함한 미종료 exact Handle을 UI 표현 연결에 전달한다.
       *
       * 등록 시 대기 Handle을 재전달하고 해제는 제품 실행을 취소하지 않는다.
       */
      subscribeOperations(listener: (handle: PrimaryPanelOperationHandle) => void): () => void;
    }>;
  /** Folder·Content·ExternalShortcut open 결과를 하나로 정규화하는 channel이다. */
  resourceOpen: HeadlessResourceOpenRuntime;
  /** 두 검색 진입점의 적용 query·detail, 공유 recent와 실제 open channel이다. */
  search: HeadlessTaskbarSearchRuntime;
  /** 위치별 Folder view settings snapshot과 serializable update Action channel이다. */
  folderViewSettings: HeadlessFeatureRuntime<
    FolderViewSettingsSnapshot,
    FolderViewSettingsAction,
    Promise<FolderViewSettingsStoreResult>
  >;
  /** File Explorer selector가 최신 Content·ExternalShortcut 원본을 읽는 port다. */
  fileExplorerResources: FileExplorerResourceReaders;
  /** operation ID와 phase별 UI 완료·중단·실패 신호를 연결한다. */
  transitions: TransitionRegistry;
}>;

/** Catalog가 아직 연결되지 않은 runtime에서 빈 Resource collection을 제공한다. */
const EMPTY_CATALOG = Object.freeze({
  /** 빈 Catalog에는 어떤 ID도 존재하지 않는다. */
  has: (_id: string): false => false,
  /** 빈 Catalog 조회는 항상 undefined다. */
  get: (_id: string): undefined => undefined,
  /** 빈 Catalog 목록은 immutable 빈 배열이다. */
  list: (): readonly never[] => Object.freeze([]),
});

/** Application Catalog가 생략됐을 때 사용하는 안정적인 빈 reader 모음이다. */
const EMPTY_FILE_EXPLORER_RESOURCES = Object.freeze({
  content: EMPTY_CATALOG,
  externalShortcut: EMPTY_CATALOG,
}) as FileExplorerResourceReaders;

/** 준비 전 controller가 서버와 브라우저 초기화 전까지 공유할 immutable 결과를 만든다. */
const createNotReadyViewModel = <Snapshot>(): ControllerViewModel<Snapshot> =>
  Object.freeze({ status: "not-ready", snapshot: null });

/** Store 고유 초기화 오류만 준비 전 상태로 해석하고 다른 오류는 숨기지 않는다. */
const isNotInitializedError = (error: unknown, expectedName: string): boolean =>
  error instanceof Error && error.name === expectedName;

/** Store snapshot identity를 보존하면서 Operation 실행 channel을 만든다. */
const createFeatureRuntime = <Snapshot, Action, Handle>(
  store: ExternalStoreReader<Snapshot>,
  execute: (action: Action) => Handle,
  notInitializedErrorName: string,
): HeadlessFeatureRuntime<Snapshot, Action, Handle> => {
  const notReady = createNotReadyViewModel<Snapshot>();
  let currentSnapshot: Snapshot | undefined;
  let currentViewModel: ControllerViewModel<Snapshot> = notReady;

  /** 현재 Store snapshot을 읽고 identity가 바뀔 때만 ready View Model을 교체한다. */
  const getSnapshot = (): ControllerViewModel<Snapshot> => {
    try {
      const snapshot = store.getSnapshot();
      if (snapshot !== currentSnapshot) {
        currentSnapshot = snapshot;
        currentViewModel = Object.freeze({ status: "ready", snapshot });
      }
      return currentViewModel;
    } catch (error) {
      if (isNotInitializedError(error, notInitializedErrorName)) return notReady;
      throw error;
    }
  };

  return Object.freeze({
    getSnapshot,
    /** 서버에서는 사용자 singleton을 읽거나 초기화하지 않고 준비 전 결과를 재사용한다. */
    getServerSnapshot: (): ControllerViewModel<Snapshot> => notReady,
    /** Store가 반환한 cleanup을 그대로 사용해 StrictMode 재구독을 누적하지 않는다. */
    subscribe: (listener: () => void): (() => void) => store.subscribe(listener),
    execute,
  });
};

/** adapter가 주입되지 않은 ExternalShortcut 요청을 명시적 실패로 보존한다. */
const missingExternalNavigation: ExternalShortcutNavigationPort = Object.freeze({
  openNewTab: () => Object.freeze({ status: "failed", reason: "adapter-not-configured" }),
});

/**
 * 기존 Store와 Foundation Operation을 한 번 조합해 Provider에 전달할 runtime을 만든다.
 *
 * Application은 브라우저 Store 초기화를 마친 뒤 이 함수를 render 바깥에서 한 번 호출한다.
 * 서버 render와 Provider 재마운트는 Store 초기화나 authoritative snapshot 교체를 실행하지 않는다.
 */
export const createHeadlessRuntime = (options: HeadlessRuntimeOptions = {}): HeadlessRuntime => {
  const transitions = options.transitions ?? new TransitionRegistry();
  const windowStore = options.adapters?.windows ?? WindowStore;
  const workspaceStore = options.adapters?.workspace ?? WorkspaceStore;
  const startStore = options.adapters?.start ?? StartStore;
  const startScreenState = options.adapters?.startScreen ?? createStartScreenState();
  const taskbarStore = options.adapters?.taskbar ?? TaskbarStore;
  const primaryPanelState = options.adapters?.primaryPanel ?? createPrimaryPanelState();
  const folderViewSettingsStore = options.adapters?.folderViewSettings ?? FolderViewSettingsStore;
  const windowOperations = new WindowOperations({
    store: windowStore,
    transitions,
    presentation: options.windowPresentation,
  });
  const windowGestures = new WindowGestures(windowStore);
  const workspaceOperations = new WorkspaceOperations({ store: workspaceStore });
  const startOperations = new StartOperations({ store: startStore, transitions });
  const startScreenOperations = new StartScreenOperations({ state: startScreenState });
  const taskbarOperations = new TaskbarOperations({
    store: taskbarStore,
    windowReader: windowStore,
    transitions,
  });
  /** 현재 Workspace Folder를 읽으며 정적 Catalog 연결 전에는 사용하지 않는다. */
  const folderReader: ResourceReaders["folder"] = Object.freeze({
    has: (id: string) =>
      workspaceStore.getSnapshot().folders.some((folder) => folder.ref.id === id),
    get: (id: string) =>
      workspaceStore.getSnapshot().folders.find((folder) => folder.ref.id === id),
    list: () => workspaceStore.getSnapshot().folders,
  });
  const searchReaders: ResourceReaders = Object.freeze({
    content: options.fileExplorerResources?.content ?? EMPTY_CATALOG,
    externalShortcut: options.fileExplorerResources?.externalShortcut ?? EMPTY_CATALOG,
    folder: folderReader,
  });
  /**
   * Catalog 주입과 Workspace 초기화를 모두 확인해 준비 전 reconcile을 방지한다.
   */
  const getSearchReaders = (): ResourceReaders | null => {
    if (options.fileExplorerResources === undefined) return null;
    try {
      workspaceStore.getSnapshot();
      return searchReaders;
    } catch (error) {
      if (isNotInitializedError(error, "WorkspaceStoreNotInitializedError")) return null;
      throw error;
    }
  };
  const searchResourceReader: SearchResourceReader = Object.freeze({
    getReaders: getSearchReaders,
  });
  const searchStore = new TaskbarSearchStore({
    resources: searchResourceReader,
    storage: options.searchStorage,
    clock: options.searchClock,
  });
  const searchServerSnapshot = searchStore.getSnapshot();
  const primaryPanelOperations = new PrimaryPanelOperations({
    state: primaryPanelState,
    modeReader: {
      getMode: () => {
        try {
          return windowStore.getSnapshot().mode;
        } catch (error) {
          if (isNotInitializedError(error, "WindowStoreNotInitializedError")) return "not-ready";
          throw error;
        }
      },
    },
    transitions,
    onCloseComplete: (panel) => {
      searchStore.reset(panel);
      if (panel === "start")
        startScreenOperations.execute({ type: "reset", reason: "close-complete" });
    },
  });
  const resourceOpenOperations = new ResourceOpenOperations({
    windows: windowOperations,
    externalNavigation: options.externalNavigation ?? missingExternalNavigation,
  });

  /**
   * raw 변경을 즉시 invalidation하고 mobile settle을 Start screen transient 정리에 연결한다.
   */
  const executePrimaryPanel = (action: PrimaryPanelAction): PrimaryPanelOperationHandle => {
    if (action.type === "update-query") {
      // queue 반영 전 연속 입력에도 마지막 빈 값을 즉시 반영한다.
      searchStore.invalidateQuery(action.panel, action.query);
    }
    const handle = primaryPanelOperations.execute(action);
    void handle.settled.then((settled) => {
      if (settled.status !== "settled") return;
      if (action.type === "dismiss-for-mobile") {
        startScreenOperations.execute({ type: "reset", reason: "mobile" });
        return;
      }
    });
    return handle;
  };
  const searchOperations = new TaskbarSearchOperations({
    store: searchStore,
    resources: searchResourceReader,
    workspace: workspaceStore,
    resourceOpen: resourceOpenOperations,
    primaryPanel: { execute: executePrimaryPanel },
  });
  /**
   * 적용 query가 현재 raw 입력과 같은 revision인지 확인하고 실제 open은 수명과 분리한다.
   */
  const executeSearch = (
    action: SearchAction | SearchOpenAction,
  ): TaskbarSearchResult | Promise<TaskbarSearchResult | SearchOpenResult> => {
    if (action.type === "search.open-resource" || action.type === "search.open-file-location")
      return searchOperations.execute(action);
    if (action.type === "search.apply-query") {
      const primary = primaryPanelState.getSnapshot();
      const raw = action.panel === "start" ? primary.startQuery : primary.searchQuery;
      if (normalizeResourceSearchQuery(raw) !== normalizeResourceSearchQuery(action.query))
        return Object.freeze({ changed: false, persistence: "not-required" });
    }
    return searchStore.execute(action);
  };

  return Object.freeze({
    windows: createFeatureRuntime<WindowState, WindowAction, WindowOperationHandle>(
      windowStore,
      (action) => windowOperations.execute(action),
      "WindowStoreNotInitializedError",
    ),
    windowGestures,
    workspace: createFeatureRuntime<WorkspaceState, WorkspaceAction, WorkspaceOperationHandle>(
      workspaceStore,
      (action) => workspaceOperations.execute(action),
      "WorkspaceStoreNotInitializedError",
    ),
    start: createFeatureRuntime<StartSnapshot, StartAction, StartOperationHandle>(
      startStore,
      (action) => startOperations.execute(action),
      "StartStoreNotInitializedError",
    ),
    startScreen: createFeatureRuntime<
      StartScreenSnapshot,
      StartScreenAction,
      StartScreenOperationResult
    >(
      startScreenOperations,
      (action) => startScreenOperations.execute(action),
      "StartScreenStateNotInitializedError",
    ),
    taskbar: createFeatureRuntime<TaskbarSnapshot, TaskbarPinAction, TaskbarOperationHandle>(
      taskbarStore,
      (action) => taskbarOperations.execute(action),
      "TaskbarStoreNotInitializedError",
    ),
    primaryPanel: Object.freeze({
      ...createFeatureRuntime<
        PrimaryPanelSnapshot,
        PrimaryPanelAction,
        PrimaryPanelOperationHandle
      >(primaryPanelState, executePrimaryPanel, "PrimaryPanelStateNotInitializedError"),
      subscribeOperations: (listener: (handle: PrimaryPanelOperationHandle) => void) =>
        primaryPanelOperations.subscribeOperations(listener),
    }),
    resourceOpen: Object.freeze({
      execute: (action: ResourceOpenAction) => resourceOpenOperations.execute(action),
    }),
    search: Object.freeze({
      getSnapshot: searchStore.getSnapshot,
      getServerSnapshot: () => searchServerSnapshot,
      subscribe: searchStore.subscribe,
      initialize: () => searchStore.initialize(),
      getReaders: getSearchReaders,
      execute: executeSearch,
    }),
    folderViewSettings: createFeatureRuntime<
      FolderViewSettingsSnapshot,
      FolderViewSettingsAction,
      Promise<FolderViewSettingsStoreResult>
    >(
      folderViewSettingsStore,
      (action) => folderViewSettingsStore.dispatch(action),
      "FolderViewSettingsStoreNotInitializedError",
    ),
    fileExplorerResources: options.fileExplorerResources ?? EMPTY_FILE_EXPLORER_RESOURCES,
    transitions,
  });
};
