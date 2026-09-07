/**
 * @file Start Pin의 초기화, 정렬 명령, 구독, Resource reconcile과 저장을 조율한다.
 *
 * 브라우저 storage와 Resource 원본은 Application이 제공하며 Window·Taskbar 상태는 소유하지 않는다.
 */
import { parseResourceRef, type ResourceLookup, type ResourceRef } from "../../resources/index.js";
import type {
  StartPinnedItem,
  StartReorderAction,
  StartReorderDestination,
  StartReorderIntent,
  StartSnapshot,
} from "../model/index.js";
import type {
  StartStoreRejectedResult,
  StartStoreRejectionReason,
  StartStoreResult,
} from "./operationResult/index.js";
import type { StartStorage, StartStorageSnapshot } from "./startStorage/index.js";

/**
 * `StartStore`를 브라우저 runtime에서 최초로 결합하는 storage와 Resource 조회 port다.
 *
 * Folder를 포함한 `resourceLookup`은 Workspace 복원이 끝난 뒤 구성해 전달해야 한다.
 */
export type StartStoreInitialization = Readonly<{
  storage: StartStorage;
  resourceLookup: ResourceLookup;
}>;

/**
 * 초기화 시작 전 Start snapshot을 읽거나 명령을 요청했을 때 발생한다.
 *
 * import나 서버 render만으로 초기화를 실행하지 않으며, Application이 브라우저에서 명시적으로 연결한다.
 */
export class StartStoreNotInitializedError extends Error {
  /**
   * 초기화가 필요한 접근에 사용할 lifecycle 오류를 만든다.
   *
   * 초기화를 대신 실행하거나 storage에 접근하지 않는다.
   */
  constructor() {
    super("StartStore를 읽거나 변경하기 전에 초기화해야 합니다");
    this.name = "StartStoreNotInitializedError";
  }
}

/**
 * 이미 결합된 StartStore에 다른 storage 또는 Resource 조회 port를 다시 주입할 때 발생한다.
 *
 * 기존 dependency와 snapshot은 유지하며 runtime 교체는 별도 lifecycle에서 처리해야 한다.
 */
export class StartStoreAlreadyInitializedError extends Error {
  /**
   * 현재 runtime dependency 교체를 거부하는 lifecycle 오류를 만든다.
   *
   * 내용이 같은 새 객체도 다른 결합으로 취급한다.
   */
  constructor() {
    super("현재 runtime에는 StartStore dependency가 이미 연결되어 있습니다");
    this.name = "StartStoreAlreadyInitializedError";
  }
}

type Listener = () => void;

const START_SCHEMA_VERSION = 1;
const START_PIN_LABEL = "시작 화면에 고정";
const START_UNPIN_LABEL = "시작 화면에서 제거";

/**
 * null과 배열을 제외한 객체인지 판별해 저장 schema의 record 검증에 사용한다.
 *
 * 구체 필드와 Resource 형식은 호출자가 별도로 검사한다.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * 객체의 열거 가능한 자체 문자열 key가 기대한 목록과 정확히 일치하는지 확인한다.
 *
 * field 값의 형식과 의미는 검사하지 않는다.
 */
const hasOnlyKeys = (record: Record<string, unknown>, expected: readonly string[]): boolean => {
  const keys = Object.keys(record);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
};

/**
 * 두 ResourceRef가 같은 kind와 UUID identity를 가리키는지 판별한다.
 *
 * Resource metadata와 Workspace placement는 비교하지 않는다.
 */
const sameResource = (left: ResourceRef, right: ResourceRef): boolean =>
  left.kind === right.kind && left.id === right.id;

/**
 * ResourceRef의 kind와 ID를 목록 내부 중복 제거용 문자열 key로 만든다.
 *
 * key는 runtime 계산에만 사용하며 저장 identity나 새 ID로 노출하지 않는다.
 */
const resourceKey = (resource: ResourceRef): string => `${resource.kind}:${resource.id}`;

/**
 * 외부 입력을 엄격한 ResourceRef로 검증하고 새 immutable ref로 복원한다.
 *
 * 잘못된 kind, UUID 또는 추가 field에는 null을 반환하며 Resource 존재 여부는 검사하지 않는다.
 */
const tryParseResourceRef = (value: unknown): ResourceRef | null => {
  try {
    return parseResourceRef(value);
  } catch {
    return null;
  }
};

/**
 * Start snapshot을 새 객체와 배열로 복제하고 재귀적인 public 경계를 동결한다.
 *
 * 입력 객체는 동결하지 않으며 각 ResourceRef에는 primitive field만 존재한다.
 */
