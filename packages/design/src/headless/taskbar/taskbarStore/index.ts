/**
 * @file Taskbar Pin, runtime visible order, Window commit 연결과 persistence를 조율한다.
 *
 * Window metadata와 browser DOM 동작은 소유하지 않으며 Application이 storage와 reader를 주입한다.
 */
import {
  type ExternalShortcutCatalogReader,
  parseResourceRef,
  type ResourceRef,
} from "../../resources/index.js";
import type { WindowState } from "../../windows/index.js";
import type {
  TaskbarApplicationId,
  TaskbarItem,
  TaskbarReorderAction,
  TaskbarReorderDestination,
  TaskbarReorderIntent,
  TaskbarSnapshot,
} from "../model/index.js";
import type {
  TaskbarStoreRejectedResult,
  TaskbarStoreRejectionReason,
  TaskbarStoreResult,
} from "./operationResult/index.js";
import type { TaskbarStorage, TaskbarStorageSnapshot } from "./taskbarStorage/index.js";

/**
 * TaskbarStore가 Window commit마다 즉시 snapshot을 캡처하는 최소 읽기 port다.
 *
 * listener 인자는 사용하지 않으며 알림 시점의 `getSnapshot()` 결과를 순서대로 queue에 보존한다.
 */
export type TaskbarWindowReader = Readonly<{
  /**
   * 현재 immutable Window snapshot을 반환한다.
   */
  getSnapshot(): WindowState;
  /**
   * Window semantic commit 알림을 등록하고 해제 함수를 반환한다.
   */
  subscribe(listener: () => void): () => void;
}>;

/**
 * 브라우저 runtime에서 TaskbarStore를 최초 결합하는 독립 storage, Catalog와 Window reader다.
 */
export type TaskbarStoreInitialization = Readonly<{
  storage: TaskbarStorage;
  externalShortcutCatalog: ExternalShortcutCatalogReader;
  windowReader: TaskbarWindowReader;
}>;

/**
 * 초기화 전에 Taskbar snapshot이나 명령에 접근했을 때 발생한다.
 */
export class TaskbarStoreNotInitializedError extends Error {
  /**
   * 초기화가 필요한 lifecycle 오류를 만든다.
   */
  constructor() {
    super("TaskbarStore를 읽거나 변경하기 전에 초기화해야 합니다");
    this.name = "TaskbarStoreNotInitializedError";
  }
}

/**
 * 이미 결합된 TaskbarStore에 다른 runtime dependency를 다시 연결할 때 발생한다.
 */
export class TaskbarStoreAlreadyInitializedError extends Error {
  /**
   * 기존 dependency와 snapshot을 보존하는 재결합 오류를 만든다.
   */
  constructor() {
    super("현재 runtime에는 TaskbarStore dependency가 이미 연결되어 있습니다");
    this.name = "TaskbarStoreAlreadyInitializedError";
  }
}

type Listener = () => void;

type RestoredPins = Readonly<{
  pinnedItems: readonly TaskbarItem[];
  shouldSave: boolean;
}>;

const TASKBAR_SCHEMA_VERSION = 1;
const TASKBAR_PIN_LABEL = "작업 표시줄에 고정";
const TASKBAR_UNPIN_LABEL = "작업 표시줄에서 제거";
const APPLICATION_IDS: readonly TaskbarApplicationId[] = ["file-explorer", "chrome"];

/**
 * null과 배열을 제외한 객체인지 판별한다.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * 객체의 열거 가능한 자체 key가 기대한 목록과 정확히 같은지 확인한다.
 */
const hasOnlyKeys = (record: Record<string, unknown>, expected: readonly string[]): boolean => {
  const keys = Object.keys(record);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
};

/**
 * runtime 값이 지원하는 concrete Taskbar application인지 판별한다.
 */
const isApplicationId = (value: unknown): value is TaskbarApplicationId =>
  value === "file-explorer" || value === "chrome";

