/**
 * @file File Explorer의 location-global 보기 설정, responsive 소비와 persistence를 조율한다.
 *
 * 실제 localStorage와 tab·Window별 navigation 상태는 소유하지 않는다.
 */
import { type FolderResourceRef, parseResourceRef } from "../../../resources/index.js";
import type { FileExplorerLocation } from "../../model/index.js";
import {
  areFolderViewSettingsEqual,
  areFolderViewSettingsLocationsEqual,
  DEFAULT_FOLDER_VIEW_SETTINGS,
  type FolderViewSettings,
  type FolderViewSettingsAction,
  type FolderViewSettingsChange,
  type FolderViewSettingsSurface,
  parseFolderViewSettings,
  parseFolderViewSettingsLocation,
} from "../model/index.js";
import {
  createFolderViewSettingsStorageSnapshot,
  type FolderViewSettingsStorage,
  type FolderViewSettingsStorageEntry,
  parseFolderViewSettingsStorageSnapshot,
} from "../storage/index.js";
import type {
  FolderViewSettingsStoreRejectedResult,
  FolderViewSettingsStoreRejectionReason,
  FolderViewSettingsStoreResult,
} from "./operationResult/index.js";

/** runtime 전체가 공유하는 현재 responsive surface와 위치별 desktop 설정이다. */
export type FolderViewSettingsSnapshot = Readonly<{
  surface: FolderViewSettingsSurface;
  entries: readonly FolderViewSettingsStorageEntry[];
}>;

/** 브라우저 runtime에서 Store를 최초 결합하는 surface와 저장 port다. */
export type FolderViewSettingsStoreInitialization = Readonly<{
  surface: FolderViewSettingsSurface;
  storage: FolderViewSettingsStorage;
}>;

/** 한 명령의 semantic snapshot commit 시점을 실행 계층에 알린다. */
export type FolderViewSettingsStoreCommandContext = Readonly<{
  onCommit(value: FolderViewSettingsSnapshot): void;
}>;

/** 초기화 전에 snapshot이나 명령에 접근했을 때 발생한다. */
export class FolderViewSettingsStoreNotInitializedError extends Error {
  constructor() {
    super("FolderViewSettingsStore를 읽거나 변경하기 전에 초기화해야 합니다");
    this.name = "FolderViewSettingsStoreNotInitializedError";
  }
}

/** 이미 결합된 Store에 다른 storage 또는 최초 surface를 다시 연결할 때 발생한다. */
export class FolderViewSettingsStoreAlreadyInitializedError extends Error {
  constructor() {
    super("현재 runtime에는 FolderViewSettingsStore dependency가 이미 연결되어 있습니다");
    this.name = "FolderViewSettingsStoreAlreadyInitializedError";
  }
}

type Listener = () => void;

type LoadedEntries = Readonly<{
  entries: readonly FolderViewSettingsStorageEntry[];
  shouldSave: boolean;
  readFailed: boolean;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (record: Record<string, unknown>, expected: readonly string[]): boolean => {
  const keys = Object.keys(record);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
};

const freezeSnapshot = (snapshot: FolderViewSettingsSnapshot): FolderViewSettingsSnapshot => {
  const stored = createFolderViewSettingsStorageSnapshot(snapshot.entries);
  return Object.freeze({ surface: snapshot.surface, entries: stored.entries });
};

const sameEntries = (
  left: readonly FolderViewSettingsStorageEntry[],
  right: readonly FolderViewSettingsStorageEntry[],
): boolean =>
  left.length === right.length &&
  left.every((entry, index) => {
    const other = right[index];
    return (
      other !== undefined &&
      areFolderViewSettingsLocationsEqual(entry.location, other.location) &&
      areFolderViewSettingsEqual(entry.settings, other.settings)
    );
  });

const findSettings = (
  entries: readonly FolderViewSettingsStorageEntry[],
  location: FileExplorerLocation,
): FolderViewSettings =>
  entries.find((entry) => areFolderViewSettingsLocationsEqual(entry.location, location))
    ?.settings ?? DEFAULT_FOLDER_VIEW_SETTINGS;

const isSurface = (value: unknown): value is FolderViewSettingsSurface =>
  value === "desktop" || value === "mobile";

const parseChange = (value: unknown): FolderViewSettingsChange => {
  if (!isRecord(value)) throw new TypeError("보기 설정 변경은 객체여야 합니다");
  const allowed = ["viewMode", "sortKey", "sortDirection", "detailsColumnWidths"];
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.some((key) => !allowed.includes(key))) {
    throw new TypeError("보기 설정 변경 필드가 올바르지 않습니다");
  }
  const candidate = {
    ...DEFAULT_FOLDER_VIEW_SETTINGS,
    ...value,
    detailsColumnWidths:
      value.detailsColumnWidths ?? DEFAULT_FOLDER_VIEW_SETTINGS.detailsColumnWidths,
  };
  const parsed = parseFolderViewSettings(candidate);
  return Object.freeze({
    ...(value.viewMode === undefined ? {} : { viewMode: parsed.viewMode }),
    ...(value.sortKey === undefined ? {} : { sortKey: parsed.sortKey }),
    ...(value.sortDirection === undefined ? {} : { sortDirection: parsed.sortDirection }),
    ...(value.detailsColumnWidths === undefined
      ? {}
      : { detailsColumnWidths: parsed.detailsColumnWidths }),
  });
};