const freezeSnapshot = (snapshot: StartSnapshot): StartSnapshot => {
  const pinnedItems = Object.freeze(
    snapshot.pinnedItems.map(({ resource }) =>
      Object.freeze({ resource: Object.freeze({ ...resource }) }),
    ),
  );
  return Object.freeze({ pinnedItems });
};

/**
 * immutable Start snapshot을 metadata 없는 schema version 1 저장값으로 투영한다.
 *
 * 저장 adapter가 받은 객체를 바꾸지 못하도록 배열과 ref도 새로 복제해 동결한다.
 */
const toStorageSnapshot = (snapshot: StartSnapshot): StartStorageSnapshot =>
  Object.freeze({
    schemaVersion: START_SCHEMA_VERSION,
    resources: Object.freeze(
      snapshot.pinnedItems.map(({ resource }) => Object.freeze({ ...resource })),
    ),
  });

/**
 * 두 Start snapshot의 Resource identity와 순서가 같은지 판별한다.
 *
 * 객체 reference나 Catalog metadata는 비교하지 않는다.
 */
const sameSnapshot = (left: StartSnapshot, right: StartSnapshot): boolean =>
  left.pinnedItems.length === right.pinnedItems.length &&
  left.pinnedItems.every((item, index) => {
    const other = right.pinnedItems[index];
    return other !== undefined && sameResource(item.resource, other.resource);
  });

/**
 * schema version 1 저장값에서 유효하고 현재 존재하는 ResourceRef만 첫 등장 순서로 복원한다.
 *
 * 전체 schema가 해석 불가능하면 null을 반환하고, 개별 malformed·missing·duplicate 항목은 제거한다.
 * ResourceLookup이 던진 Catalog 오류는 복구값으로 숨기지 않고 호출자에게 전파한다.
 */
const restoreSnapshot = (value: unknown, resourceLookup: ResourceLookup): StartSnapshot | null => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["schemaVersion", "resources"]) ||
    value.schemaVersion !== START_SCHEMA_VERSION ||
    !Array.isArray(value.resources)
  ) {
    return null;
  }

  const seen = new Set<string>();
  const pinnedItems: StartPinnedItem[] = [];

  for (const candidate of value.resources) {
    const resource = tryParseResourceRef(candidate);
    if (resource === null || !resourceLookup.hasResource(resource)) {
      continue;
    }

    const key = resourceKey(resource);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    pinnedItems.push({ resource });
  }

  return freezeSnapshot({ pinnedItems });
};

/**
 * 현재 Start 최초 seed인 빈 immutable Pin 목록을 새 snapshot으로 만든다.
 *
 * 저장된 정상 빈 목록과 형식 오류 복구가 같은 값이어도 각각의 복원 경계 의미는 유지된다.
 */
const createSeedSnapshot = (): StartSnapshot => freezeSnapshot({ pinnedItems: [] });

/**
 * 같은 storage와 ResourceLookup 객체를 다시 전달한 초기화인지 판별한다.
 *
 * 내용이 같은 새 객체는 다른 runtime 결합으로 취급한다.
 */
const sameInitialization = (
  left: StartStoreInitialization,
  right: StartStoreInitialization,
): boolean => left.storage === right.storage && left.resourceLookup === right.resourceLookup;

/**
 * 외부 입력이 0 이상의 정수 index 하나만 가진 drag reorder destination인지 판별한다.
 *
 * 현재 목록 길이에 따른 상한은 실제 명령 시점의 최신 snapshot에서 별도로 검사한다.
 */
const isReorderDestination = (value: unknown): value is StartReorderDestination =>
  isRecord(value) &&
  hasOnlyKeys(value, ["type", "index"]) &&
  value.type === "index" &&
  typeof value.index === "number" &&
  Number.isInteger(value.index) &&
  value.index >= 0;

/**
 * Start Resource Pin의 immutable snapshot, 정적 명령, 구독과 persistence를 제공한다.
 *
 * Application은 Workspace 복원 후 브라우저에서 한 번 초기화하며, 서버 요청별 사용자 상태로
 * 이 singleton을 공유하지 않는다. 저장 실패 결과는 UI 알림을 요구하지 않는다.
 */
export class StartStore {
  private static initialization: StartStoreInitialization | null = null;
  private static initializationPromise: Promise<StartStoreResult> | null = null;
  private static snapshot: StartSnapshot | null = null;
  private static commandQueue: Promise<void> = Promise.resolve();
  private static readonly listeners = new Set<Listener>();

  /**
   * instance 생성을 막고 브라우저 runtime의 단일 정적 상태를 사용하게 한다.
   */
  private constructor() {}

