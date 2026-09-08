import { beforeEach, describe, expect, it, vi } from "vitest";

import { createResourceRef, type ResourceLookup, type ResourceRef } from "../../resources/index.js";
import type { StartStorage, StartStorageSnapshot } from "./startStorage/index.js";

/**
 * 고정 UUID suffix와 Resource kind로 테스트용 immutable ref를 만든다.
 */
const ref = <Kind extends ResourceRef["kind"]>(kind: Kind, suffix: string) =>
  createResourceRef(kind, `00000000-0000-4000-8000-${suffix}`);

const folder = ref("folder", "000000000001");
const content = ref("content", "000000000002");
const shortcut = ref("external-shortcut", "000000000003");
const missing = ref("content", "000000000004");

/**
 * Resource kind와 ID를 mutable fake lookup의 key로 변환한다.
 */
const keyOf = (resource: ResourceRef): string => `${resource.kind}:${resource.id}`;

/**
 * 존재 Resource 집합을 테스트 중 변경할 수 있는 ResourceLookup fake로 만든다.
 */
const lookup = (resources: readonly ResourceRef[] = [folder, content, shortcut]) => {
  const keys = new Set(resources.map(keyOf));
  const resourceLookup: ResourceLookup = {
    /**
     * 현재 fake 집합에 같은 kind와 ID가 있는지 확인한다.
     */
    hasResource(resource) {
      return keys.has(keyOf(resource));
    },
  };
  return { keys, resourceLookup };
};

/**
 * schema version 1의 Start 저장 snapshot을 간단히 만든다.
 */
const saved = (resources: readonly ResourceRef[]): StartStorageSnapshot => ({
  schemaVersion: 1,
  resources,
});

/**
 * load 값과 save 완료 시점을 테스트가 제어할 수 있는 memory storage fake를 만든다.
 */
const storage = (initial: unknown) => {
  let current = initial;
  const fake = {
    load: vi.fn<StartStorage["load"]>(() => Promise.resolve(current)),
    save: vi.fn<StartStorage["save"]>((snapshot) => {
      current = snapshot;
      return Promise.resolve();
    }),
    /**
     * 다음 load가 읽을 외부 저장값을 교체한다.
     */
    replace(next: unknown) {
      current = next;
    },
  };
  return fake;
};

/**
 * 완료와 실패 시점을 테스트가 제어할 수 있는 Promise와 resolver를 만든다.
 */