/**
 * 두 Taskbar 항목이 metadata와 무관하게 같은 identity인지 판별한다.
 */
const sameItem = (left: TaskbarItem, right: TaskbarItem): boolean =>
  left.kind === right.kind &&
  (left.kind === "application"
    ? right.kind === "application" && left.applicationId === right.applicationId
    : right.kind === "external-shortcut" && left.resource.id === right.resource.id);

/**
 * Taskbar identity를 목록 중복 제거용 문자열 key로 만든다.
 */
const itemKey = (item: TaskbarItem): string =>
  item.kind === "application"
    ? `application:${item.applicationId}`
    : `external-shortcut:${item.resource.id}`;

/**
 * 외부 입력을 metadata 없는 strict Taskbar identity로 복원하고 잘못된 값에는 null을 반환한다.
 */
const tryParseItem = (value: unknown): TaskbarItem | null => {
  if (!isRecord(value)) return null;
  if (
    hasOnlyKeys(value, ["kind", "applicationId"]) &&
    value.kind === "application" &&
    isApplicationId(value.applicationId)
  ) {
    return Object.freeze({ kind: "application", applicationId: value.applicationId });
  }
  if (!hasOnlyKeys(value, ["kind", "resource"]) || value.kind !== "external-shortcut") {
    return null;
  }
  try {
    const resource = parseResourceRef(value.resource);
    return resource.kind === "external-shortcut"
      ? Object.freeze({ kind: "external-shortcut", resource })
      : null;
  } catch {
    return null;
  }
};

/**
 * Taskbar item과 중첩 ref를 새 객체로 복제하고 동결한다.
 */
const freezeItem = (item: TaskbarItem): TaskbarItem =>
  item.kind === "application"
    ? Object.freeze({ kind: "application", applicationId: item.applicationId })
    : Object.freeze({
        kind: "external-shortcut",
        resource: Object.freeze({ ...item.resource }),
      });

/**
 * Taskbar snapshot의 두 배열과 모든 identity를 복제해 immutable public 경계를 만든다.
 */
const freezeSnapshot = (snapshot: TaskbarSnapshot): TaskbarSnapshot =>
  Object.freeze({
    pinnedItems: Object.freeze(snapshot.pinnedItems.map(freezeItem)),
    visibleItems: Object.freeze(snapshot.visibleItems.map(freezeItem)),
  });

/**
 * 두 Taskbar item 목록의 identity와 순서가 같은지 판별한다.
 */
const sameItems = (left: readonly TaskbarItem[], right: readonly TaskbarItem[]): boolean =>
  left.length === right.length &&
  left.every((item, index) => right[index] !== undefined && sameItem(item, right[index]));

/**
 * 두 Taskbar snapshot의 persistent와 visible identity 순서가 모두 같은지 판별한다.
 */
const sameSnapshot = (left: TaskbarSnapshot, right: TaskbarSnapshot): boolean =>
  sameItems(left.pinnedItems, right.pinnedItems) &&
  sameItems(left.visibleItems, right.visibleItems);

/**
 * 현재 Window snapshot에서 실행 중인 application 집합을 만든다.
 */
const runningApplications = (windowState: WindowState): ReadonlySet<TaskbarApplicationId> =>
  new Set(windowState.sessions.map(({ applicationId }) => applicationId));

/**
 * persistent Pin 뒤에 현재 실행 중인 unpinned application을 고정 application 순서로 추가한다.
 */
const createVisibleItems = (
  pinnedItems: readonly TaskbarItem[],
  windowState: WindowState,
): readonly TaskbarItem[] => {
  const visible = [...pinnedItems];
  const running = runningApplications(windowState);
  for (const applicationId of APPLICATION_IDS) {
    const item: TaskbarItem = { kind: "application", applicationId };
    if (running.has(applicationId) && !visible.some((candidate) => sameItem(candidate, item))) {
      visible.push(item);
    }
  }
  return visible;
};

