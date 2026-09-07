/**
 * @file Window snapshot의 초기화, 직렬 명령, ID 발급과 구독 lifecycle을 소유한다.
 *
 * Workspace 저장, DOM 측정, animation과 browser routing은 수행하지 않는다.
 */
import {
  type ChromeLocation,
  type ChromeTab,
  type ChromeTabId,
  isChromeTabId,
  parseChromeTabId,
} from "../../chrome/index.js";
import {
  type FileExplorerLocation,
  type FileExplorerTab,
  type FileExplorerTabId,
  isFileExplorerTabId,
  parseFileExplorerTabId,
} from "../../folders/index.js";
import {
  type ContentCatalogReader,
  type ContentResourceRef,
  type FolderResourceRef,
  parseResourceRef,
  type ResourceId,
} from "../../resources/index.js";
import type { WorkspaceState } from "../../workspace/index.js";
import {
  constrainWindowBounds,
  createWindowBounds,
  InvalidWindowGeometryError,
  recoverWindowBounds,
  type WindowPlacementConfig,
} from "../geometry/index.js";
import type {
  ChromeWindowSession,
  FileExplorerWindowSession,
  WindowBounds,
  WindowRect,
  WindowSession,
  WindowState,
} from "../model/index.js";
import type { NavigationEntry, NavigationState } from "../navigation/index.js";
import {
  isWindowSessionId,
  parseWindowSessionId,
  type WindowSessionId,
} from "../windowSessionId/index.js";
import type {
  WindowStoreChange,
  WindowStoreFailureReason,
  WindowStoreResult,
} from "./operationResult/index.js";

/** WindowStore가 Folder 존재와 현재 placement를 읽는 최소 Workspace port다. */
export type WindowWorkspaceReader = Readonly<{
  /** 현재 immutable Workspace snapshot을 반환한다. */
  getSnapshot(): WorkspaceState;
}>;

/** 브라우저 runtime에서 WindowStore를 한 번 연결하는 dependency와 초기 숫자 상태다. */
export type WindowStoreInitialization = Readonly<{
  workspace: WindowWorkspaceReader;
  contentCatalog: ContentCatalogReader;
  placementConfig: WindowPlacementConfig;
  workArea: WindowRect;
}>;

/** 초기화 전에 snapshot이나 명령에 접근했을 때 발생하는 lifecycle 오류다. */
export class WindowStoreNotInitializedError extends Error {
  /** 초기화가 필요하다는 오류를 만들며 초기화를 대신 수행하지 않는다. */
  constructor() {
    super("WindowStore를 읽거나 변경하기 전에 초기화해야 합니다");
    this.name = "WindowStoreNotInitializedError";
  }
}

/** 이미 연결된 runtime에 다른 dependency를 다시 연결하려 할 때 발생한다. */
export class WindowStoreAlreadyInitializedError extends Error {
  /** 현재 snapshot과 기존 dependency를 유지하는 재결합 오류를 만든다. */
  constructor() {
    super("현재 runtime에는 WindowStore dependency가 이미 연결되어 있습니다");
    this.name = "WindowStoreAlreadyInitializedError";
  }
}

type Listener = () => void;
type Calculation =
  | Readonly<{ kind: "commit"; state: WindowState; change: WindowStoreChange }>
  | Readonly<{ kind: "no-op" }>
  | Readonly<{ kind: "rejected"; reason: WindowStoreFailureReason }>;
type IdIssue =
  | Readonly<{ ok: true; value: string }>
  | Readonly<{
      ok: false;
      reason: "duplicate-runtime-id" | "runtime-id-unavailable";
    }>;

const cloneFolderLocation = (location: FileExplorerLocation): FileExplorerLocation =>
  location === null ? null : Object.freeze({ ...location });

const cloneChromeLocation = (location: ChromeLocation): ChromeLocation => {
  switch (location.kind) {
    case "new-tab":
      return Object.freeze({ kind: "new-tab" });
    case "content":
      return Object.freeze({ kind: "content", ref: Object.freeze({ ...location.ref }) });
    case "not-found":
      return Object.freeze({ kind: "not-found", address: location.address });
  }
};

const freezeNavigation = <Location>(
  navigation: NavigationState<Location>,
  cloneLocation: (location: Location) => Location,
): NavigationState<Location> => {
  const freezeEntry = (entry: NavigationEntry<Location>) =>
    Object.freeze({ location: cloneLocation(entry.location), scrollTop: entry.scrollTop });

  return Object.freeze({
    current: freezeEntry(navigation.current),
    backStack: Object.freeze(navigation.backStack.map(freezeEntry)),
    forwardStack: Object.freeze(navigation.forwardStack.map(freezeEntry)),
  });
};

const freezeWindowState = (state: WindowState): WindowState => {
  const sessions = state.sessions.map((session): WindowSession => {
    const frame = Object.freeze({
      normalBounds: Object.freeze({ ...session.frame.normalBounds }),
      placement: session.frame.placement,
      minimized: session.frame.minimized,
    });

    if (session.kind === "file-explorer") {
      return Object.freeze({
        ...session,
        frame,
        tabs: Object.freeze(
          session.tabs.map((tab) =>
            Object.freeze({
              id: tab.id,
              navigation: freezeNavigation(tab.navigation, cloneFolderLocation),
            }),
          ),
        ),
      });
    }

    return Object.freeze({
      ...session,
      frame,
      tabs: Object.freeze(
        session.tabs.map((tab) =>
          Object.freeze({
            id: tab.id,
            navigation: freezeNavigation(tab.navigation, cloneChromeLocation),
            reloadRevision: tab.reloadRevision,
          }),
        ),
      ),
    });
  });

  return Object.freeze({
    workArea: Object.freeze({ ...state.workArea }),
    sessions: Object.freeze(sessions),
    stackingOrder: Object.freeze([...state.stackingOrder]),
    activeSessionId: state.activeSessionId,
  });
};

const sameFolderLocation = (left: FileExplorerLocation, right: FileExplorerLocation): boolean =>
  left === null ? right === null : right !== null && left.id === right.id;