const parseAction = (
  action: FolderViewSettingsAction,
):
  | Readonly<{
      location: FileExplorerLocation;
      change: FolderViewSettingsChange;
    }>
  | FolderViewSettingsStoreRejectedResult => {
  if (!isRecord(action) || !hasOnlyKeys(action, ["type", "location", "change"])) {
    return { ok: false, reason: "invalid-action" };
  }
  if (action.type !== "folder-view-settings.update") {
    return { ok: false, reason: "invalid-action" };
  }
  let location: FileExplorerLocation;
  try {
    location = parseFolderViewSettingsLocation(action.location);
  } catch {
    return { ok: false, reason: "invalid-location" };
  }
  try {
    return Object.freeze({ location, change: parseChange(action.change) });
  } catch {
    return { ok: false, reason: "invalid-settings-change" };
  }
};

/** 위치별 desktop 설정을 공유하고 저장하는 headless runtime Store다. */
export class FolderViewSettingsStore {
  private static initialization: FolderViewSettingsStoreInitialization | null = null;
  private static initializationPromise: Promise<FolderViewSettingsStoreResult> | null = null;
  private static snapshot: FolderViewSettingsSnapshot | null = null;
  private static commandQueue: Promise<void> = Promise.resolve();
  private static readonly listeners = new Set<Listener>();

  private constructor() {}

  private static requireInitialization = (): FolderViewSettingsStoreInitialization => {
    if (FolderViewSettingsStore.initialization === null) {
      throw new FolderViewSettingsStoreNotInitializedError();
    }
    return FolderViewSettingsStore.initialization;
  };

  private static requireSnapshot = (): FolderViewSettingsSnapshot => {
    if (FolderViewSettingsStore.snapshot === null) {
      throw new FolderViewSettingsStoreNotInitializedError();
    }
    return FolderViewSettingsStore.snapshot;
  };

  private static notify = (): void => {
    for (const listener of [...FolderViewSettingsStore.listeners]) {
      try {
        listener();
      } catch (error) {
        void error;
      }
    }
  };

