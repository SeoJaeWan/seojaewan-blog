import {
  type ContentResourceRef,
  type FolderResourceRef,
  parseResourceRef,
  type ResourceLookup,
  type ResourceRef,
} from "../resources/index.js";
import type { IdGenerator } from "./idGenerator.js";
import type { WorkspaceState } from "./model.js";
import {
  createFolder as createFolderOperation,
  moveResource as moveResourceOperation,
  renameFolder as renameFolderOperation,
  type WorkspaceOperationFailureReason,
  type WorkspaceOperationResult,
} from "./operations.js";
import { reconcileWorkspace } from "./reconcileWorkspace.js";
import type { WorkspaceStorage } from "./workspaceStorage.js";

export type WorkspaceStoreInitialization = Readonly<{
  storage: WorkspaceStorage;
  seed: WorkspaceState;
  currentContent: readonly ContentResourceRef[];
  resourceLookup: ResourceLookup;
  idGenerator: IdGenerator;
}>;

export type WorkspaceStorePersistenceFailure = Readonly<{
  ok: false;
  reason: "storage-write-failed";
  committed: true;
  value: WorkspaceState;
}>;

export type WorkspaceStoreResult = WorkspaceOperationResult | WorkspaceStorePersistenceFailure;

export class WorkspaceStoreNotInitializedError extends Error {
  constructor() {
    super("WorkspaceStore must be initialized before it can be read or changed");
    this.name = "WorkspaceStoreNotInitializedError";
  }
}

export class WorkspaceStoreAlreadyInitializedError extends Error {
  constructor() {
    super("WorkspaceStore dependencies are already bound for this runtime");
    this.name = "WorkspaceStoreAlreadyInitializedError";
  }
}

type Listener = () => void;

let initialization: WorkspaceStoreInitialization | null = null;
let initializationPromise: Promise<WorkspaceStoreResult> | null = null;
let snapshot: WorkspaceState | null = null;
let commandQueue: Promise<void> = Promise.resolve();
const listeners = new Set<Listener>();

const hasOnlyKeys = (record: Record<string, unknown>, expected: readonly string[]): boolean => {
  const keys = Object.keys(record);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Workspace snapshot members must be objects");
  }

  return value as Record<string, unknown>;
};

const parseFolderRef = (value: unknown): FolderResourceRef => {
  const ref = parseResourceRef(value);
  if (ref.kind !== "folder") {
    throw new TypeError("Workspace folder references must have kind folder");
  }

  return ref;
};

const parseWorkspaceState = (value: unknown): WorkspaceState => {
  const record = asRecord(value);
  if (
    !hasOnlyKeys(record, ["schemaVersion", "contentInbox", "folders", "placements"]) ||
    record.schemaVersion !== 1 ||
    !Array.isArray(record.folders) ||
    !Array.isArray(record.placements)
  ) {
    throw new TypeError("Workspace snapshot does not match schema version 1");
  }

  const contentInbox = parseFolderRef(record.contentInbox);
  const folders = record.folders.map((value) => {
    const folder = asRecord(value);
    if (!hasOnlyKeys(folder, ["ref", "name"]) || typeof folder.name !== "string") {
      throw new TypeError("Workspace folders must contain only ref and name");
    }

    return { ref: parseFolderRef(folder.ref), name: folder.name };
  });
  const placements = record.placements.map((value) => {
    const placement = asRecord(value);
    if (!hasOnlyKeys(placement, ["resource", "parent"])) {
      throw new TypeError("Workspace placements must contain only resource and parent");
    }

    return {
      resource: parseResourceRef(placement.resource),
      parent: placement.parent === null ? null : parseFolderRef(placement.parent),
    };
  });

  return { schemaVersion: 1, contentInbox, folders, placements };
};

const freezeRef = <Ref extends ResourceRef>(ref: Ref): Ref => Object.freeze({ ...ref });

const freezeWorkspaceState = (state: WorkspaceState): WorkspaceState => {
  const contentInbox = freezeRef(state.contentInbox);
  const folders = Object.freeze(
    state.folders.map((folder) => Object.freeze({ ref: freezeRef(folder.ref), name: folder.name })),
  );
  const placements = Object.freeze(
    state.placements.map((placement) =>
      Object.freeze({
        resource: freezeRef(placement.resource),
        parent: placement.parent === null ? null : freezeRef(placement.parent),
      }),
    ),
  );

  return Object.freeze({ schemaVersion: 1, contentInbox, folders, placements });
};