const sameChromeLocation = (left: ChromeLocation, right: ChromeLocation): boolean => {
  if (left.kind !== right.kind) return false;
  if (left.kind === "new-tab") return true;
  if (left.kind === "content" && right.kind === "content") return left.ref.id === right.ref.id;
  return left.kind === "not-found" && right.kind === "not-found" && left.address === right.address;
};

const createNavigation = <Location>(location: Location): NavigationState<Location> => ({
  current: { location, scrollTop: 0 },
  backStack: [],
  forwardStack: [],
});

const navigate = <Location>(
  navigation: NavigationState<Location>,
  location: Location,
  sameLocation: (left: Location, right: Location) => boolean,
): NavigationState<Location> | null =>
  sameLocation(navigation.current.location, location)
    ? null
    : {
        current: { location, scrollTop: 0 },
        backStack: [...navigation.backStack, navigation.current],
        forwardStack: [],
      };

const goBack = <Location>(navigation: NavigationState<Location>): NavigationState<Location> | null => {
  const current = navigation.backStack.at(-1);
  return current === undefined
    ? null
    : {
        current,
        backStack: navigation.backStack.slice(0, -1),
        forwardStack: [...navigation.forwardStack, navigation.current],
      };
};

const goForward = <Location>(
  navigation: NavigationState<Location>,
): NavigationState<Location> | null => {
  const current = navigation.forwardStack.at(-1);
  return current === undefined
    ? null
    : {
        current,
        backStack: [...navigation.backStack, navigation.current],
        forwardStack: navigation.forwardStack.slice(0, -1),
      };
};

const withScrollTop = <Location>(
  navigation: NavigationState<Location>,
  scrollTop: number,
): NavigationState<Location> | null =>
  navigation.current.scrollTop === scrollTop
    ? null
    : { ...navigation, current: { ...navigation.current, scrollTop } };

const selectedAfterClose = <Tab extends { id: string }>(
  tabs: readonly Tab[],
  activeTabId: string,
  closedIndex: number,
): string => {
  if (tabs[closedIndex]?.id !== activeTabId) return activeTabId;
  return tabs[closedIndex + 1]?.id ?? tabs[closedIndex - 1]?.id ?? activeTabId;
};

const topVisibleSessionId = (
  sessions: readonly WindowSession[],
  stackingOrder: readonly WindowSessionId[],
): WindowSessionId | null => {
  const byId = new Map(sessions.map((session) => [session.id, session]));
  for (let index = stackingOrder.length - 1; index >= 0; index -= 1) {
    const id = stackingOrder[index];
    if (id !== undefined && byId.get(id)?.frame.minimized === false) return id;
  }
  return null;
};

const freezePlacementConfig = (config: WindowPlacementConfig): WindowPlacementConfig =>
  Object.freeze({
    defaultSize: Object.freeze({ ...config.defaultSize }),
    minSize: Object.freeze({ ...config.minSize }),
    edgeMargin: config.edgeMargin,
    cascadeOffset: Object.freeze({ ...config.cascadeOffset }),
    titlebarRecoverySize: Object.freeze({ ...config.titlebarRecoverySize }),
  });

/**
 * WindowState의 singleton snapshot과 모든 제품 mutation 명령을 제공한다.
 *
 * Application은 WorkspaceStore 초기화 뒤 브라우저 runtime에서 한 번 연결한다.
 * 서버 요청 사이에서 사용자 상태를 공유하도록 초기화하면 안 된다.
 */
export class WindowStore {
  private static initialization: WindowStoreInitialization | null = null;
  private static placementConfig: WindowPlacementConfig | null = null;
  private static snapshot: WindowState | null = null;
  private static commandQueue: Promise<void> = Promise.resolve();
  private static readonly listeners = new Set<Listener>();
  private static readonly issuedIds = new Set<string>();

  /** instance 생성을 막고 브라우저 runtime의 정적 상태만 사용한다. */
  private constructor() {}

  private static sameInitialization = (
    left: WindowStoreInitialization,
    right: WindowStoreInitialization,
  ): boolean =>
    left.workspace === right.workspace &&
    left.contentCatalog === right.contentCatalog &&
    left.placementConfig === right.placementConfig &&
    left.workArea.x === right.workArea.x &&
    left.workArea.y === right.workArea.y &&
    left.workArea.width === right.workArea.width &&
    left.workArea.height === right.workArea.height;

  private static requireSnapshot = (): WindowState => {
    if (WindowStore.snapshot === null) throw new WindowStoreNotInitializedError();
    return WindowStore.snapshot;
  };

  private static requireInitialization = (): WindowStoreInitialization => {
    if (WindowStore.initialization === null) throw new WindowStoreNotInitializedError();
    return WindowStore.initialization;
  };

  private static requirePlacementConfig = (): WindowPlacementConfig => {
    if (WindowStore.placementConfig === null) throw new WindowStoreNotInitializedError();
    return WindowStore.placementConfig;
  };

  private static notify = (): void => {
    for (const listener of [...WindowStore.listeners]) {
      try {
        listener();
      } catch (error) {
        void error;
      }
    }
  };

  private static reject = (reason: WindowStoreFailureReason): Calculation => ({
    kind: "rejected",
    reason,
  });

  private static assertCandidate = (state: WindowState): void => {
    if (
      ![state.workArea.x, state.workArea.y, state.workArea.width, state.workArea.height].every(
        Number.isFinite,
      ) ||
      state.workArea.width < 0 ||
      state.workArea.height < 0
    ) {
      throw new InvalidWindowGeometryError("workArea가 유효하지 않습니다");
    }

    const sessionIds = state.sessions.map(({ id }) => id);
    if (
      new Set(sessionIds).size !== sessionIds.length ||
      new Set(state.stackingOrder).size !== state.stackingOrder.length ||
      sessionIds.length !== state.stackingOrder.length ||
      sessionIds.some((id) => !state.stackingOrder.includes(id))
    ) {
      throw new Error("WindowState의 Session과 stackingOrder identity가 일치하지 않습니다");
    }

    const allTabIds = new Set<string>();
    for (const session of state.sessions) {
      constrainWindowBounds(
        session.frame.normalBounds,
        state.workArea,
        WindowStore.requirePlacementConfig(),
      );
      if (session.tabs.length === 0 || !session.tabs.some(({ id }) => id === session.activeTabId)) {
        throw new Error("WindowSession에는 유효한 active tab이 필요합니다");
      }
      for (const tab of session.tabs) {
        if (allTabIds.has(tab.id)) throw new Error("Window tab ID가 중복되었습니다");
        allTabIds.add(tab.id);
        const entries = [
          ...tab.navigation.backStack,
          tab.navigation.current,
          ...tab.navigation.forwardStack,
        ];
        if (entries.some(({ scrollTop }) => !Number.isFinite(scrollTop) || scrollTop < 0)) {
          throw new Error("Window tab scrollTop이 유효하지 않습니다");
        }
      }
    }

    if (state.activeSessionId !== null) {
      const active = state.sessions.find(({ id }) => id === state.activeSessionId);
      if (active === undefined || active.frame.minimized) {
        throw new Error("activeSessionId는 visible Session을 가리켜야 합니다");
      }
    }
  };

