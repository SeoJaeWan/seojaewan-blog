/**
 * @file Workspace snapshot의 초기화, command 직렬화, 구독과 저장을 조율한다.
 *
 * 브라우저 runtime의 현재 상태와 변경 규칙을 소유하며, 저장 매체는 Application adapter가 제공한다.
 */
import {
  assertUniqueResourceIds,
  type ContentCatalogReader,
  type ExternalShortcutCatalogReader,
  type FolderResourceRef,
  parseResourceRef,
  type ResourceId,
  type ResourceRef,
} from "../../resources/index.js";
import { IdGenerator } from "../idGenerator/index.js";
import type { WorkspaceState } from "../model/index.js";
import type {
  WorkspaceOperationFailureReason,
  WorkspaceOperationResult,
} from "./operationResult/index.js";
import { reconcileWorkspace } from "./reconcileWorkspace/index.js";
import type { WorkspaceStorage } from "./workspaceStorage/index.js";

/**
 * `WorkspaceStore` runtime을 최초로 결합하는 데 필요한 snapshot과 infrastructure port다.
 *
 * Application이 storage와 정적 Catalog를 한 번 연결한다. FolderCatalog는 초기화된 Store를
 * 읽으므로 입력에 포함하지 않으며, Content 목록은 contentCatalog에서 파생한다.
 */
export type WorkspaceStoreInitialization = Readonly<{
  storage: WorkspaceStorage;
  seed: WorkspaceState;
  contentCatalog: ContentCatalogReader;
  externalShortcutCatalog: ExternalShortcutCatalogReader;
}>;

/**
 * semantic commit 이후 Workspace snapshot 저장에 실패한 결과를 나타낸다.
 *
 * commit rollback을 의미하지 않으며, caller는 `committed: true`와 `value`로 현재 메모리 상태를 확인한다.
 */
export type WorkspaceStorePersistenceFailure = Readonly<{
  ok: false;
  reason: "storage-write-failed";
  committed: true;
  value: WorkspaceState;
}>;

/**
 * Workspace command의 상태 계산 결과와 persistence 실패 결과를 통합한다.
 *
 * UI presentation 완료는 포함하지 않으며, 이 type은 Workspace semantic commit 경계만 나타낸다.
 */
export type WorkspaceStoreResult = WorkspaceOperationResult | WorkspaceStorePersistenceFailure;

/**
 * 초기화 시작 전 명령을 요청하거나 아직 생성되지 않은 snapshot에 접근했을 때 발생한다.
 *
 * 초기화 중 명령은 대기하지만 snapshot 생성에 실패하면 실행 시 이 오류로 거부한다.
 * 원래 초기화 실패 원인은 initialize Promise에서 확인한다.
 */
export class WorkspaceStoreNotInitializedError extends Error {
  /**
   * 초기화가 필요한 접근에 사용할 lifecycle 오류를 만든다.
   *
   * 초기화를 대신 실행하지 않는다.
   */
  constructor() {
    super("WorkspaceStore를 읽거나 변경하기 전에 초기화해야 합니다");
    this.name = "WorkspaceStoreNotInitializedError";
  }
}

/**
 * 이미 결합된 `WorkspaceStore`에 다른 runtime dependency를 다시 주입할 때 발생한다.
 *
 * 동일 dependency를 사용한 반복 초기화는 허용하며, runtime 교체는 별도 lifecycle에서 처리해야 한다.
 */
export class WorkspaceStoreAlreadyInitializedError extends Error {
  /**
   * 기존 runtime dependency의 교체를 거부하는 오류를 만든다.
   *
   * 이미 결합된 dependency와 snapshot은 변경하지 않는다.
   */
  constructor() {
    super("현재 runtime에는 WorkspaceStore dependency가 이미 연결되어 있습니다");
    this.name = "WorkspaceStoreAlreadyInitializedError";
  }
}

type Listener = () => void;