/**
 * 기존 visible 위치를 유지하며 닫힌 running-only 항목을 제거하고 새 실행 앱을 끝에 추가한다.
 */
const reconcileVisibleItems = (
  snapshot: TaskbarSnapshot,
  windowState: WindowState,
): readonly TaskbarItem[] => {
  const running = runningApplications(windowState);
  const visible = snapshot.visibleItems.filter(
    (item) =>
      snapshot.pinnedItems.some((pinned) => sameItem(pinned, item)) ||
      (item.kind === "application" && running.has(item.applicationId)),
  );
  for (const applicationId of APPLICATION_IDS) {
    const item: TaskbarItem = { kind: "application", applicationId };
    if (running.has(applicationId) && !visible.some((candidate) => sameItem(candidate, item))) {
      visible.push(item);
    }
  }
  return visible;
};

/**
 * persistent snapshot을 metadata 없는 schema version 1 저장값으로 투영한다.
 */
const toStorageSnapshot = (snapshot: TaskbarSnapshot): TaskbarStorageSnapshot =>
  Object.freeze({
    schemaVersion: TASKBAR_SCHEMA_VERSION,
    items: Object.freeze(snapshot.pinnedItems.map(freezeItem)),
  });

/**
 * 현재 Taskbar 최초 seed인 Explorer 다음 Chrome Pin 순서를 만든다.
 */
const createSeedPins = (): readonly TaskbarItem[] =>
  Object.freeze([
    Object.freeze({ kind: "application", applicationId: "file-explorer" as const }),
    Object.freeze({ kind: "application", applicationId: "chrome" as const }),
  ]);

/**
 * schema version 1 값에서 유효한 application과 현재 존재하는 shortcut의 첫 등장만 복원한다.
 */
const restorePins = (
  value: unknown,
  catalog: ExternalShortcutCatalogReader,
): RestoredPins | null => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["schemaVersion", "items"]) ||
    value.schemaVersion !== TASKBAR_SCHEMA_VERSION ||
    !Array.isArray(value.items)
  ) {
    return null;
  }
  const pinnedItems: TaskbarItem[] = [];
  const seen = new Set<string>();
  let shouldSave = false;
  for (const candidate of value.items) {
    const item = tryParseItem(candidate);
    if (
      item === null ||
      (item.kind === "external-shortcut" && !catalog.has(item.resource.id)) ||
      seen.has(item === null ? "" : itemKey(item))
    ) {
      shouldSave = true;
      continue;
    }
    seen.add(itemKey(item));
    pinnedItems.push(item);
  }
  return Object.freeze({ pinnedItems: Object.freeze(pinnedItems), shouldSave });
};

/**
 * 외부 값이 0 이상의 정수 direct reorder destination인지 판별한다.
 */
const isReorderDestination = (value: unknown): value is TaskbarReorderDestination =>
  isRecord(value) &&
  hasOnlyKeys(value, ["type", "index"]) &&
  value.type === "index" &&
  typeof value.index === "number" &&
  Number.isInteger(value.index) &&
  value.index >= 0;

/**
 * Taskbar persistent Pin, runtime visible order와 Window commit 연결을 제공한다.
 */
export class TaskbarStore {
  private static initialization: TaskbarStoreInitialization | null = null;
  private static initializationPromise: Promise<TaskbarStoreResult> | null = null;
  private static snapshot: TaskbarSnapshot | null = null;
  private static commandQueue: Promise<void> = Promise.resolve();
  private static unsubscribeWindow: (() => void) | null = null;
  private static readonly listeners = new Set<Listener>();

  /**
   * instance 생성을 막고 브라우저 runtime의 정적 상태를 사용하게 한다.
   */
  private constructor() {}