const sameInitialization = (
  left: WorkspaceStoreInitialization,
  right: WorkspaceStoreInitialization,
): boolean =>
  left.storage === right.storage &&
  left.seed === right.seed &&
  left.currentContent === right.currentContent &&
  left.resourceLookup === right.resourceLookup &&
  left.idGenerator === right.idGenerator;

const notify = (): void => {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error) {
      // One consumer must not prevent the remaining consumers or persistence.
      void error;
    }
  }
};

const requireInitialization = (): WorkspaceStoreInitialization => {
  if (initialization === null) {
    throw new WorkspaceStoreNotInitializedError();
  }

  return initialization;
};

const persistCommittedSnapshot = async (
  nextSnapshot: WorkspaceState,
): Promise<WorkspaceStoreResult> => {
  try {
    await requireInitialization().storage.save(nextSnapshot);
    return { ok: true, value: nextSnapshot };
  } catch {
    return {
      ok: false,
      reason: "storage-write-failed",
      committed: true,
      value: nextSnapshot,
    };
  }
};

const commit = async (nextState: WorkspaceState): Promise<WorkspaceStoreResult> => {
  const nextSnapshot = freezeWorkspaceState(nextState);
  snapshot = nextSnapshot;
  notify();
  return persistCommittedSnapshot(nextSnapshot);
};

const requireSnapshot = (): WorkspaceState => {
  if (snapshot === null) {
    throw new WorkspaceStoreNotInitializedError();
  }

  return snapshot;
};

const enqueueCommand = (
  command: () => Promise<WorkspaceStoreResult>,
): Promise<WorkspaceStoreResult> => {
  const result = commandQueue.then(command, command);
  commandQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const runOperation = (
  operation: (state: WorkspaceState) => WorkspaceOperationResult,
): Promise<WorkspaceStoreResult> => {
  requireSnapshot();

  return enqueueCommand(async () => {
    const result = operation(requireSnapshot());
    if (!result.ok) {
      return result;
    }

    return commit(result.value);
  });
};

export class WorkspaceStore {
  private constructor() {}

  /**
   * Binds runtime dependencies once. Repeating the exact initialization is
   * idempotent; attempting to replace any dependency is rejected.
   */
  static initialize(
    nextInitialization: WorkspaceStoreInitialization,
  ): Promise<WorkspaceStoreResult> {
    if (initialization !== null) {
      if (!sameInitialization(initialization, nextInitialization)) {
        return Promise.reject(new WorkspaceStoreAlreadyInitializedError());
      }

      if (initializationPromise !== null) {
        return initializationPromise;
      }

      return Promise.resolve({ ok: true, value: requireSnapshot() });
    }

    initialization = nextInitialization;
    initializationPromise = (async () => {
      let restored: WorkspaceState;

      try {
        const saved = await nextInitialization.storage.load();
        restored =
          saved === null
            ? parseWorkspaceState(nextInitialization.seed)
            : parseWorkspaceState(saved);
      } catch {
        restored = parseWorkspaceState(nextInitialization.seed);
      }

      const reconciled = reconcileWorkspace({
        state: restored,
        currentContent: nextInitialization.currentContent,
        resourceLookup: nextInitialization.resourceLookup,
        idGenerator: nextInitialization.idGenerator,
      });

      return commit(reconciled);
    })();

    return initializationPromise;
  }

  static getSnapshot(): WorkspaceState {
    return requireSnapshot();
  }

  static subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  static createFolder(
    name: string,
    parent: FolderResourceRef | null,
  ): Promise<WorkspaceStoreResult> {
    return runOperation((state) =>
      createFolderOperation(state, name, parent, requireInitialization().idGenerator),
    );
  }

  static renameFolder(folder: FolderResourceRef, name: string): Promise<WorkspaceStoreResult> {
    return runOperation((state) => renameFolderOperation(state, folder, name));
  }

  static moveResource(
    resource: ResourceRef,
    parent: FolderResourceRef | null,
  ): Promise<WorkspaceStoreResult> {
    return runOperation((state) => moveResourceOperation(state, resource, parent));
  }
}

export type { WorkspaceOperationFailureReason };