  private static enqueue = (
    operation: () => Promise<FolderViewSettingsStoreResult>,
  ): Promise<FolderViewSettingsStoreResult> => {
    const result = FolderViewSettingsStore.commandQueue.then(operation, operation);
    FolderViewSettingsStore.commandQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  private static rejected = (
    reason: FolderViewSettingsStoreRejectionReason,
  ): FolderViewSettingsStoreRejectedResult => ({ ok: false, reason });

  private static noOp = (): FolderViewSettingsStoreResult => ({ ok: false, reason: "no-op" });

  private static persist = async (
    snapshot: FolderViewSettingsSnapshot,
  ): Promise<FolderViewSettingsStoreResult> => {
    try {
      await FolderViewSettingsStore.requireInitialization().storage.save(
        createFolderViewSettingsStorageSnapshot(snapshot.entries),
      );
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

  private static commit = async (
    snapshot: FolderViewSettingsSnapshot,
    persist: boolean,
    context?: FolderViewSettingsStoreCommandContext,
  ): Promise<FolderViewSettingsStoreResult> => {
    const value = freezeSnapshot(snapshot);
    FolderViewSettingsStore.snapshot = value;
    try {
      context?.onCommit(value);
    } catch (error) {
      void error;
    }
    FolderViewSettingsStore.notify();
    return persist ? FolderViewSettingsStore.persist(value) : { ok: true, value };
  };

  private static loadEntries = async (): Promise<LoadedEntries> => {
    let saved: unknown;
    try {
      saved = await FolderViewSettingsStore.requireInitialization().storage.load();
    } catch {
      return Object.freeze({ entries: Object.freeze([]), shouldSave: false, readFailed: true });
    }
    if (saved === null) {
      return Object.freeze({ entries: Object.freeze([]), shouldSave: false, readFailed: false });
    }
    const parsed = parseFolderViewSettingsStorageSnapshot(saved);
    return parsed === null
      ? Object.freeze({ entries: Object.freeze([]), shouldSave: true, readFailed: false })
      : Object.freeze({
          entries: parsed.snapshot.entries,
          shouldSave: parsed.repaired,
          readFailed: false,
        });
  };

  /** storage를 연결하고 desktop에서만 저장값을 읽어 첫 immutable snapshot을 만든다. */
  static initialize(
    nextInitialization: FolderViewSettingsStoreInitialization,
  ): Promise<FolderViewSettingsStoreResult> {
    if (!isSurface(nextInitialization.surface)) {
      return Promise.resolve(FolderViewSettingsStore.rejected("invalid-surface"));
    }
    if (FolderViewSettingsStore.initialization !== null) {
      if (
        FolderViewSettingsStore.initialization.storage !== nextInitialization.storage ||
        FolderViewSettingsStore.initialization.surface !== nextInitialization.surface
      ) {
        return Promise.reject(new FolderViewSettingsStoreAlreadyInitializedError());
      }
      if (FolderViewSettingsStore.initializationPromise !== null) {
        return FolderViewSettingsStore.initializationPromise;
      }
      return Promise.resolve({ ok: true, value: FolderViewSettingsStore.requireSnapshot() });
    }

    FolderViewSettingsStore.initialization = Object.freeze({ ...nextInitialization });
    FolderViewSettingsStore.initializationPromise = FolderViewSettingsStore.enqueue(async () => {
      if (nextInitialization.surface === "mobile") {
        return FolderViewSettingsStore.commit({ surface: "mobile", entries: [] }, false);
      }
      const loaded = await FolderViewSettingsStore.loadEntries();
      return FolderViewSettingsStore.commit(
        { surface: "desktop", entries: loaded.entries },
        loaded.shouldSave,
      );
    }).catch((error: unknown) => {
      FolderViewSettingsStore.initialization = null;
      FolderViewSettingsStore.initializationPromise = null;
      FolderViewSettingsStore.snapshot = null;
      throw error;
    });
    return FolderViewSettingsStore.initializationPromise;
  }

  /** 현재 responsive surface와 모든 location별 desktop 설정을 반환한다. */
  static getSnapshot(): FolderViewSettingsSnapshot {
    return FolderViewSettingsStore.requireSnapshot();
  }

  /** 현재 surface에서 한 location에 실제 적용할 설정을 반환한다. */
  static getSettings(location: FileExplorerLocation): FolderViewSettings {
    const snapshot = FolderViewSettingsStore.requireSnapshot();
    if (snapshot.surface === "mobile") return DEFAULT_FOLDER_VIEW_SETTINGS;
    const parsed = parseFolderViewSettingsLocation(location);
    return findSettings(snapshot.entries, parsed);
  }

  /** semantic snapshot commit 알림을 등록하고 해제 함수를 반환한다. */
  static subscribe(listener: Listener): () => void {
    FolderViewSettingsStore.listeners.add(listener);
    return () => FolderViewSettingsStore.listeners.delete(listener);
  }

  /** 현재 responsive surface를 바꾸며 desktop 진입에서 저장된 최신 설정을 다시 읽는다. */
  static setSurface(
    surface: FolderViewSettingsSurface,
    context?: FolderViewSettingsStoreCommandContext,
  ): Promise<FolderViewSettingsStoreResult> {
    FolderViewSettingsStore.requireInitialization();
    if (!isSurface(surface))
      return Promise.resolve(FolderViewSettingsStore.rejected("invalid-surface"));
    return FolderViewSettingsStore.enqueue(async () => {
      const current = FolderViewSettingsStore.requireSnapshot();
      if (current.surface === surface) return FolderViewSettingsStore.noOp();
      if (surface === "mobile") {
        return FolderViewSettingsStore.commit({ surface, entries: [] }, false, context);
      }
      const loaded = await FolderViewSettingsStore.loadEntries();
      const entries = loaded.readFailed ? current.entries : loaded.entries;
      return FolderViewSettingsStore.commit({ surface, entries }, loaded.shouldSave, context);
    });
  }

  /** desktop에서 최신 저장값을 다시 읽고 mobile에서는 읽기 없이 no-op한다. */
  static reload(
    context?: FolderViewSettingsStoreCommandContext,
  ): Promise<FolderViewSettingsStoreResult> {
    FolderViewSettingsStore.requireInitialization();
    return FolderViewSettingsStore.enqueue(async () => {
      const current = FolderViewSettingsStore.requireSnapshot();
      if (current.surface === "mobile") return FolderViewSettingsStore.noOp();
      const loaded = await FolderViewSettingsStore.loadEntries();
      if (loaded.readFailed) return FolderViewSettingsStore.noOp();
      if (sameEntries(current.entries, loaded.entries)) {
        return loaded.shouldSave
          ? FolderViewSettingsStore.persist(current)
          : FolderViewSettingsStore.noOp();
      }
      return FolderViewSettingsStore.commit(
        { ...current, entries: loaded.entries },
        loaded.shouldSave,
        context,
      );
    });
  }

  /** serializable update Action을 최신 queue snapshot에 원자적으로 적용한다. */
  static dispatch(
    action: FolderViewSettingsAction,
    context?: FolderViewSettingsStoreCommandContext,
  ): Promise<FolderViewSettingsStoreResult> {
    FolderViewSettingsStore.requireInitialization();
    const parsed = parseAction(action);
    if ("ok" in parsed) return Promise.resolve(parsed);
    return FolderViewSettingsStore.enqueue(async () => {
      const current = FolderViewSettingsStore.requireSnapshot();
      if (current.surface === "mobile") return FolderViewSettingsStore.noOp();
      const currentSettings = findSettings(current.entries, parsed.location);
      const nextSettings = parseFolderViewSettings({ ...currentSettings, ...parsed.change });
      if (areFolderViewSettingsEqual(currentSettings, nextSettings)) {
        return FolderViewSettingsStore.noOp();
      }

      const entries = current.entries.filter(
        (entry) => !areFolderViewSettingsLocationsEqual(entry.location, parsed.location),
      );
      if (!areFolderViewSettingsEqual(nextSettings, DEFAULT_FOLDER_VIEW_SETTINGS)) {
        entries.push({ location: parsed.location, settings: nextSettings });
      }
      return FolderViewSettingsStore.commit({ ...current, entries }, true, context);
    });
  }

  /** location과 변경값을 update Action으로 만들어 dispatch한다. */
  static update(
    location: FileExplorerLocation,
    change: FolderViewSettingsChange,
    context?: FolderViewSettingsStoreCommandContext,
  ): Promise<FolderViewSettingsStoreResult> {
    return FolderViewSettingsStore.dispatch(
      { type: "folder-view-settings.update", location, change },
      context,
    );
  }

  /** 현재 Workspace에 없는 Folder entry만 제거하고 Desktop entry는 항상 유지한다. */
  static reconcileFolders(
    folders: readonly FolderResourceRef[],
    context?: FolderViewSettingsStoreCommandContext,
  ): Promise<FolderViewSettingsStoreResult> {
    FolderViewSettingsStore.requireInitialization();
    return FolderViewSettingsStore.enqueue(async () => {
      const current = FolderViewSettingsStore.requireSnapshot();
      if (current.surface === "mobile") return FolderViewSettingsStore.noOp();
      const currentFolderIds = new Set<string>();
      try {
        for (const candidate of folders) {
          const ref = parseResourceRef(candidate);
          if (ref.kind !== "folder") throw new TypeError("Folder가 아닌 ref입니다");
          currentFolderIds.add(ref.id);
        }
      } catch {
        return FolderViewSettingsStore.rejected("invalid-folder-list");
      }
      const entries = current.entries.filter(
        ({ location }) => location === null || currentFolderIds.has(location.id),
      );
      if (entries.length === current.entries.length) return FolderViewSettingsStore.noOp();
      return FolderViewSettingsStore.commit({ ...current, entries }, true, context);
    });
  }
}

export type {
  FolderViewSettingsStoreCommittedResult,
  FolderViewSettingsStoreNoOpResult,
  FolderViewSettingsStorePersistenceFailure,
  FolderViewSettingsStoreRejectedResult,
  FolderViewSettingsStoreRejectionReason,
  FolderViewSettingsStoreResult,
} from "./operationResult/index.js";