  /**
   * 초기화된 immutable snapshot을 반환하거나 lifecycle 오류를 던진다.
   */
  private static requireSnapshot = (): TaskbarSnapshot => {
    if (TaskbarStore.snapshot === null) throw new TaskbarStoreNotInitializedError();
    return TaskbarStore.snapshot;
  };

  /**
   * 연결된 runtime dependency를 반환하거나 lifecycle 오류를 던진다.
   */
  private static requireInitialization = (): TaskbarStoreInitialization => {
    if (TaskbarStore.initialization === null) throw new TaskbarStoreNotInitializedError();
    return TaskbarStore.initialization;
  };

  /**
   * 같은 dependency 객체를 다시 전달한 idempotent 초기화인지 판별한다.
   */
  private static sameInitialization = (
    left: TaskbarStoreInitialization,
    right: TaskbarStoreInitialization,
  ): boolean =>
    left.storage === right.storage &&
    left.externalShortcutCatalog === right.externalShortcutCatalog &&
    left.windowReader === right.windowReader;

  /**
   * listener 오류를 격리하며 현재 등록 순서대로 semantic commit을 알린다.
   */
  private static notify = (): void => {
    for (const listener of [...TaskbarStore.listeners]) {
      try {
        listener();
      } catch (error) {
        void error;
      }
    }
  };