const deferred = <Value>() => {
  let resolve!: (value: Value | PromiseLike<Value>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

/**
 * 테스트마다 module state가 격리된 StartStore public entry를 동적으로 읽는다.
 */
const loadStore = () => import("./index.js");

/**
 * 기본 ResourceLookup과 storage로 StartStore를 초기화하고 첫 저장 관찰을 비운다.
 */
const initialize = async (initial: unknown = null) => {
  const storeModule = await loadStore();
  const fakeStorage = storage(initial);
  const fakeLookup = lookup();
  await storeModule.StartStore.initialize({
    storage: fakeStorage,
    resourceLookup: fakeLookup.resourceLookup,
  });
  fakeStorage.load.mockClear();
  fakeStorage.save.mockClear();
  return { ...storeModule, fakeStorage, fakeLookup };
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("StartStore", () => {
  describe("initialize", () => {
    it("저장값이 없으면 빈 seed를 immutable snapshot으로 commit하고 저장한다", async () => {
      const storeModule = await loadStore();
      const fakeStorage = storage(null);
      const fakeLookup = lookup();

      const result = await storeModule.StartStore.initialize({
        storage: fakeStorage,
        resourceLookup: fakeLookup.resourceLookup,
      });
      const snapshot = storeModule.StartStore.getSnapshot();

      expect(result).toEqual({ ok: true, value: snapshot });
      expect(snapshot).toEqual({ pinnedItems: [] });
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.pinnedItems)).toBe(true);
      expect(fakeStorage.save).toHaveBeenCalledExactlyOnceWith(saved([]));
    });

    it("정상 저장 빈 배열을 사용자 상태로 그대로 복원한다", async () => {
      const { StartStore, fakeStorage } = await initialize(saved([]));

      expect(StartStore.getSnapshot().pinnedItems).toEqual([]);
      expect(fakeStorage.save).not.toHaveBeenCalled();
    });

    it.each([
      { name: "지원하지 않는 schema", value: { schemaVersion: 2, resources: [folder] } },
      { name: "잘못된 전체 형식", value: { schemaVersion: 1, pins: [folder] } },
      { name: "JSON 손상에 해당하는 scalar", value: "{broken" },
    ])("$name 저장값은 이 목록만 빈 seed로 복구한다", async ({ value }) => {
      const storeModule = await loadStore();
      const fakeStorage = storage(value);
      const fakeLookup = lookup();

      await storeModule.StartStore.initialize({
        storage: fakeStorage,
        resourceLookup: fakeLookup.resourceLookup,
      });

      expect(storeModule.StartStore.getSnapshot()).toEqual({ pinnedItems: [] });
      expect(fakeStorage.save).toHaveBeenCalledExactlyOnceWith(saved([]));
    });

    it("malformed·missing 항목만 제거하고 중복의 첫 등장과 세 Resource 순서를 보존한다", async () => {
      const wrongKind = { kind: "application", id: folder.id };
      const invalidUuid = { kind: "content", id: "not-a-uuid" };
      const storeModule = await loadStore();
      const fakeStorage = storage(
        saved([
          folder,
          content,
          folder,
          wrongKind as unknown as ResourceRef,
          invalidUuid as unknown as ResourceRef,
          missing,
          shortcut,
        ]),
      );
      const fakeLookup = lookup();

      await storeModule.StartStore.initialize({
        storage: fakeStorage,
        resourceLookup: fakeLookup.resourceLookup,
      });

      expect(
        storeModule.StartStore.getSnapshot().pinnedItems.map(({ resource }) => resource),
      ).toEqual([folder, content, shortcut]);
      expect(fakeStorage.save).toHaveBeenCalledExactlyOnceWith(saved([folder, content, shortcut]));
    });

    it("load가 실패하면 빈 seed로 복구하고 queue를 계속 사용한다", async () => {
      const storeModule = await loadStore();
      const fakeStorage = storage(null);
      fakeStorage.load.mockRejectedValueOnce(new Error("read failed"));
      const fakeLookup = lookup();

      await storeModule.StartStore.initialize({
        storage: fakeStorage,
        resourceLookup: fakeLookup.resourceLookup,
      });

      await expect(storeModule.StartStore.pin(folder)).resolves.toMatchObject({ ok: true });
      expect(storeModule.StartStore.isPinned(folder)).toBe(true);
    });

    it("ResourceLookup의 Catalog 무결성 오류는 빈 seed로 숨기지 않는다", async () => {
      const storeModule = await loadStore();
      const fakeStorage = storage(saved([folder]));
      const resourceLookup: ResourceLookup = {
        /**
         * Catalog 자체가 잘못된 상황을 복원 대상 missing 항목과 구분하기 위해 오류를 던진다.
         */
        hasResource() {
          throw new Error("duplicate global ResourceId");
        },
      };

      await expect(
        storeModule.StartStore.initialize({ storage: fakeStorage, resourceLookup }),
      ).rejects.toThrow("duplicate global ResourceId");
      expect(fakeStorage.save).not.toHaveBeenCalled();
    });

    it("초기화 중 명령은 deferred load와 첫 저장 뒤 최신 snapshot에서 실행한다", async () => {
      const storeModule = await loadStore();
      const loadGate = deferred<unknown>();
      const saveGate = deferred<void>();
      const fakeStorage = storage(null);
      fakeStorage.load.mockReturnValueOnce(loadGate.promise);
      fakeStorage.save.mockReturnValueOnce(saveGate.promise);
      const fakeLookup = lookup();

      const initializing = storeModule.StartStore.initialize({
        storage: fakeStorage,
        resourceLookup: fakeLookup.resourceLookup,
      });
      const pinning = storeModule.StartStore.pin(content);
      await Promise.resolve();
      expect(fakeStorage.save).not.toHaveBeenCalled();

      loadGate.resolve(saved([folder]));
      await vi.waitFor(() => expect(fakeStorage.save).toHaveBeenCalledOnce());
      expect(fakeStorage.save.mock.calls[0]?.[0]).toEqual(saved([folder]));
      expect(storeModule.StartStore.getSnapshot().pinnedItems).toHaveLength(1);
      saveGate.resolve();
      await initializing;
      await pinning;

      expect(fakeStorage.save.mock.calls.map(([snapshot]) => snapshot.resources)).toEqual([
        [folder],
        [folder, content],
      ]);
    });

    it("같은 dependency 초기화는 idempotent하고 다른 객체 재결합은 거부한다", async () => {
      const storeModule = await loadStore();
      const fakeStorage = storage(null);
      const fakeLookup = lookup();
      const initialization = {
        storage: fakeStorage,
        resourceLookup: fakeLookup.resourceLookup,
      };

      const first = await storeModule.StartStore.initialize(initialization);
      const second = await storeModule.StartStore.initialize(initialization);

      expect(second).toBe(first);
      expect(fakeStorage.load).toHaveBeenCalledOnce();
      expect(fakeStorage.save).toHaveBeenCalledOnce();
      await expect(
        storeModule.StartStore.initialize({ ...initialization, storage: storage(null) }),
      ).rejects.toBeInstanceOf(storeModule.StartStoreAlreadyInitializedError);
    });

    it("초기화 전 snapshot과 command 접근은 storage나 browser global을 요구하지 않고 거부한다", async () => {
      const storeModule = await loadStore();

      expect(() => storeModule.StartStore.getSnapshot()).toThrow(
        storeModule.StartStoreNotInitializedError,
      );
      expect(() => storeModule.StartStore.pin(folder)).toThrow(
        storeModule.StartStoreNotInitializedError,
      );
    });
  });

  describe("pin과 unpin", () => {
    it("Folder·Content·ExternalShortcut을 순서대로 Pin하고 label을 전환한다", async () => {
      const { StartStore, fakeStorage } = await initialize();

      expect(StartStore.getPinLabel(folder)).toBe("시작 화면에 고정");
      await StartStore.pin(folder);
      await StartStore.pin(content);
      await StartStore.pin(shortcut);

      expect(StartStore.getSnapshot().pinnedItems.map(({ resource }) => resource)).toEqual([
        folder,
        content,
        shortcut,
      ]);
      expect(StartStore.getPinLabel(folder)).toBe("시작 화면에서 제거");
      expect(fakeStorage.save).toHaveBeenCalledTimes(3);
    });

    it("중복 Pin과 미고정 Unpin은 snapshot·알림·save를 만들지 않는다", async () => {
      const { StartStore, fakeStorage } = await initialize(saved([folder]));
      const before = StartStore.getSnapshot();
      const listener = vi.fn();
      StartStore.subscribe(listener);

      await expect(StartStore.pin(folder)).resolves.toEqual({ ok: false, reason: "no-op" });
      await expect(StartStore.unpin(content)).resolves.toEqual({ ok: false, reason: "no-op" });

      expect(StartStore.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
      expect(fakeStorage.save).not.toHaveBeenCalled();
    });

    it.each([
      { name: "지원하지 않는 kind", value: { kind: "application", id: folder.id } },
      { name: "잘못된 UUID", value: { kind: "content", id: "not-a-uuid" } },
    ])("$name 입력은 명시적으로 거절하고 부수 효과를 만들지 않는다", async ({ value }) => {
      const { StartStore, fakeStorage } = await initialize();
      const before = StartStore.getSnapshot();
      const listener = vi.fn();
      StartStore.subscribe(listener);

      await expect(StartStore.pin(value as ResourceRef)).resolves.toEqual({
        ok: false,
        reason: "invalid-resource-ref",
      });

      expect(StartStore.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
      expect(fakeStorage.save).not.toHaveBeenCalled();
    });

    it("현재 Catalog에 없는 ref Pin은 거절하고 부수 효과를 만들지 않는다", async () => {
      const { StartStore, fakeStorage } = await initialize();
      const before = StartStore.getSnapshot();
      const listener = vi.fn();
      StartStore.subscribe(listener);

      await expect(StartStore.pin(missing)).resolves.toEqual({
        ok: false,
        reason: "resource-not-found",
      });

      expect(StartStore.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
      expect(fakeStorage.save).not.toHaveBeenCalled();
    });

    it("Unpin은 다른 Pin 순서와 외부 Workspace·Window 표본을 변경하지 않는다", async () => {
      const { StartStore } = await initialize(saved([folder, content, shortcut]));
      const workspace = Object.freeze({ folderName: "Blog", parent: null });
      const windows = Object.freeze([{ id: "window-1", active: true }]);

      await StartStore.unpin(content);

      expect(StartStore.getSnapshot().pinnedItems.map(({ resource }) => resource)).toEqual([
        folder,
        shortcut,
      ]);
      expect(workspace).toEqual({ folderName: "Blog", parent: null });
      expect(windows).toEqual([{ id: "window-1", active: true }]);
    });

    it("Folder 이름·placement와 Content metadata 변화는 identity와 순서를 바꾸지 않는다", async () => {
      const { StartStore } = await initialize(saved([folder, content]));
      const before = StartStore.getSnapshot();
      const changedCatalogData = {
        folder: { ref: folder, name: "Writing", parent: null },
        content: { ref: content, title: "새 제목", summary: "변경됨" },
      };

      expect(changedCatalogData.folder.ref).toEqual(folder);
      expect(changedCatalogData.content.ref).toEqual(content);
      expect(StartStore.getSnapshot()).toBe(before);
      expect(StartStore.getSnapshot().pinnedItems.map(({ resource }) => resource)).toEqual([
        folder,
        content,
      ]);
    });
  });

  describe("reorder", () => {
    it("유일·첫·중간·마지막 항목에 현재 위치에서 가능한 이동 목록을 반환한다", async () => {
      const single = await initialize(saved([folder]));
      expect(single.StartStore.getReorderActions(folder)).toEqual([]);

      vi.resetModules();
      const multiple = await initialize(saved([folder, content, shortcut]));
      expect(multiple.StartStore.getReorderActions(folder)).toEqual(["right"]);
      expect(multiple.StartStore.getReorderActions(content)).toEqual(["first", "left", "right"]);
      expect(multiple.StartStore.getReorderActions(shortcut)).toEqual(["first", "left"]);
      expect(multiple.StartStore.getReorderActions(missing)).toEqual([]);
    });

    it("첫번째·왼쪽·오른쪽 이동을 순서대로 적용하고 매번 전체 snapshot을 저장한다", async () => {
      const { StartStore, fakeStorage } = await initialize(saved([folder, content, shortcut]));

      await StartStore.reorder(content, "first");
      await StartStore.reorder(content, "right");
      await StartStore.reorder(content, "right");

      expect(fakeStorage.save.mock.calls.map(([snapshot]) => snapshot.resources)).toEqual([
        [content, folder, shortcut],
        [folder, content, shortcut],
        [folder, shortcut, content],
      ]);
    });

    it("drag 최종 index 이동을 하나의 atomic commit과 전체 snapshot save로 적용한다", async () => {
      const { StartStore, fakeStorage } = await initialize(saved([folder, content, shortcut]));
      const listener = vi.fn();
      StartStore.subscribe(listener);

      await StartStore.reorder(folder, { type: "index", index: 2 });

      expect(StartStore.getSnapshot().pinnedItems.map(({ resource }) => resource)).toEqual([
        content,
        shortcut,
        folder,
      ]);
      expect(listener).toHaveBeenCalledOnce();
      expect(fakeStorage.save).toHaveBeenCalledExactlyOnceWith(saved([content, shortcut, folder]));
    });

    it("경계 이동·미고정 항목·유일 항목 이동은 no-op이고 잘못된 action은 거절한다", async () => {
      const { StartStore, fakeStorage } = await initialize(saved([folder]));
      const before = StartStore.getSnapshot();
      const listener = vi.fn();
      StartStore.subscribe(listener);

      await expect(StartStore.reorder(folder, "first")).resolves.toEqual({
        ok: false,
        reason: "no-op",
      });
      await expect(StartStore.reorder(missing, "left")).resolves.toEqual({
        ok: false,
        reason: "no-op",
      });
      await expect(StartStore.reorder(folder, "up" as "left")).resolves.toEqual({
        ok: false,
        reason: "invalid-reorder-action",
      });
      await expect(StartStore.reorder(folder, { type: "index", index: 1 })).resolves.toEqual({
        ok: false,
        reason: "invalid-reorder-action",
      });

      expect(StartStore.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
      expect(fakeStorage.save).not.toHaveBeenCalled();
    });
  });

  describe("persistence queue와 reconcile", () => {
    it("save 실패 뒤 commit을 유지하고 다음 변경은 최신 전체 snapshot을 저장한다", async () => {
      const { StartStore, fakeStorage } = await initialize();
      fakeStorage.save.mockRejectedValueOnce(new Error("quota"));

      const failed = await StartStore.pin(folder);
      const succeeded = await StartStore.pin(content);

      expect(failed).toMatchObject({
        ok: false,
        reason: "storage-write-failed",
        committed: true,
      });
      expect("value" in failed ? failed.value : null).toEqual({
        pinnedItems: [{ resource: folder }],
      });
      expect(succeeded).toMatchObject({ ok: true });
      expect(fakeStorage.save.mock.calls[1]?.[0]).toEqual(saved([folder, content]));
      expect(StartStore.getSnapshot().pinnedItems.map(({ resource }) => resource)).toEqual([
        folder,
        content,
      ]);
    });

    it("느린 save 중 후속 명령을 직렬화해 오래된 snapshot 저장을 막는다", async () => {
      const { StartStore, fakeStorage } = await initialize();
      const saveGate = deferred<void>();
      fakeStorage.save.mockReturnValueOnce(saveGate.promise);

      const first = StartStore.pin(folder);
      const second = StartStore.pin(content);
      await vi.waitFor(() => expect(fakeStorage.save).toHaveBeenCalledOnce());
      expect(StartStore.getSnapshot().pinnedItems).toEqual([{ resource: folder }]);
      expect(fakeStorage.save.mock.calls[0]?.[0]).toEqual(saved([folder]));

      saveGate.resolve();
      await first;
      await second;

      expect(fakeStorage.save.mock.calls.map(([snapshot]) => snapshot.resources)).toEqual([
        [folder],
        [folder, content],
      ]);
    });

    it("listener 재진입 명령은 현재 save 뒤에서 실행되어 queue를 교착시키지 않는다", async () => {
      const { StartStore, fakeStorage } = await initialize();
      const reentrant = deferred<unknown>();
      const unsubscribe = StartStore.subscribe(() => {
        if (StartStore.isPinned(folder) && !StartStore.isPinned(content)) {
          StartStore.pin(content).then(reentrant.resolve, reentrant.reject);
        }
      });

      await StartStore.pin(folder);
      await reentrant.promise;

      expect(StartStore.getSnapshot().pinnedItems.map(({ resource }) => resource)).toEqual([
        folder,
        content,
      ]);
      expect(fakeStorage.save.mock.calls.map(([snapshot]) => snapshot.resources)).toEqual([
        [folder],
        [folder, content],
      ]);
      unsubscribe();
    });

    it("reload는 최신 저장값에 같은 부분 복구 규칙을 적용하고 바뀐 결과만 알리고 저장한다", async () => {
      const { StartStore, fakeStorage } = await initialize(saved([folder]));
      const listener = vi.fn();
      StartStore.subscribe(listener);
      fakeStorage.replace(saved([shortcut, missing, shortcut, content]));

      await StartStore.reload();

      expect(StartStore.getSnapshot().pinnedItems.map(({ resource }) => resource)).toEqual([
        shortcut,
        content,
      ]);
      expect(listener).toHaveBeenCalledOnce();
      expect(fakeStorage.save).toHaveBeenCalledExactlyOnceWith(saved([shortcut, content]));

      fakeStorage.replace(saved([shortcut, content]));
      listener.mockClear();
      fakeStorage.save.mockClear();
      await expect(StartStore.reload()).resolves.toEqual({ ok: false, reason: "no-op" });
      expect(listener).not.toHaveBeenCalled();
      expect(fakeStorage.save).not.toHaveBeenCalled();
    });

    it("reconcileResources는 삭제된 Resource만 제거하고 남은 identity·순서를 보존한다", async () => {
      const { StartStore, fakeStorage, fakeLookup } = await initialize(
        saved([folder, content, shortcut]),
      );
      fakeLookup.keys.delete(keyOf(content));

      await StartStore.reconcileResources();

      expect(StartStore.getSnapshot().pinnedItems.map(({ resource }) => resource)).toEqual([
        folder,
        shortcut,
      ]);
      expect(fakeStorage.save).toHaveBeenCalledExactlyOnceWith(saved([folder, shortcut]));

      fakeStorage.save.mockClear();
      await expect(StartStore.reconcileResources()).resolves.toEqual({
        ok: false,
        reason: "no-op",
      });
      expect(fakeStorage.save).not.toHaveBeenCalled();
    });
  });

  describe("subscribe", () => {
    it("unsubscribe 뒤에는 알리지 않고 commit된 item과 ref를 모두 immutable하게 유지한다", async () => {
      const { StartStore } = await initialize();
      const listener = vi.fn();
      const unsubscribe = StartStore.subscribe(listener);
      unsubscribe();

      await StartStore.pin(folder);
      const snapshot = StartStore.getSnapshot();

      expect(listener).not.toHaveBeenCalled();
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.pinnedItems)).toBe(true);
      expect(Object.isFrozen(snapshot.pinnedItems[0])).toBe(true);
      expect(Object.isFrozen(snapshot.pinnedItems[0]?.resource)).toBe(true);
    });
  });

  describe("command context", () => {
    it("commit을 subscriber와 저장보다 먼저 알리고 명령 Promise는 저장을 기다린다", async () => {
      const { StartStore, fakeStorage } = await initialize();
      const gate = deferred<void>();
      const events: string[] = [];
      fakeStorage.save.mockImplementationOnce(() => {
        events.push("save");
        return gate.promise;
      });
      StartStore.subscribe(() => events.push("subscriber"));

      const command = StartStore.pin(content, {
        onCommit: () => events.push("context"),
      });
      await Promise.resolve();
      await Promise.resolve();
      expect(events).toEqual(["context", "subscriber", "save"]);

      let finished = false;
      void command.then(() => {
        finished = true;
      });
      await Promise.resolve();
      expect(finished).toBe(false);
      gate.resolve();
      await expect(command).resolves.toMatchObject({ ok: true });
    });
  });
});