  /**
   * 이미 결합된 runtime dependency를 반환하고 미결합 상태에서는 lifecycle 오류를 던진다.
   *
   * snapshot 생성이나 저장 완료 여부는 검사하지 않는다.
   */
  private static requireInitialization = (): StartStoreInitialization => {
    if (StartStore.initialization === null) {
      throw new StartStoreNotInitializedError();
    }

    return StartStore.initialization;
  };

  /**
   * 현재 commit된 snapshot을 반환하고 아직 생성되지 않았으면 lifecycle 오류를 던진다.
   *
   * 비동기 저장 완료를 기다리지는 않는다.
   */
  private static requireSnapshot = (): StartSnapshot => {
    if (StartStore.snapshot === null) {
      throw new StartStoreNotInitializedError();
    }

    return StartStore.snapshot;
  };

  /**
   * 현재 구독자 목록을 복사해 commit 알림을 순서대로 전달한다.
   *
   * 한 listener가 던진 오류는 격리하여 나머지 알림과 저장을 계속한다.
   */
  private static notify = (): void => {
    for (const listener of [...StartStore.listeners]) {
      try {
        listener();
      } catch (error) {
        // 한 listener 오류가 다른 listener와 persistence를 막지 않도록 격리한다.
        void error;
      }
    }
  };