/**
 * 객체의 열거 가능한 자체 문자열 key가 기대한 목록과 정확히 일치하는지 확인한다.
 *
 * 필드 값은 검사하지 않으며, 저장 schema에 누락되거나 추가된 필드를 거부하는 데 사용한다.
 */
const hasOnlyKeys = (record: Record<string, unknown>, expected: readonly string[]): boolean => {
  const keys = Object.keys(record);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
};

/**
 * null과 배열을 제외한 객체를 필드 검사용 record로 좁힌다.
 *
 * 개별 필드의 schema는 검사하지 않으며, 객체가 아닌 입력에는 TypeError를 던진다.
 */
const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Workspace snapshot의 각 항목은 객체여야 합니다");
  }

  return value as Record<string, unknown>;
};

/**
 * 외부 참조의 구조와 UUID를 검증한 뒤 folder kind로 좁힌다.
 *
 * Folder의 실제 존재 여부는 확인하지 않으며, 다른 kind에는 TypeError를 던진다.
 */
const parseFolderRef = (value: unknown): FolderResourceRef => {
  const ref = parseResourceRef(value);
  if (ref.kind !== "folder") {
    throw new TypeError("Workspace의 Folder 참조는 kind가 folder여야 합니다");
  }

  return ref;
};

/**
 * 저장값의 schema version 1 구조와 각 참조를 검증해 후보 snapshot을 복원한다.
 *
 * 중복 배치, 없는 parent와 순환 같은 의미적 손상은 후속 reconcile에서 처리한다.
 */
const parseWorkspaceState = (value: unknown): WorkspaceState => {
  const record = asRecord(value);
  if (
    !hasOnlyKeys(record, ["schemaVersion", "contentInbox", "folders", "placements"]) ||
    record.schemaVersion !== 1 ||
    !Array.isArray(record.folders) ||
    !Array.isArray(record.placements)
  ) {
    throw new TypeError("Workspace snapshot이 schema version 1과 일치하지 않습니다");
  }

  const contentInbox = parseFolderRef(record.contentInbox);
  const folders = record.folders.map((value) => {
    const folder = asRecord(value);
    if (!hasOnlyKeys(folder, ["ref", "name"]) || typeof folder.name !== "string") {
      throw new TypeError("Workspace Folder에는 ref와 name만 포함되어야 합니다");
    }

    return { ref: parseFolderRef(folder.ref), name: folder.name };
  });
  const placements = record.placements.map((value) => {
    const placement = asRecord(value);
    if (!hasOnlyKeys(placement, ["resource", "parent"])) {
      throw new TypeError("Workspace placement에는 resource와 parent만 포함되어야 합니다");
    }

    return {
      resource: parseResourceRef(placement.resource),
      parent: placement.parent === null ? null : parseFolderRef(placement.parent),
    };
  });

  return { schemaVersion: 1, contentInbox, folders, placements };
};

/**
 * 원본 참조를 변경하지 않고 복제한 ref를 동결한다.
 *
 * 현재 ref는 primitive 필드만 가지므로 중첩 동결은 필요하지 않다.
 */
const freezeRef = <Ref extends ResourceRef>(ref: Ref): Ref => Object.freeze({ ...ref });

/**
 * 현재 schema의 객체·배열·참조를 복제하고 동결해 외부 변경으로부터 commit을 보호한다.
 *
 * 입력 객체는 동결하지 않으며, schema 검증과 배치 복구는 호출 전에 완료해야 한다.
 */
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

/**
 * 초기화 dependency 네 항목이 각각 같은 객체 참조인지 비교한다.
 *
 * 내용이 같아도 새 객체이면 다른 결합으로 취급하며, 깊은 동등성은 검사하지 않는다.
 */
const sameInitialization = (
  left: WorkspaceStoreInitialization,
  right: WorkspaceStoreInitialization,
): boolean =>
  left.storage === right.storage &&
  left.seed === right.seed &&
  left.contentCatalog === right.contentCatalog &&
  left.externalShortcutCatalog === right.externalShortcutCatalog;