  /**
   * 작업을 직렬 queue에 추가해 초기화, Window commit, Pin과 저장 순서를 보존한다.
   */
  private static enqueue = (
    operation: () => Promise<TaskbarStoreResult>,
  ): Promise<TaskbarStoreResult> => {
    const result = TaskbarStore.commandQueue.then(operation, operation);
    TaskbarStore.commandQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  /**
   * 현재 persistent projection을 저장하고 실패를 rollback 없는 tagged 결과로 바꾼다.
   */
  private static save = async (snapshot: TaskbarSnapshot): Promise<TaskbarStoreResult> => {
    try {
      await TaskbarStore.requireInitialization().storage.save(toStorageSnapshot(snapshot));
      return { ok: true, value: snapshot };
    } catch {
      return {
        ok: false,
        reason: "storage-write-failed",
        committed: true,
        value: snapshot,
      };
    }
  };

  /**
   * 새 snapshot을 동결·반영하고 알린 뒤 persistent 변경일 때만 전체 Pin을 저장한다.
   */
  private static commit = async (
    snapshot: TaskbarSnapshot,
    persist: boolean,
  ): Promise<TaskbarStoreResult> => {
    const value = freezeSnapshot(snapshot);
    TaskbarStore.snapshot = value;
    TaskbarStore.notify();
    return persist ? TaskbarStore.save(value) : { ok: true, value };
  };

  /**
   * 현재 상태를 바꾸지 않은 요청의 공통 no-op 결과를 만든다.
   */
  private static noOp = (): TaskbarStoreResult => ({ ok: false, reason: "no-op" });

  /**
   * 잘못된 입력을 snapshot 변화 없이 반환할 tagged 거절 결과로 만든다.
   */
  private static rejected = (reason: TaskbarStoreRejectionReason): TaskbarStoreRejectedResult => ({
    ok: false,
    reason,
  });

  /**
   * 명령 입력을 strict Taskbar identity로 검증하고 shortcut 존재 여부를 별도로 확인한다.
   */
  private static parseCommandItem = (
    item: TaskbarItem | ResourceRef,
  ): TaskbarItem | TaskbarStoreRejectedResult => {
    const parsed = tryParseItem(item);
    if (parsed === null) return TaskbarStore.rejected("invalid-taskbar-item");
    if (
      parsed.kind === "external-shortcut" &&
      !TaskbarStore.requireInitialization().externalShortcutCatalog.has(parsed.resource.id)
    ) {
      return TaskbarStore.rejected("shortcut-not-found");
    }
    return parsed;
  };

  /**
   * 저장값을 읽어 seed, 정상 빈 배열, 부분 정리와 전체 손상을 구분한다.
   */
  private static loadPins = async (): Promise<RestoredPins> => {
    const { storage, externalShortcutCatalog } = TaskbarStore.requireInitialization();
    let saved: unknown;
    try {
      saved = await storage.load();
    } catch {
      return { pinnedItems: createSeedPins(), shouldSave: true };
    }
    if (saved === null) return { pinnedItems: createSeedPins(), shouldSave: true };
    return (
      restorePins(saved, externalShortcutCatalog) ?? {
        pinnedItems: createSeedPins(),
        shouldSave: true,
      }
    );
  };

  /**
   * 알림 시점에 캡처한 Window snapshot 하나를 visible sequence에 순서대로 반영한다.
   */
  private static applyWindowSnapshot = (windowState: WindowState): Promise<TaskbarStoreResult> =>
    TaskbarStore.enqueue(async () => {
      const current = TaskbarStore.requireSnapshot();
      const visibleItems = reconcileVisibleItems(current, windowState);
      return sameItems(current.visibleItems, visibleItems)
        ? TaskbarStore.noOp()
        : TaskbarStore.commit({ ...current, visibleItems }, false);
    });

  /**
   * dependency를 연결하고 저장 Pin과 초기 Window bootstrap을 하나의 snapshot으로 복원한다.
   *
   * Window subscriber는 load 전에 설치하며 각 commit의 snapshot을 callback 안에서 캡처해 느린 저장
   * 중 close→reopen 같은 중간 상태도 queue에서 잃지 않는다.
   */
  static initialize(initialization: TaskbarStoreInitialization): Promise<TaskbarStoreResult> {
    if (TaskbarStore.initialization !== null) {
      if (!TaskbarStore.sameInitialization(TaskbarStore.initialization, initialization)) {
        return Promise.reject(new TaskbarStoreAlreadyInitializedError());
      }
      if (TaskbarStore.initializationPromise !== null) return TaskbarStore.initializationPromise;
      return Promise.resolve({ ok: true, value: TaskbarStore.requireSnapshot() });
    }

    const initialWindowState = initialization.windowReader.getSnapshot();
    TaskbarStore.initialization = Object.freeze({ ...initialization });
    TaskbarStore.unsubscribeWindow = initialization.windowReader.subscribe(() => {
      const committedWindowState = initialization.windowReader.getSnapshot();
      void TaskbarStore.applyWindowSnapshot(committedWindowState).catch(() => undefined);
    });
    TaskbarStore.initializationPromise = TaskbarStore.enqueue(async () => {
      const restored = await TaskbarStore.loadPins();
      return TaskbarStore.commit(
        {
          pinnedItems: restored.pinnedItems,
          visibleItems: createVisibleItems(restored.pinnedItems, initialWindowState),
        },
        restored.shouldSave,
      );
    }).catch((error: unknown) => {
      TaskbarStore.unsubscribeWindow?.();
      TaskbarStore.unsubscribeWindow = null;
      TaskbarStore.initialization = null;
      TaskbarStore.initializationPromise = null;
      throw error;
    });
    return TaskbarStore.initializationPromise;
  }

  /**
   * 현재 commit된 immutable Taskbar Pin과 visible snapshot을 반환한다.
   */
  static getSnapshot(): TaskbarSnapshot {
    return TaskbarStore.requireSnapshot();
  }

  /**
   * semantic Taskbar commit 뒤 호출할 listener를 등록하고 해제 함수를 반환한다.
   */
  static subscribe(listener: Listener): () => void {
    TaskbarStore.listeners.add(listener);
    return () => TaskbarStore.listeners.delete(listener);
  }

  /**
   * 앞서 캡처된 Window commit을 모두 처리한 뒤 호출 시점의 최신 Window snapshot도 reconcile한다.
   *
   * Application callback이 visible 규칙을 재구현하지 않고 deterministic 완료를 기다릴 때 사용한다.
   */
  static reconcileWindows(): Promise<TaskbarStoreResult> {
    const { windowReader } = TaskbarStore.requireInitialization();
    return TaskbarStore.applyWindowSnapshot(windowReader.getSnapshot());
  }

  /**
   * 최신 저장값을 복원하고 persistent 순서 뒤에 현재 running-only application을 추가한다.
   */
  static reload(): Promise<TaskbarStoreResult> {
    const { windowReader } = TaskbarStore.requireInitialization();
    return TaskbarStore.enqueue(async () => {
      const restored = await TaskbarStore.loadPins();
      const next = freezeSnapshot({
        pinnedItems: restored.pinnedItems,
        visibleItems: createVisibleItems(restored.pinnedItems, windowReader.getSnapshot()),
      });
      const current = TaskbarStore.requireSnapshot();
      if (sameSnapshot(current, next)) {
        return restored.shouldSave ? TaskbarStore.save(current) : TaskbarStore.noOp();
      }
      return TaskbarStore.commit(next, restored.shouldSave);
    });
  }

  /**
   * 현재 Catalog에서 사라진 ExternalShortcut Pin만 제거하고 application과 visible 위치를 보존한다.
   */
  static reconcileResources(): Promise<TaskbarStoreResult> {
    TaskbarStore.requireInitialization();
    return TaskbarStore.enqueue(async () => {
      const current = TaskbarStore.requireSnapshot();
      const { externalShortcutCatalog, windowReader } = TaskbarStore.requireInitialization();
      const pinnedItems = current.pinnedItems.filter(
        (item) => item.kind === "application" || externalShortcutCatalog.has(item.resource.id),
      );
      if (pinnedItems.length === current.pinnedItems.length) return TaskbarStore.noOp();
      const removed = current.pinnedItems.filter(
        (item) => !pinnedItems.some((candidate) => sameItem(candidate, item)),
      );
      const visibleItems = reconcileVisibleItems(
        {
          pinnedItems,
          visibleItems: current.visibleItems.filter(
            (item) => !removed.some((candidate) => sameItem(candidate, item)),
          ),
        },
        windowReader.getSnapshot(),
      );
      return TaskbarStore.commit({ pinnedItems, visibleItems }, true);
    });
  }

  /**
   * application 또는 ExternalShortcut이 현재 persistent Taskbar 목록에 고정됐는지 판별한다.
   */
  static isPinned(item: TaskbarItem | ResourceRef): boolean {
    const parsed = tryParseItem(item);
    return (
      parsed !== null &&
      TaskbarStore.requireSnapshot().pinnedItems.some((candidate) => sameItem(candidate, parsed))
    );
  }

  /**
   * 유효한 Taskbar identity의 현재 Pin 여부에 맞는 Context Menu label을 반환한다.
   *
   * Content, Folder와 malformed identity에는 Taskbar capability가 없으므로 null을 반환한다.
   */
  static getPinLabel(item: TaskbarItem | ResourceRef): string | null {
    const parsed = tryParseItem(item);
    if (parsed === null) return null;
    return TaskbarStore.isPinned(parsed) ? TASKBAR_UNPIN_LABEL : TASKBAR_PIN_LABEL;
  }

  /**
   * 현재 visible 위치에서 실제 가능한 Taskbar 상대 reorder action을 순서대로 반환한다.
   */
  static getReorderActions(item: TaskbarItem | ResourceRef): readonly TaskbarReorderAction[] {
    const parsed = tryParseItem(item);
    if (parsed === null) return Object.freeze([]);
    const items = TaskbarStore.requireSnapshot().visibleItems;
    const index = items.findIndex((candidate) => sameItem(candidate, parsed));
    if (index === -1 || items.length === 1) return Object.freeze([]);
    if (index === 0) return Object.freeze(["right"]);
    if (index === items.length - 1) return Object.freeze(["first", "left"]);
    return Object.freeze(["first", "left", "right"]);
  }

  /**
   * application 또는 존재하는 ExternalShortcut을 고정하고 이미 visible이면 현재 위치를 유지한다.
   */
  static pin(item: TaskbarItem | ResourceRef): Promise<TaskbarStoreResult> {
    TaskbarStore.requireInitialization();
    return TaskbarStore.enqueue(async () => {
      const parsed = TaskbarStore.parseCommandItem(item);
      if ("ok" in parsed) return parsed;
      const current = TaskbarStore.requireSnapshot();
      if (current.pinnedItems.some((candidate) => sameItem(candidate, parsed))) {
        return TaskbarStore.noOp();
      }
      return TaskbarStore.commit(
        {
          pinnedItems: [...current.pinnedItems, parsed],
          visibleItems: current.visibleItems.some((candidate) => sameItem(candidate, parsed))
            ? current.visibleItems
            : [...current.visibleItems, parsed],
        },
        true,
      );
    });
  }

  /**
   * Pin을 제거하며 실행 중인 application만 현재 visible 위치에 남긴다.
   */
  static unpin(item: TaskbarItem | ResourceRef): Promise<TaskbarStoreResult> {
    TaskbarStore.requireInitialization();
    return TaskbarStore.enqueue(async () => {
      const parsed = TaskbarStore.parseCommandItem(item);
      if ("ok" in parsed) return parsed;
      const current = TaskbarStore.requireSnapshot();
      const pinnedItems = current.pinnedItems.filter((candidate) => !sameItem(candidate, parsed));
      if (pinnedItems.length === current.pinnedItems.length) return TaskbarStore.noOp();
      const running = runningApplications(
        TaskbarStore.requireInitialization().windowReader.getSnapshot(),
      );
      const keepVisible = parsed.kind === "application" && running.has(parsed.applicationId);
      return TaskbarStore.commit(
        {
          pinnedItems,
          visibleItems: keepVisible
            ? current.visibleItems
            : current.visibleItems.filter((candidate) => !sameItem(candidate, parsed)),
        },
        true,
      );
    });
  }

  /**
   * visible 항목을 상대 위치 또는 direct index로 한 번 이동하고 pinned projection만 저장한다.
   */
  static reorder(
    item: TaskbarItem | ResourceRef,
    intent: TaskbarReorderIntent,
  ): Promise<TaskbarStoreResult> {
    TaskbarStore.requireInitialization();
    return TaskbarStore.enqueue(async () => {
      const parsed = TaskbarStore.parseCommandItem(item);
      if ("ok" in parsed) return parsed;
      if (
        intent !== "first" &&
        intent !== "left" &&
        intent !== "right" &&
        !isReorderDestination(intent)
      ) {
        return TaskbarStore.rejected("invalid-reorder-action");
      }
      const current = TaskbarStore.requireSnapshot();
      const index = current.visibleItems.findIndex((candidate) => sameItem(candidate, parsed));
      if (index === -1) return TaskbarStore.noOp();
      if (isReorderDestination(intent) && intent.index >= current.visibleItems.length) {
        return TaskbarStore.rejected("invalid-reorder-action");
      }
      const targetIndex = isReorderDestination(intent)
        ? intent.index
        : intent === "first"
          ? 0
          : intent === "left"
            ? Math.max(0, index - 1)
            : Math.min(current.visibleItems.length - 1, index + 1);
      if (targetIndex === index) return TaskbarStore.noOp();
      const visibleItems = [...current.visibleItems];
      const [moved] = visibleItems.splice(index, 1);
      if (moved === undefined) return TaskbarStore.noOp();
      visibleItems.splice(targetIndex, 0, moved);
      const pinnedItems = visibleItems.filter((candidate) =>
        current.pinnedItems.some((pinned) => sameItem(pinned, candidate)),
      );
      return TaskbarStore.commit(
        { pinnedItems, visibleItems },
        !sameItems(current.pinnedItems, pinnedItems),
      );
    });
  }
}