  /**
   * 이전 queue 작업이 끝난 뒤 command를 한 번 실행하고 원래 결과 Promise를 반환한다.
   *
   * 내부 queue 꼬리는 성공·실패를 undefined로 정규화해 후속 명령을 계속 실행한다.
   */
  private static enqueueCommand = (
    command: () => Promise<StartStoreResult>,
  ): Promise<StartStoreResult> => {
    const result = StartStore.commandQueue.then(command, command);
    StartStore.commandQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  /**
   * 현재 snapshot 전체를 Start 전용 storage port에 저장한다.
   *
   * 실패하면 commit을 유지한 tagged 결과를 반환하고 사용자 알림은 만들지 않는다.
   */
  private static persistCommittedSnapshot = async (
    snapshot: StartSnapshot,
  ): Promise<StartStoreResult> => {
    try {
      await StartStore.requireInitialization().storage.save(toStorageSnapshot(snapshot));
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
   * 검증된 후보를 다시 동결해 메모리에 반영하고 구독 알림 뒤 전체 snapshot을 저장한다.
   *
   * 저장 실패가 발생해도 이미 반영한 snapshot을 rollback하지 않는다.
   */
  private static commit = async (candidate: StartSnapshot): Promise<StartStoreResult> => {
    const snapshot = freezeSnapshot(candidate);
    StartStore.snapshot = snapshot;
    StartStore.notify();
    return StartStore.persistCommittedSnapshot(snapshot);
  };

  /**
   * 저장값을 읽고 공통 복원 규칙으로 정리하며 전체 형식 오류나 load 실패에는 빈 seed를 사용한다.
   *
   * 현재 Resource 존재 여부는 매 호출 시 최초 연결한 ResourceLookup으로 검증한다. Lookup이 던진
   * Catalog 무결성 오류는 seed로 숨기지 않고 초기화 또는 명시적인 재읽기 호출자에게 전파한다.
   */
  private static loadRestoredSnapshot = async (): Promise<StartSnapshot> => {
    const { storage, resourceLookup } = StartStore.requireInitialization();
    let saved: unknown;

    try {
      saved = await storage.load();
    } catch {
      return createSeedSnapshot();
    }

    if (saved === null) {
      return createSeedSnapshot();
    }

    return restoreSnapshot(saved, resourceLookup) ?? createSeedSnapshot();
  };

  /**
   * 상태를 바꾸지 않은 요청에 공통 no-op 결과를 만든다.
   *
   * caller는 실패나 저장 실패와 구분해 아무 후속 부수 효과도 만들지 않을 수 있다.
   */
  private static noOp = (): StartStoreResult => ({ ok: false, reason: "no-op" });

  /**
   * 입력 또는 Catalog 조건으로 명령을 적용할 수 없는 tagged 거절 결과를 만든다.
   *
   * 현재 snapshot과 모든 부수 효과를 유지한다.
   */
  private static rejected = (reason: StartStoreRejectionReason): StartStoreRejectedResult => ({
    ok: false,
    reason,
  });

  /**
   * typed public 입력을 runtime에서 다시 검증하고 immutable ResourceRef 또는 거절 결과로 변환한다.
   *
   * TypeScript를 우회한 잘못된 kind, UUID와 추가 field를 안전하게 거부한다.
   */
  private static parseCommandResource = (
    resource: ResourceRef,
  ): ResourceRef | StartStoreRejectedResult => {
    const parsed = tryParseResourceRef(resource);
    return parsed ?? StartStore.rejected("invalid-resource-ref");
  };

  /**
   * runtime dependency를 한 번 결합하고 저장된 Pin을 복원·reconcile해 첫 snapshot을 만든다.
   *
   * Application은 Workspace와 Catalog 준비 후 브라우저에서 호출해야 한다. load부터 첫 저장까지
   * 명령과 같은 queue에서 처리하며 초기화 중 요청한 명령은 그 뒤에서 최신 snapshot으로 실행된다.
   */
  static initialize(initialization: StartStoreInitialization): Promise<StartStoreResult> {
    if (StartStore.initialization !== null) {
      if (!sameInitialization(StartStore.initialization, initialization)) {
        return Promise.reject(new StartStoreAlreadyInitializedError());
      }

      if (StartStore.initializationPromise !== null) {
        return StartStore.initializationPromise;
      }

      return Promise.resolve({ ok: true, value: StartStore.requireSnapshot() });
    }

    StartStore.initialization = Object.freeze({ ...initialization });
    StartStore.initializationPromise = StartStore.enqueueCommand(async () =>
      StartStore.commit(await StartStore.loadRestoredSnapshot()),
    );
    return StartStore.initializationPromise;
  }

  /**
   * 현재 commit된 immutable Start Pin snapshot을 반환한다.
   *
   * 초기화 전에는 사용할 수 없으며 변경은 Store의 static command로 요청한다.
   */
  static getSnapshot(): StartSnapshot {
    return StartStore.requireSnapshot();
  }

  /**
   * Start semantic commit 뒤 호출될 listener를 등록한다.
   *
   * 현재 snapshot을 즉시 전달하지 않으며 반환한 함수로 이후 알림을 중단한다.
   */
  static subscribe(listener: Listener): () => void {
    StartStore.listeners.add(listener);
    return () => {
      StartStore.listeners.delete(listener);
    };
  }

  /**
   * 저장소의 최신 전체 값을 같은 복원·dedupe·Resource reconcile 규칙으로 다시 반영한다.
   *
   * 현재 identity·순서와 같으면 snapshot, 알림과 save를 만들지 않는다. 변경되면 복원 결과를
   * commit하고 정리된 전체 snapshot을 저장하며, load 또는 전체 형식 오류는 빈 seed로 복구한다.
   */
  static reload(): Promise<StartStoreResult> {
    StartStore.requireInitialization();
    return StartStore.enqueueCommand(async () => {
      const current = StartStore.requireSnapshot();
      const restored = await StartStore.loadRestoredSnapshot();
      return sameSnapshot(current, restored) ? StartStore.noOp() : StartStore.commit(restored);
    });
  }

  /**
   * 현재 Catalog에 더 이상 존재하지 않는 Resource Pin만 제거하고 나머지 순서를 보존한다.
   *
   * Resource 삭제가 없으면 부수 효과 없는 no-op이며, 변경되면 최신 전체 목록을 저장한다.
   */
  static reconcileResources(): Promise<StartStoreResult> {
    StartStore.requireInitialization();
    return StartStore.enqueueCommand(async () => {
      const current = StartStore.requireSnapshot();
      const { resourceLookup } = StartStore.requireInitialization();
      const pinnedItems = current.pinnedItems.filter(({ resource }) =>
        resourceLookup.hasResource(resource),
      );

      if (pinnedItems.length === current.pinnedItems.length) {
        return StartStore.noOp();
      }

      return StartStore.commit({ pinnedItems });
    });
  }

  /**
   * Resource가 현재 Start 목록에 고정됐는지 kind와 UUID identity로 판별한다.
   *
   * Resource 존재 여부를 다시 확인하지 않으며 초기화 전에는 lifecycle 오류를 던진다.
   */
  static isPinned(resource: ResourceRef): boolean {
    const parsed = tryParseResourceRef(resource);
    return (
      parsed !== null &&
      StartStore.requireSnapshot().pinnedItems.some((item) => sameResource(item.resource, parsed))
    );
  }

  /**
   * 현재 Pin 여부에 따라 모든 Resource 종류가 공유하는 Start Context Menu label을 반환한다.
   *
   * Taskbar capability나 label은 계산하지 않는다.
   */
  static getPinLabel(resource: ResourceRef): string {
    return StartStore.isPinned(resource) ? START_UNPIN_LABEL : START_PIN_LABEL;
  }

  /**
   * Resource의 현재 위치에서 실제로 가능한 Start reorder intent를 표시 순서대로 반환한다.
   *
   * 유일 항목이나 고정되지 않은 Resource에는 빈 배열을 반환한다.
   */
  static getReorderActions(resource: ResourceRef): readonly StartReorderAction[] {
    const parsed = tryParseResourceRef(resource);
    if (parsed === null) {
      return Object.freeze([]);
    }

    const items = StartStore.requireSnapshot().pinnedItems;
    const index = items.findIndex((item) => sameResource(item.resource, parsed));
    if (index === -1 || items.length === 1) {
      return Object.freeze([]);
    }

    if (index === 0) {
      return Object.freeze(["right"]);
    }

    if (index === items.length - 1) {
      return Object.freeze(["first", "left"]);
    }

    return Object.freeze(["first", "left", "right"]);
  }

  /**
   * 존재하는 Folder, Content 또는 ExternalShortcut을 Start 목록 끝에 고정한다.
   *
   * 잘못되거나 missing인 ref는 거절하고 중복은 부수 효과 없는 no-op으로 반환한다.
   */
  static pin(resource: ResourceRef): Promise<StartStoreResult> {
    StartStore.requireInitialization();
    return StartStore.enqueueCommand(async () => {
      const parsed = StartStore.parseCommandResource(resource);
      if ("ok" in parsed) {
        return parsed;
      }

      const current = StartStore.requireSnapshot();
      if (current.pinnedItems.some((item) => sameResource(item.resource, parsed))) {
        return StartStore.noOp();
      }

      const { resourceLookup } = StartStore.requireInitialization();
      if (!resourceLookup.hasResource(parsed)) {
        return StartStore.rejected("resource-not-found");
      }

      return StartStore.commit({
        pinnedItems: [...current.pinnedItems, { resource: parsed }],
      });
    });
  }

  /**
   * Start 목록에서 Resource Pin 하나만 제거한다.
   *
   * Workspace, Window, Taskbar와 다른 Resource 원본은 변경하지 않으며 미고정 Resource는 no-op이다.
   */
  static unpin(resource: ResourceRef): Promise<StartStoreResult> {
    StartStore.requireInitialization();
    return StartStore.enqueueCommand(async () => {
      const parsed = StartStore.parseCommandResource(resource);
      if ("ok" in parsed) {
        return parsed;
      }

      const current = StartStore.requireSnapshot();
      const pinnedItems = current.pinnedItems.filter(
        (item) => !sameResource(item.resource, parsed),
      );
      if (pinnedItems.length === current.pinnedItems.length) {
        return StartStore.noOp();
      }

      return StartStore.commit({ pinnedItems });
    });
  }

  /**
   * 고정된 Resource를 첫 위치, 한 칸 왼쪽·오른쪽 또는 drag의 최종 index로 이동한다.
   *
   * 한 intent를 하나의 commit과 save로 처리한다. 현재 위치에서 불가능한 이동과 미고정 Resource는
   * no-op이고 지원하지 않거나 범위를 벗어난 intent는 거절한다.
   */
  static reorder(resource: ResourceRef, intent: StartReorderIntent): Promise<StartStoreResult> {
    StartStore.requireInitialization();
    return StartStore.enqueueCommand(async () => {
      const parsed = StartStore.parseCommandResource(resource);
      if ("ok" in parsed) {
        return parsed;
      }

      if (
        intent !== "first" &&
        intent !== "left" &&
        intent !== "right" &&
        !isReorderDestination(intent)
      ) {
        return StartStore.rejected("invalid-reorder-action");
      }

      const current = StartStore.requireSnapshot();
      const index = current.pinnedItems.findIndex((item) => sameResource(item.resource, parsed));
      if (index === -1) {
        return StartStore.noOp();
      }

      if (isReorderDestination(intent) && intent.index >= current.pinnedItems.length) {
        return StartStore.rejected("invalid-reorder-action");
      }

      const targetIndex = isReorderDestination(intent)
        ? intent.index
        : intent === "first"
          ? 0
          : intent === "left"
            ? Math.max(0, index - 1)
            : Math.min(current.pinnedItems.length - 1, index + 1);
      if (targetIndex === index) {
        return StartStore.noOp();
      }

      const pinnedItems = [...current.pinnedItems];
      const [moved] = pinnedItems.splice(index, 1);
      if (moved === undefined) {
        return StartStore.noOp();
      }
      pinnedItems.splice(targetIndex, 0, moved);

      return StartStore.commit({ pinnedItems });
    });
  }
}