/**
 * Workspace snapshot, 구독과 mutation command를 제공하는 정적 runtime facade다.
 *
 * Application은 브라우저에서 한 번 초기화한다. Next.js 등의 서버 렌더링에서는
 * 사용자별 상태를 서버 요청 간 공유하지 않도록 이 singleton을 초기화하지 않는다.
 */
export class WorkspaceStore {
  private static initialization: WorkspaceStoreInitialization | null = null;
  private static initializationPromise: Promise<WorkspaceStoreResult> | null = null;
  private static snapshot: WorkspaceState | null = null;
  private static commandQueue: Promise<void> = Promise.resolve();
  private static readonly listeners = new Set<Listener>();

  /**
   * instance 생성을 막고 브라우저 runtime의 단일 정적 상태를 사용하게 한다.
   */
  private constructor() {}

  /**
   * 현재 구독자 목록을 복사해 commit 알림을 순서대로 전달한다.
   *
   * 한 구독자가 던진 오류는 격리하여 나머지 알림과 이후 저장을 계속한다.
   */
  private static notify = (): void => {
    for (const listener of [...WorkspaceStore.listeners]) {
      try {
        listener();
      } catch (error) {
        // 한 구독자의 오류가 다른 구독자 알림과 저장을 중단하지 않도록 격리한다.
        void error;
      }
    }
  };

  /**
   * 이미 결합된 초기화 dependency를 반환하고 미결합 상태에서는 오류를 던진다.
   *
   * dependency 결합 여부만 검사하며, 첫 snapshot 생성이나 저장 완료를 보장하지 않는다.
   */
  private static requireInitialization = (): WorkspaceStoreInitialization => {
    if (WorkspaceStore.initialization === null) {
      throw new WorkspaceStoreNotInitializedError();
    }

    return WorkspaceStore.initialization;
  };