  private static commit = (
    state: WindowState,
    change: WindowStoreChange,
  ): WindowStoreResult => {
    WindowStore.assertCandidate(state);
    const committedIds: string[] = [];
    if (change.sessionId !== undefined) committedIds.push(change.sessionId);
    if (change.tabId !== undefined) committedIds.push(change.tabId);
    WindowStore.reserveIds(committedIds);
    const value = freezeWindowState(state);
    WindowStore.snapshot = value;
    WindowStore.notify();
    return { ok: true, changed: true, change: Object.freeze({ ...change }), value };
  };

  private static enqueue = (calculate: () => Calculation): Promise<WindowStoreResult> => {
    WindowStore.requireInitialization();
    const execute = (): WindowStoreResult => {
      WindowStore.requireSnapshot();
      try {
        const result = calculate();
        if (result.kind === "rejected") return { ok: false, changed: false, reason: result.reason };
        if (result.kind === "no-op") {
          return { ok: true, changed: false, reason: "no-op", value: WindowStore.requireSnapshot() };
        }
        return WindowStore.commit(result.state, result.change);
      } catch (error) {
        if (error instanceof InvalidWindowGeometryError) {
          return { ok: false, changed: false, reason: "invalid-geometry" };
        }
        throw error;
      }
    };
    const result = WindowStore.commandQueue.then(execute, execute);
    WindowStore.commandQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  private static workspaceHasId = (id: ResourceId): boolean => {
    const workspace = WindowStore.requireInitialization().workspace.getSnapshot();
    return (
      workspace.folders.some((folder) => folder.ref.id === id) ||
      workspace.placements.some((placement) => placement.resource.id === id) ||
      WindowStore.requireInitialization().contentCatalog.has(id)
    );
  };

  private static issueId = (reserved: ReadonlySet<string>): IdIssue => {
    const value = globalThis.crypto?.randomUUID?.();
    if (value === undefined) return { ok: false, reason: "runtime-id-unavailable" };
    if (
      !isWindowSessionId(value) ||
      WindowStore.issuedIds.has(value) ||
      reserved.has(value) ||
      WindowStore.workspaceHasId(value as unknown as ResourceId)
    ) {
      return { ok: false, reason: "duplicate-runtime-id" };
    }
    return { ok: true, value };
  };

  private static reserveIds = (ids: readonly string[]): void => {
    for (const id of ids) WindowStore.issuedIds.add(id);
  };

  private static findSession = (id: WindowSessionId): WindowSession | undefined =>
    WindowStore.requireSnapshot().sessions.find((session) => session.id === id);

  private static validateFolderLocation = (
    input: FileExplorerLocation,
  ): FileExplorerLocation | WindowStoreFailureReason => {
    if (input === null) return null;
    try {
      const ref = parseResourceRef(input);
      if (ref.kind !== "folder") return "invalid-resource-ref";
      if (
        !WindowStore.requireInitialization()
          .workspace.getSnapshot()
          .folders.some((folder) => folder.ref.id === ref.id)
      ) {
        return "folder-not-found";
      }
      return ref;
    } catch {
      return "invalid-resource-ref";
    }
  };

  private static validateContentRef = (
    input: ContentResourceRef,
  ): ContentResourceRef | WindowStoreFailureReason => {
    try {
      const ref = parseResourceRef(input);
      if (ref.kind !== "content") return "invalid-resource-ref";
      if (!WindowStore.requireInitialization().contentCatalog.has(ref.id)) {
        return "content-not-found";
      }
      return ref;
    } catch {
      return "invalid-resource-ref";
    }
  };

  private static validateChromeLocation = (
    input: ChromeLocation,
  ): ChromeLocation | WindowStoreFailureReason => {
    if (typeof input !== "object" || input === null) return "invalid-location";
    switch (input.kind) {
      case "new-tab":
        return Object.keys(input).length === 1 ? { kind: "new-tab" } : "invalid-location";
      case "content": {
        if (Object.keys(input).length !== 2) return "invalid-location";
        const ref = WindowStore.validateContentRef(input.ref);
        return typeof ref === "string" ? ref : { kind: "content", ref };
      }
      case "not-found":
        return Object.keys(input).length === 2 &&
          typeof input.address === "string" &&
          input.address.length > 0
          ? { kind: "not-found", address: input.address }
          : "invalid-location";
      default:
        return "invalid-location";
    }
  };

  private static previousNormalBounds = (): WindowBounds | null => {
    const state = WindowStore.requireSnapshot();
    for (let index = state.stackingOrder.length - 1; index >= 0; index -= 1) {
      const session = state.sessions.find(({ id }) => id === state.stackingOrder[index]);
      if (session !== undefined) return session.frame.normalBounds;
    }
    return null;
  };

  private static activateInState = (state: WindowState, id: WindowSessionId): WindowState => ({
    ...state,
    sessions: state.sessions.map((session) =>
      session.id === id ? { ...session, frame: { ...session.frame, minimized: false } } : session,
    ),
    stackingOrder: [...state.stackingOrder.filter((current) => current !== id), id],
    activeSessionId: id,
  });

  private static removeSession = (state: WindowState, id: WindowSessionId): WindowState => {
    const sessions = state.sessions.filter((session) => session.id !== id);
    const stackingOrder = state.stackingOrder.filter((current) => current !== id);
    return {
      ...state,
      sessions,
      stackingOrder,
      activeSessionId:
        state.activeSessionId === id
          ? topVisibleSessionId(sessions, stackingOrder)
          : state.activeSessionId,
    };
  };

  private static createFileExplorer = (
    location: FileExplorerLocation,
  ): Calculation => {
    const state = WindowStore.requireSnapshot();
    const reserved = new Set<string>();
    const sessionIssue = WindowStore.issueId(reserved);
    if (!sessionIssue.ok) return WindowStore.reject(sessionIssue.reason);
    const rawSessionId = sessionIssue.value;
    reserved.add(rawSessionId);
    const tabIssue = WindowStore.issueId(reserved);
    if (!tabIssue.ok) return WindowStore.reject(tabIssue.reason);
    const rawTabId = tabIssue.value;
    const sessionId = parseWindowSessionId(rawSessionId);
    const tabId = parseFileExplorerTabId(rawTabId);
    const session: FileExplorerWindowSession = {
      id: sessionId,
      kind: "file-explorer",
      applicationId: "file-explorer",
      frame: {
        normalBounds: createWindowBounds(
          state.workArea,
          WindowStore.previousNormalBounds(),
          WindowStore.requirePlacementConfig(),
        ),
        placement: "normal",
        minimized: false,
      },
      tabs: [{ id: tabId, navigation: createNavigation(location) }],
      activeTabId: tabId,
    };
    return {
      kind: "commit",
      state: {
        ...state,
        sessions: [...state.sessions, session],
        stackingOrder: [...state.stackingOrder, sessionId],
        activeSessionId: sessionId,
      },
      change: { kind: "window-created", sessionId, tabId },
    };
  };

  private static createChrome = (location: ChromeLocation): Calculation => {
    const state = WindowStore.requireSnapshot();
    const reserved = new Set<string>();
    const sessionIssue = WindowStore.issueId(reserved);
    if (!sessionIssue.ok) return WindowStore.reject(sessionIssue.reason);
    const rawSessionId = sessionIssue.value;
    reserved.add(rawSessionId);
    const tabIssue = WindowStore.issueId(reserved);
    if (!tabIssue.ok) return WindowStore.reject(tabIssue.reason);
    const rawTabId = tabIssue.value;
    const sessionId = parseWindowSessionId(rawSessionId);
    const tabId = parseChromeTabId(rawTabId);
    const session: ChromeWindowSession = {
      id: sessionId,
      kind: "chrome",
      applicationId: "chrome",
      frame: {
        normalBounds: createWindowBounds(
          state.workArea,
          WindowStore.previousNormalBounds(),
          WindowStore.requirePlacementConfig(),
        ),
        placement: "normal",
        minimized: false,
      },
      tabs: [{ id: tabId, navigation: createNavigation(location), reloadRevision: 0 }],
      activeTabId: tabId,
    };
    return {
      kind: "commit",
      state: {
        ...state,
        sessions: [...state.sessions, session],
        stackingOrder: [...state.stackingOrder, sessionId],
        activeSessionId: sessionId,
      },
      change: { kind: "window-created", sessionId, tabId },
    };
  };

  /** dependency를 연결하고 알림 없이 빈 immutable Window snapshot을 만든다. */
  static initialize(initialization: WindowStoreInitialization): Promise<WindowStoreResult> {
    if (WindowStore.initialization !== null) {
      if (!WindowStore.sameInitialization(WindowStore.initialization, initialization)) {
        return Promise.reject(new WindowStoreAlreadyInitializedError());
      }
      return Promise.resolve({
        ok: true,
        changed: false,
        reason: "no-op",
        value: WindowStore.requireSnapshot(),
      });
    }

    WindowStore.initialization = Object.freeze({
      ...initialization,
      workArea: Object.freeze({ ...initialization.workArea }),
    });
    WindowStore.placementConfig = freezePlacementConfig(initialization.placementConfig);
    try {
      createWindowBounds(initialization.workArea, null, WindowStore.requirePlacementConfig());
      const initial: WindowState = {
        workArea: { ...initialization.workArea },
        sessions: [],
        stackingOrder: [],
        activeSessionId: null,
      };
      WindowStore.assertCandidate(initial);
      WindowStore.snapshot = freezeWindowState(initial);
      return Promise.resolve({
        ok: true,
        changed: false,
        reason: "no-op",
        value: WindowStore.snapshot,
      });
    } catch (error) {
      WindowStore.initialization = null;
      WindowStore.placementConfig = null;
      return Promise.reject(
        error instanceof Error ? error : new Error("WindowStore 초기화에 실패했습니다"),
      );
    }
  }

  /** 현재 commit된 immutable Window snapshot을 반환한다. */
  static getSnapshot(): WindowState {
    return WindowStore.requireSnapshot();
  }

  /** semantic commit 이후 listener를 호출하며 반환 함수로 구독을 해제한다. */
  static subscribe(listener: Listener): () => void {
    WindowStore.listeners.add(listener);
    return () => WindowStore.listeners.delete(listener);
  }

  /** Folder 또는 Desktop을 first tab으로 가진 새 File Explorer Window를 만든다. */
  static createFileExplorerWindow(location: FileExplorerLocation): Promise<WindowStoreResult> {
    return WindowStore.enqueue(() => {
      const validated = WindowStore.validateFolderLocation(location);
      return typeof validated === "string"
        ? WindowStore.reject(validated)
        : WindowStore.createFileExplorer(validated);
    });
  }

  /** new-tab 또는 검증된 location을 first tab으로 가진 새 Chrome Window를 만든다. */
  static createChromeWindow(
    location: ChromeLocation = { kind: "new-tab" },
  ): Promise<WindowStoreResult> {
    return WindowStore.enqueue(() => {
      const validated = WindowStore.validateChromeLocation(location);
      return typeof validated === "string"
        ? WindowStore.reject(validated)
        : WindowStore.createChrome(validated);
    });
  }

  /** 외부 Folder open 규칙으로 active-tab exact match의 최상위 Explorer를 재사용한다. */
  static openFolder(folder: FolderResourceRef): Promise<WindowStoreResult> {
    return WindowStore.enqueue(() => {
      const location = WindowStore.validateFolderLocation(folder);
      if (typeof location === "string" || location === null) {
        return WindowStore.reject(
          typeof location === "string" ? location : "invalid-resource-ref",
        );
      }
      const state = WindowStore.requireSnapshot();
      for (let index = state.stackingOrder.length - 1; index >= 0; index -= 1) {
        const session = state.sessions.find(({ id }) => id === state.stackingOrder[index]);
        if (session?.kind !== "file-explorer") continue;
        const activeTab = session.tabs.find(({ id }) => id === session.activeTabId);
        if (activeTab?.navigation.current.location?.id === location.id) {
          const next = WindowStore.activateInState(state, session.id);
          const alreadyActive =
            state.activeSessionId === session.id &&
            !session.frame.minimized &&
            state.stackingOrder.at(-1) === session.id;
          return alreadyActive
            ? { kind: "no-op" }
            : {
                kind: "commit",
                state: next,
                change: { kind: "window-activated", sessionId: session.id },
              };
        }
      }
      return WindowStore.createFileExplorer(location);
    });
  }

  /** Content를 active Chrome 또는 최상위 MRU Chrome의 새 tab으로 연다. */
  static openContent(content: ContentResourceRef): Promise<WindowStoreResult> {
    return WindowStore.enqueue(() => {
      const ref = WindowStore.validateContentRef(content);
      if (typeof ref === "string") return WindowStore.reject(ref);
      const state = WindowStore.requireSnapshot();
      const active = state.sessions.find(({ id }) => id === state.activeSessionId);
      let target = active?.kind === "chrome" ? active : undefined;
      if (target === undefined) {
        for (let index = state.stackingOrder.length - 1; index >= 0; index -= 1) {
          const session = state.sessions.find(({ id }) => id === state.stackingOrder[index]);
          if (session?.kind === "chrome") {
            target = session;
            break;
          }
        }
      }
      return target === undefined
        ? WindowStore.createChrome({ kind: "content", ref })
        : WindowStore.addChromeTabCalculation(target, { kind: "content", ref });
    });
  }

  /** Content를 first tab으로 가진 별도 Chrome Window를 항상 만든다. */
  static openContentInNewWindow(content: ContentResourceRef): Promise<WindowStoreResult> {
    return WindowStore.enqueue(() => {
      const ref = WindowStore.validateContentRef(content);
      return typeof ref === "string"
        ? WindowStore.reject(ref)
        : WindowStore.createChrome({ kind: "content", ref });
    });
  }

  /** Session을 복원하고 active·topmost로 만든다. */
  static activate(sessionId: WindowSessionId): Promise<WindowStoreResult> {
    return WindowStore.enqueue(() => {
      if (!isWindowSessionId(sessionId)) return WindowStore.reject("session-not-found");
      const state = WindowStore.requireSnapshot();
      const session = WindowStore.findSession(sessionId);
      if (session === undefined) return WindowStore.reject("session-not-found");
      if (
        state.activeSessionId === sessionId &&
        !session.frame.minimized &&
        state.stackingOrder.at(-1) === sessionId
      ) {
        return { kind: "no-op" };
      }
      return {
        kind: "commit",
        state: WindowStore.activateInState(state, sessionId),
        change: { kind: "window-activated", sessionId },
      };
    });
  }

  /** Session을 최소화하고 active였다면 다음 최상위 visible Session을 선택한다. */
  static minimize(sessionId: WindowSessionId): Promise<WindowStoreResult> {
    return WindowStore.enqueue(() => {
      const state = WindowStore.requireSnapshot();
      const session = WindowStore.findSession(sessionId);
      if (session === undefined) return WindowStore.reject("session-not-found");
      if (session.frame.minimized) return { kind: "no-op" };
      const sessions = state.sessions.map((current) =>
        current.id === sessionId
          ? { ...current, frame: { ...current.frame, minimized: true } }
          : current,
      );
      return {
        kind: "commit",
        state: {
          ...state,
          sessions,
          activeSessionId:
            state.activeSessionId === sessionId
              ? topVisibleSessionId(sessions, state.stackingOrder)
              : state.activeSessionId,
        },
        change: { kind: "window-minimized", sessionId },
      };
    });
  }

  /** Session을 제거하며 active였다면 다음 최상위 visible Session을 선택한다. */
  static close(sessionId: WindowSessionId): Promise<WindowStoreResult> {
    return WindowStore.enqueue(() => {
      const state = WindowStore.requireSnapshot();
      if (WindowStore.findSession(sessionId) === undefined) {
        return WindowStore.reject("session-not-found");
      }
      return {
        kind: "commit",
        state: WindowStore.removeSession(state, sessionId),
        change: { kind: "window-closed", sessionId },
      };
    });
  }

  /** maximize와 normal placement를 전환하며 normalBounds를 보존한다. */
  static toggleMaximize(sessionId: WindowSessionId): Promise<WindowStoreResult> {
    return WindowStore.enqueue(() => {
      const state = WindowStore.requireSnapshot();
      const session = WindowStore.findSession(sessionId);
      if (session === undefined) return WindowStore.reject("session-not-found");
      const placement = session.frame.placement === "normal" ? "maximized" : "normal";
      return {
        kind: "commit",
        state: {
          ...state,
          sessions: state.sessions.map((current) =>
            current.id === sessionId
              ? {
                  ...current,
                  frame: { ...current.frame, placement, minimized: false },
                }
              : current,
          ),
          stackingOrder: [...state.stackingOrder.filter((id) => id !== sessionId), sessionId],
          activeSessionId: sessionId,
        },
        change: {
          kind: placement === "maximized" ? "window-maximized" : "window-restored",
          sessionId,
        },
      };
    });
  }

  /** normalBounds의 위치만 숫자 좌표로 바꾸고 workArea에 제한한다. */
  static move(
    sessionId: WindowSessionId,
    point: Readonly<{ x: number; y: number }>,
  ): Promise<WindowStoreResult> {
    return WindowStore.changeBounds(
      sessionId,
      (bounds) => ({ ...bounds, x: point.x, y: point.y }),
      "window-moved",
    );
  }

  /** normalBounds의 크기만 숫자 값으로 바꾸고 최소 크기와 workArea에 제한한다. */
  static resize(
    sessionId: WindowSessionId,
    size: Readonly<{ width: number; height: number }>,
  ): Promise<WindowStoreResult> {
    return WindowStore.changeBounds(
      sessionId,
      (bounds) => ({ ...bounds, width: size.width, height: size.height }),
      "window-resized",
    );
  }

  private static changeBounds = (
    sessionId: WindowSessionId,
    update: (bounds: WindowBounds) => WindowBounds,
    kind: "window-moved" | "window-resized",
  ): Promise<WindowStoreResult> =>
    WindowStore.enqueue(() => {
      const state = WindowStore.requireSnapshot();
      const session = WindowStore.findSession(sessionId);
      if (session === undefined) return WindowStore.reject("session-not-found");
      const bounds = constrainWindowBounds(
        update(session.frame.normalBounds),
        state.workArea,
        WindowStore.requirePlacementConfig(),
      );
      if (
        bounds.x === session.frame.normalBounds.x &&
        bounds.y === session.frame.normalBounds.y &&
        bounds.width === session.frame.normalBounds.width &&
        bounds.height === session.frame.normalBounds.height
      ) {
        return { kind: "no-op" };
      }
      return {
        kind: "commit",
        state: {
          ...state,
          sessions: state.sessions.map((current) =>
            current.id === sessionId
              ? { ...current, frame: { ...current.frame, normalBounds: bounds } }
              : current,
          ),
        },
        change: { kind, sessionId },
      };
    });

  /** workArea를 바꾸고 모든 normalBounds의 titlebar 접근 가능 위치를 복구한다. */
  static setWorkArea(workArea: WindowRect): Promise<WindowStoreResult> {
    return WindowStore.enqueue(() => {
      const state = WindowStore.requireSnapshot();
      if (
        state.workArea.x === workArea.x &&
        state.workArea.y === workArea.y &&
        state.workArea.width === workArea.width &&
        state.workArea.height === workArea.height
      ) {
        return { kind: "no-op" };
      }
      const config = WindowStore.requirePlacementConfig();
      const sessions = state.sessions.map((session) => ({
        ...session,
        frame: {
          ...session.frame,
          normalBounds: recoverWindowBounds(session.frame.normalBounds, workArea, config),
        },
      })) as WindowSession[];
      return {
        kind: "commit",
        state: { ...state, workArea: { ...workArea }, sessions },
        change: { kind: "work-area-changed" },
      };
    });
  }

  /** Explorer Window 끝에 Desktop tab을 추가하고 해당 Window를 복원·활성화한다. */
  static addFileExplorerTab(sessionId: WindowSessionId): Promise<WindowStoreResult> {
    return WindowStore.enqueue(() => {
      const session = WindowStore.findSession(sessionId);
      if (session === undefined) return WindowStore.reject("session-not-found");
      if (session.kind !== "file-explorer") return WindowStore.reject("session-kind-mismatch");
      const issue = WindowStore.issueId(new Set());
      if (!issue.ok) return WindowStore.reject(issue.reason);
      const raw = issue.value;
      const tabId = parseFileExplorerTabId(raw);
      const tab: FileExplorerTab = { id: tabId, navigation: createNavigation(null) };
      const state = WindowStore.requireSnapshot();
      const changed = {
        ...state,
        sessions: state.sessions.map((current) =>
          current.id === sessionId
            ? { ...session, tabs: [...session.tabs, tab], activeTabId: tabId }
            : current,
        ),
      };
      return {
        kind: "commit",
        state: WindowStore.activateInState(changed, sessionId),
        change: { kind: "tab-added", sessionId, tabId },
      };
    });
  }

  private static addChromeTabCalculation = (
    session: ChromeWindowSession,
    location: ChromeLocation,
  ): Calculation => {
    const issue = WindowStore.issueId(new Set());
    if (!issue.ok) return WindowStore.reject(issue.reason);
    const raw = issue.value;
    const tabId = parseChromeTabId(raw);
    const tab: ChromeTab = {
      id: tabId,
      navigation: createNavigation(location),
      reloadRevision: 0,
    };
    const state = WindowStore.requireSnapshot();
    const changed = {
      ...state,
      sessions: state.sessions.map((current) =>
        current.id === session.id
          ? { ...session, tabs: [...session.tabs, tab], activeTabId: tabId }
          : current,
      ),
    };
    return {
      kind: "commit",
      state: WindowStore.activateInState(changed, session.id),
      change: { kind: "tab-added", sessionId: session.id, tabId },
    };
  };

  /** Chrome Window 끝에 new-tab을 추가하고 해당 Window를 복원·활성화한다. */
  static addChromeTab(sessionId: WindowSessionId): Promise<WindowStoreResult> {
    return WindowStore.enqueue(() => {
      const session = WindowStore.findSession(sessionId);
      if (session === undefined) return WindowStore.reject("session-not-found");
      if (session.kind !== "chrome") return WindowStore.reject("session-kind-mismatch");
      return WindowStore.addChromeTabCalculation(session, { kind: "new-tab" });
    });
  }

  /** Explorer Window의 지정 tab을 active로 선택한다. */
  static activateFileExplorerTab(
    sessionId: WindowSessionId,
    tabId: FileExplorerTabId,
  ): Promise<WindowStoreResult> {
    return WindowStore.activateTab(sessionId, tabId, "file-explorer");
  }

  /** Chrome Window의 지정 tab을 active로 선택한다. */
  static activateChromeTab(
    sessionId: WindowSessionId,
    tabId: ChromeTabId,
  ): Promise<WindowStoreResult> {
    return WindowStore.activateTab(sessionId, tabId, "chrome");
  }

  private static activateTab = (
    sessionId: WindowSessionId,
    tabId: FileExplorerTabId | ChromeTabId,
    kind: WindowSession["kind"],
  ): Promise<WindowStoreResult> =>
    WindowStore.enqueue(() => {
      const state = WindowStore.requireSnapshot();
      const session = WindowStore.findSession(sessionId);
      if (session === undefined) return WindowStore.reject("session-not-found");
      if (session.kind !== kind) return WindowStore.reject("session-kind-mismatch");
      if (!session.tabs.some(({ id }) => id === tabId)) return WindowStore.reject("tab-not-found");
      if (session.activeTabId === tabId) return { kind: "no-op" };
      return {
        kind: "commit",
        state: {
          ...state,
          sessions: state.sessions.map((current) =>
            current.id === sessionId ? { ...current, activeTabId: tabId } : current,
          ) as WindowSession[],
        },
        change: { kind: "tab-activated", sessionId, tabId },
      };
    });

  /** Explorer tab을 닫고 마지막 tab이면 Window도 제거한다. */
  static closeFileExplorerTab(
    sessionId: WindowSessionId,
    tabId: FileExplorerTabId,
  ): Promise<WindowStoreResult> {
    return WindowStore.closeTab(sessionId, tabId, "file-explorer");
  }

  /** Chrome tab을 닫고 마지막 tab이면 Window도 제거한다. */
  static closeChromeTab(
    sessionId: WindowSessionId,
    tabId: ChromeTabId,
  ): Promise<WindowStoreResult> {
    return WindowStore.closeTab(sessionId, tabId, "chrome");
  }

  private static closeTab = (
    sessionId: WindowSessionId,
    tabId: FileExplorerTabId | ChromeTabId,
    expectedKind: WindowSession["kind"],
  ): Promise<WindowStoreResult> =>
    WindowStore.enqueue(() => {
      const state = WindowStore.requireSnapshot();
      const session = WindowStore.findSession(sessionId);
      if (session === undefined) return WindowStore.reject("session-not-found");
      if (session.kind !== expectedKind) return WindowStore.reject("session-kind-mismatch");
      const index = session.tabs.findIndex(({ id }) => id === tabId);
      if (index === -1) return WindowStore.reject("tab-not-found");
      if (session.tabs.length === 1) {
        return {
          kind: "commit",
          state: WindowStore.removeSession(state, sessionId),
          change: { kind: "tab-closed", sessionId, tabId },
        };
      }
      const activeTabId = selectedAfterClose(
        session.tabs as readonly Readonly<{ id: string }>[],
        session.activeTabId,
        index,
      );
      const sessions = state.sessions.map((current) => {
        if (current.id !== sessionId) return current;
        if (current.kind === "file-explorer" && expectedKind === "file-explorer") {
          return {
            ...current,
            tabs: current.tabs.filter(({ id }) => id !== tabId),
            activeTabId: parseFileExplorerTabId(activeTabId),
          };
        }
        if (current.kind === "chrome" && expectedKind === "chrome") {
          return {
            ...current,
            tabs: current.tabs.filter(({ id }) => id !== tabId),
            activeTabId: parseChromeTabId(activeTabId),
          };
        }
        return current;
      });
      return {
        kind: "commit",
        state: { ...state, sessions },
        change: { kind: "tab-closed", sessionId, tabId },
      };
    });

  private static updateExplorerTab = (
    sessionId: WindowSessionId,
    tabId: FileExplorerTabId,
    update: (tab: FileExplorerTab) => FileExplorerTab | null,
    changeKind: WindowStoreChange["kind"],
  ): Promise<WindowStoreResult> =>
    WindowStore.enqueue(() => {
      const state = WindowStore.requireSnapshot();
      const session = WindowStore.findSession(sessionId);
      if (session === undefined) return WindowStore.reject("session-not-found");
      if (session.kind !== "file-explorer") return WindowStore.reject("session-kind-mismatch");
      if (!isFileExplorerTabId(tabId)) return WindowStore.reject("tab-kind-mismatch");
      const tab = session.tabs.find(({ id }) => id === tabId);
      if (tab === undefined) return WindowStore.reject("tab-not-found");
      const next = update(tab);
      if (next === null) return { kind: "no-op" };
      return {
        kind: "commit",
        state: {
          ...state,
          sessions: state.sessions.map((current) =>
            current.id === sessionId
              ? { ...session, tabs: session.tabs.map((item) => (item.id === tabId ? next : item)) }
              : current,
          ),
        },
        change: { kind: changeKind, sessionId, tabId },
      };
    });

  private static updateChromeTab = (
    sessionId: WindowSessionId,
    tabId: ChromeTabId,
    update: (tab: ChromeTab) => ChromeTab | null,
    changeKind: WindowStoreChange["kind"],
  ): Promise<WindowStoreResult> =>
    WindowStore.enqueue(() => {
      const state = WindowStore.requireSnapshot();
      const session = WindowStore.findSession(sessionId);
      if (session === undefined) return WindowStore.reject("session-not-found");
      if (session.kind !== "chrome") return WindowStore.reject("session-kind-mismatch");
      if (!isChromeTabId(tabId)) return WindowStore.reject("tab-kind-mismatch");
      const tab = session.tabs.find(({ id }) => id === tabId);
      if (tab === undefined) return WindowStore.reject("tab-not-found");
      const next = update(tab);
      if (next === null) return { kind: "no-op" };
      return {
        kind: "commit",
        state: {
          ...state,
          sessions: state.sessions.map((current) =>
            current.id === sessionId
              ? { ...session, tabs: session.tabs.map((item) => (item.id === tabId ? next : item)) }
              : current,
          ),
        },
        change: { kind: changeKind, sessionId, tabId },
      };
    });

  /** Explorer tab의 current location으로 이동하고 forward history를 비운다. */
  static navigateFileExplorer(
    sessionId: WindowSessionId,
    tabId: FileExplorerTabId,
    location: FileExplorerLocation,
  ): Promise<WindowStoreResult> {
    return WindowStore.enqueue(() => {
      const validated = WindowStore.validateFolderLocation(location);
      if (typeof validated === "string") return WindowStore.reject(validated);
      const state = WindowStore.requireSnapshot();
      const session = WindowStore.findSession(sessionId);
      if (session === undefined) return WindowStore.reject("session-not-found");
      if (session.kind !== "file-explorer") return WindowStore.reject("session-kind-mismatch");
      const tab = session.tabs.find(({ id }) => id === tabId);
      if (tab === undefined) return WindowStore.reject("tab-not-found");
      const navigation = navigate(tab.navigation, validated, sameFolderLocation);
      if (navigation === null) return { kind: "no-op" };
      return {
        kind: "commit",
        state: {
          ...state,
          sessions: state.sessions.map((current) =>
            current.id === sessionId
              ? {
                  ...session,
                  tabs: session.tabs.map((item) =>
                    item.id === tabId ? { ...item, navigation } : item,
                  ),
                }
              : current,
          ),
        },
        change: { kind: "tab-navigated", sessionId, tabId },
      };
    });
  }

  /** Chrome tab의 current location으로 이동하고 forward history를 비운다. */
  static navigateChrome(
    sessionId: WindowSessionId,
    tabId: ChromeTabId,
    location: ChromeLocation,
  ): Promise<WindowStoreResult> {
    return WindowStore.enqueue(() => {
      const validated = WindowStore.validateChromeLocation(location);
      if (typeof validated === "string") return WindowStore.reject(validated);
      const state = WindowStore.requireSnapshot();
      const session = WindowStore.findSession(sessionId);
      if (session === undefined) return WindowStore.reject("session-not-found");
      if (session.kind !== "chrome") return WindowStore.reject("session-kind-mismatch");
      const tab = session.tabs.find(({ id }) => id === tabId);
      if (tab === undefined) return WindowStore.reject("tab-not-found");
      const navigation = navigate(tab.navigation, validated, sameChromeLocation);
      if (navigation === null) return { kind: "no-op" };
      return {
        kind: "commit",
        state: {
          ...state,
          sessions: state.sessions.map((current) =>
            current.id === sessionId
              ? {
                  ...session,
                  tabs: session.tabs.map((item) =>
                    item.id === tabId ? { ...item, navigation } : item,
                  ),
                }
              : current,
          ),
        },
        change: { kind: "tab-navigated", sessionId, tabId },
      };
    });
  }

  /** Explorer tab에서 이전 entry의 location과 scrollTop을 함께 복원한다. */
  static goBackFileExplorer(
    sessionId: WindowSessionId,
    tabId: FileExplorerTabId,
  ): Promise<WindowStoreResult> {
    return WindowStore.updateExplorerTab(
      sessionId,
      tabId,
      (tab) => {
        const navigation = goBack(tab.navigation);
        return navigation === null ? null : { ...tab, navigation };
      },
      "tab-went-back",
    );
  }

  /** Explorer tab에서 다음 entry의 location과 scrollTop을 함께 복원한다. */
  static goForwardFileExplorer(
    sessionId: WindowSessionId,
    tabId: FileExplorerTabId,
  ): Promise<WindowStoreResult> {
    return WindowStore.updateExplorerTab(
      sessionId,
      tabId,
      (tab) => {
        const navigation = goForward(tab.navigation);
        return navigation === null ? null : { ...tab, navigation };
      },
      "tab-went-forward",
    );
  }

  /** Chrome tab에서 이전 entry의 location과 scrollTop을 함께 복원한다. */
  static goBackChrome(sessionId: WindowSessionId, tabId: ChromeTabId): Promise<WindowStoreResult> {
    return WindowStore.updateChromeTab(
      sessionId,
      tabId,
      (tab) => {
        const navigation = goBack(tab.navigation);
        return navigation === null ? null : { ...tab, navigation };
      },
      "tab-went-back",
    );
  }

  /** Chrome tab에서 다음 entry의 location과 scrollTop을 함께 복원한다. */
  static goForwardChrome(
    sessionId: WindowSessionId,
    tabId: ChromeTabId,
  ): Promise<WindowStoreResult> {
    return WindowStore.updateChromeTab(
      sessionId,
      tabId,
      (tab) => {
        const navigation = goForward(tab.navigation);
        return navigation === null ? null : { ...tab, navigation };
      },
      "tab-went-forward",
    );
  }

  /** Explorer tab의 current entry에 finite 0 이상 scrollTop을 저장한다. */
  static setFileExplorerScrollTop(
    sessionId: WindowSessionId,
    tabId: FileExplorerTabId,
    scrollTop: number,
  ): Promise<WindowStoreResult> {
    if (!Number.isFinite(scrollTop) || scrollTop < 0) {
      return WindowStore.enqueue(() => WindowStore.reject("invalid-scroll-top"));
    }
    return WindowStore.updateExplorerTab(
      sessionId,
      tabId,
      (tab) => {
        const navigation = withScrollTop(tab.navigation, scrollTop);
        return navigation === null ? null : { ...tab, navigation };
      },
      "tab-scrolled",
    );
  }

  /** Chrome tab의 current entry에 finite 0 이상 scrollTop을 저장한다. */
  static setChromeScrollTop(
    sessionId: WindowSessionId,
    tabId: ChromeTabId,
    scrollTop: number,
  ): Promise<WindowStoreResult> {
    if (!Number.isFinite(scrollTop) || scrollTop < 0) {
      return WindowStore.enqueue(() => WindowStore.reject("invalid-scroll-top"));
    }
    return WindowStore.updateChromeTab(
      sessionId,
      tabId,
      (tab) => {
        const navigation = withScrollTop(tab.navigation, scrollTop);
        return navigation === null ? null : { ...tab, navigation };
      },
      "tab-scrolled",
    );
  }

  /** Chrome tab의 location·history·scroll을 유지하고 reloadRevision만 증가시킨다. */
  static refreshChrome(sessionId: WindowSessionId, tabId: ChromeTabId): Promise<WindowStoreResult> {
    return WindowStore.updateChromeTab(
      sessionId,
      tabId,
      (tab) => ({ ...tab, reloadRevision: tab.reloadRevision + 1 }),
      "tab-refreshed",
    );
  }
}

export {
  type WindowStoreChange,
  type WindowStoreChangeKind,
  type WindowStoreCommittedResult,
  type WindowStoreFailureReason,
  type WindowStoreNoOpResult,
  type WindowStoreRejectedResult,
  type WindowStoreResult,
} from "./operationResult/index.js";