  /**
   * 메모리에 반영된 snapshot을 저장하고 persistence 결과를 반환한다.
   *
   * 저장 실패는 committed: true인 결과로 변환하며, 이미 반영한 상태를 되돌리지 않는다.
   */
  private static persistCommittedSnapshot = async (
    nextSnapshot: WorkspaceState,
  ): Promise<WorkspaceStoreResult> => {
    try {
      await WorkspaceStore.requireInitialization().storage.save(nextSnapshot);
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

  /**
   * 검증된 후보를 동결한 뒤 현재 상태에 반영하고 구독 알림과 저장을 수행한다.
   */
  private static commit = async (nextState: WorkspaceState): Promise<WorkspaceStoreResult> => {
    const nextSnapshot = freezeWorkspaceState(nextState);
    WorkspaceStore.snapshot = nextSnapshot;
    WorkspaceStore.notify();
    return WorkspaceStore.persistCommittedSnapshot(nextSnapshot);
  };

  /**
   * 현재 commit된 snapshot을 반환하고 아직 없으면 초기화 오류를 던진다.
   *
   * snapshot 존재만 검사하며, 해당 snapshot의 비동기 저장 완료를 기다리지 않는다.
   */
  private static requireSnapshot = (): WorkspaceState => {
    if (WorkspaceStore.snapshot === null) {
      throw new WorkspaceStoreNotInitializedError();
    }

    return WorkspaceStore.snapshot;
  };

  /**
   * 이전 queue 작업이 끝난 뒤 command를 한 번 실행하고 원래 결과 Promise를 반환한다.
   *
   * then의 두 인자는 성공·실패 분기의 handler이며 둘 중 하나만 실행된다.
   * 내부 queue 꼬리는 성공·실패 모두 undefined로 정규화해 후속 작업을 이어 가지만,
   * 호출자에게 반환하는 result의 결과나 rejection은 변경하지 않는다.
   */
  private static enqueueCommand = (
    command: () => Promise<WorkspaceStoreResult>,
  ): Promise<WorkspaceStoreResult> => {
    const result = WorkspaceStore.commandQueue.then(command, command);
    WorkspaceStore.commandQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  /**
   * 초기화 시작 후 명령을 대기시키고, 실행 시 snapshot을 확인해 성공한 후보만 commit한다.
   */
  private static runOperation = (
    operation: () => WorkspaceOperationResult,
  ): Promise<WorkspaceStoreResult> => {
    WorkspaceStore.requireInitialization();

    return WorkspaceStore.enqueueCommand(async () => {
      WorkspaceStore.requireSnapshot();
      const result = operation();
      if (!result.ok) {
        return result;
      }

      return WorkspaceStore.commit(result.value);
    });
  };

  /**
   * runtime dependency를 한 번 결합하고 저장값을 restore·reconcile해 첫 snapshot을 만든다.
   *
   * 첫 저장까지 명령과 같은 queue에서 처리한다. 진행 중 요청한 명령은 뒤에서 대기하며,
   * snapshot 생성에 실패하면 실행 시 거부된다. 동일 dependency의 재호출은 같은 Promise를 반환한다.
   */
  static initialize(
    nextInitialization: WorkspaceStoreInitialization,
  ): Promise<WorkspaceStoreResult> {
    if (WorkspaceStore.initialization !== null) {
      if (!sameInitialization(WorkspaceStore.initialization, nextInitialization)) {
        return Promise.reject(new WorkspaceStoreAlreadyInitializedError());
      }

      if (WorkspaceStore.initializationPromise !== null) {
        return WorkspaceStore.initializationPromise;
      }

      return Promise.resolve({ ok: true, value: WorkspaceStore.requireSnapshot() });
    }

    const initialization = Object.freeze({ ...nextInitialization });
    WorkspaceStore.initialization = initialization;
    WorkspaceStore.initializationPromise = WorkspaceStore.enqueueCommand(async () => {
      let restored: WorkspaceState;

      try {
        const saved = await initialization.storage.load();
        restored =
          saved === null ? parseWorkspaceState(initialization.seed) : parseWorkspaceState(saved);
      } catch {
        restored = parseWorkspaceState(initialization.seed);
      }

      const { contentCatalog, externalShortcutCatalog } = initialization;
      const staticResources = [...contentCatalog.list(), ...externalShortcutCatalog.list()];
      assertUniqueResourceIds(staticResources);
      const reconciled = reconcileWorkspace({
        state: restored,
        currentContent: contentCatalog.list().map(({ ref }) => ref),
        resourceLookup: {
          /**
           * 복원 중인 Folder는 reconcile이 직접 확인하며 정적 원본만 Catalog에서 조회한다.
           */
          hasResource(ref) {
            switch (ref.kind) {
              case "content":
                return contentCatalog.has(ref.id);
              case "external-shortcut":
                return externalShortcutCatalog.has(ref.id);
              case "folder":
                return false;
            }
          },
        },
      });
      assertUniqueResourceIds([...staticResources, ...reconciled.folders]);

      return WorkspaceStore.commit(reconciled);
    });

    return WorkspaceStore.initializationPromise;
  }

  /**
   * 현재 commit된 immutable Workspace snapshot을 반환한다.
   *
   * 초기화 전에는 사용할 수 없으며, 변경은 `WorkspaceStore`의 command method로 요청한다.
   */
  static getSnapshot(): WorkspaceState {
    return WorkspaceStore.requireSnapshot();
  }

  /**
   * Workspace semantic commit 뒤 호출될 listener를 등록한다.
   *
   * 현재 snapshot을 즉시 전달하지 않으며, 반환된 함수를 호출하면 이후 알림에서 제외된다.
   */
  static subscribe(listener: Listener): () => void {
    WorkspaceStore.listeners.add(listener);
    return () => {
      WorkspaceStore.listeners.delete(listener);
    };
  }

  /**
   * 지정한 parent 아래 새 Folder를 만들고 성공한 snapshot을 저장한다.
   *
   * ID는 내부 공통 `IdGenerator`에서 발급하며, 실패와 no-op에서는 commit하지 않는다.
   */
  static createFolder(
    name: string,
    parent: FolderResourceRef | null,
  ): Promise<WorkspaceStoreResult> {
    return WorkspaceStore.runOperation(() => WorkspaceStore.calculateCreateFolder(name, parent));
  }

  /**
   * Folder identity와 placement를 유지한 채 이름을 변경하고 성공한 snapshot을 저장한다.
   *
   * Folder가 없거나 이름이 같으면 commit과 subscriber 알림을 수행하지 않는다.
   */
  static renameFolder(folder: FolderResourceRef, name: string): Promise<WorkspaceStoreResult> {
    return WorkspaceStore.runOperation(() => WorkspaceStore.calculateRenameFolder(folder, name));
  }

  /**
   * Resource를 Desktop 또는 지정한 Folder로 이동하고 성공한 snapshot을 저장한다.
   *
   * Resource 원본과 Window 상태는 변경하지 않으며, 변경 검증과 후보 상태 계산은 class 내부에서 수행한다.
   */
  static moveResource(
    resource: ResourceRef,
    parent: FolderResourceRef | null,
  ): Promise<WorkspaceStoreResult> {
    return WorkspaceStore.runOperation(() =>
      WorkspaceStore.calculateMoveResource(resource, parent),
    );
  }

  /**
   * 상태를 변경하지 않은 domain 거절 또는 no-op 결과를 만든다.
   */
  private static failure = (reason: WorkspaceOperationFailureReason): WorkspaceOperationResult => ({
    ok: false,
    reason,
  });

  /**
   * 현재 snapshot의 Folder 원본 목록에서 ID 존재 여부를 확인한다.
   */
  private static hasFolder = (id: ResourceId): boolean =>
    WorkspaceStore.requireSnapshot().folders.some((folder) => folder.ref.id === id);

  /**
   * 두 parent가 같은 Folder ID이거나 모두 Desktop(null)인지 비교한다.
   */
  private static sameParent = (
    left: FolderResourceRef | null,
    right: FolderResourceRef | null,
  ): boolean => left?.id === right?.id && (left === null) === (right === null);

  /**
   * 현재 Folder 원본과 placement에 이미 사용된 ID인지 확인한다.
   *
   * 최초 연결한 정적 Catalog도 검사하여 배치되지 않은 원본의 ID 재사용을 막는다.
   */
  private static hasResourceId = (id: ResourceId): boolean =>
    WorkspaceStore.requireSnapshot().folders.some((folder) => folder.ref.id === id) ||
    WorkspaceStore.requireSnapshot().placements.some((placement) => placement.resource.id === id) ||
    WorkspaceStore.requireInitialization().contentCatalog.has(id) ||
    WorkspaceStore.requireInitialization().externalShortcutCatalog.has(id);

  /**
   * 현재 상태에서 Folder와 placement를 함께 추가할 후보 상태를 계산한다.
   */
  private static calculateCreateFolder = (
    name: string,
    parent: FolderResourceRef | null,
  ): WorkspaceOperationResult => {
    const state = WorkspaceStore.requireSnapshot();
    if (parent !== null && !WorkspaceStore.hasFolder(parent.id)) {
      return WorkspaceStore.failure("parent-folder-not-found");
    }

    const id = IdGenerator.generateId();
    if (WorkspaceStore.hasResourceId(id)) {
      return WorkspaceStore.failure("duplicate-resource-id");
    }

    const ref: FolderResourceRef = { kind: "folder", id };

    return {
      ok: true,
      value: {
        ...state,
        folders: [...state.folders, { ref, name }],
        placements: [...state.placements, { resource: ref, parent }],
      },
    };
  };

  /**
   * 현재 Folder의 identity를 보존한 이름 변경 후보를 계산한다.
   */
  private static calculateRenameFolder = (
    folder: FolderResourceRef,
    name: string,
  ): WorkspaceOperationResult => {
    const state = WorkspaceStore.requireSnapshot();
    const folderIndex = state.folders.findIndex(({ ref }) => ref.id === folder.id);
    if (folderIndex === -1) {
      return WorkspaceStore.failure("folder-not-found");
    }

    if (state.folders[folderIndex]?.name === name) {
      return WorkspaceStore.failure("no-op");
    }

    return {
      ok: true,
      value: {
        ...state,
        folders: state.folders.map((current, index) =>
          index === folderIndex ? { ...current, name } : current,
        ),
      },
    };
  };

  /**
   * 이동 후 parent 경로가 자신 또는 이미 방문한 Folder로 돌아오는지 판별한다.
   */
  private static wouldCreateFolderCycle = (
    resource: FolderResourceRef,
    parent: FolderResourceRef,
  ): boolean => {
    const parentByFolderId = new Map<ResourceId, FolderResourceRef | null>();

    for (const placement of WorkspaceStore.requireSnapshot().placements) {
      if (placement.resource.kind === "folder") {
        parentByFolderId.set(placement.resource.id, placement.parent);
      }
    }

    parentByFolderId.set(resource.id, parent);

    const visited = new Set<ResourceId>();
    let cursor: FolderResourceRef | null = parent;

    while (cursor !== null) {
      if (cursor.id === resource.id) {
        return true;
      }

      if (visited.has(cursor.id)) {
        return true;
      }

      visited.add(cursor.id);
      cursor = parentByFolderId.get(cursor.id) ?? null;
    }

    return false;
  };

  /**
   * 현재 배치를 검증하고 Resource 이동 후보를 계산한다.
   */
  private static calculateMoveResource = (
    resource: ResourceRef,
    parent: FolderResourceRef | null,
  ): WorkspaceOperationResult => {
    const state = WorkspaceStore.requireSnapshot();
    const matchingPlacementIndexes = state.placements.flatMap((placement, index) =>
      placement.resource.id === resource.id ? [index] : [],
    );

    if (matchingPlacementIndexes.length === 0) {
      return WorkspaceStore.failure("resource-not-found");
    }

    if (matchingPlacementIndexes.length > 1) {
      return WorkspaceStore.failure("resource-placement-not-unique");
    }

    const placementIndex = matchingPlacementIndexes[0];
    const placement = state.placements[placementIndex];
    if (placement === undefined) {
      return WorkspaceStore.failure("resource-not-found");
    }

    if (placement.resource.kind !== resource.kind) {
      return WorkspaceStore.failure("resource-kind-mismatch");
    }
    const actualResource = placement.resource;
    if (actualResource.kind === "folder" && !WorkspaceStore.hasFolder(actualResource.id)) {
      return WorkspaceStore.failure("resource-not-found");
    }

    if (parent !== null && !WorkspaceStore.hasFolder(parent.id)) {
      return WorkspaceStore.failure("parent-folder-not-found");
    }

    if (WorkspaceStore.sameParent(placement.parent, parent)) {
      return WorkspaceStore.failure("no-op");
    }

    if (actualResource.kind === "folder" && parent?.id === actualResource.id) {
      return WorkspaceStore.failure("self-parent");
    }

    if (
      actualResource.kind === "folder" &&
      parent !== null &&
      WorkspaceStore.wouldCreateFolderCycle(actualResource, parent)
    ) {
      return WorkspaceStore.failure("folder-cycle");
    }

    return {
      ok: true,
      value: {
        ...state,
        placements: state.placements.map((current, index) =>
          index === placementIndex ? { ...current, parent } : current,
        ),
      },
    };
  };
}
