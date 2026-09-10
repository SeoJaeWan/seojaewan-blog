import { beforeEach, describe, expect, it, vi } from "vitest";

import { createResourceRef } from "../../../resources/index.js";
import { DEFAULT_FOLDER_VIEW_SETTINGS, type FolderViewSettings } from "../model/index.js";
import {
  createFolderViewSettingsStorageSnapshot,
  type FolderViewSettingsStorage,
  type FolderViewSettingsStorageSnapshot,
} from "../storage/index.js";

const folderA = createResourceRef("folder", "30000000-0000-4000-8000-000000000001");
const folderB = createResourceRef("folder", "30000000-0000-4000-8000-000000000002");

const settings = (
  viewMode: FolderViewSettings["viewMode"],
  overrides: Partial<FolderViewSettings> = {},
): FolderViewSettings => ({
  ...DEFAULT_FOLDER_VIEW_SETTINGS,
  viewMode,
  ...overrides,
});

const saved = (
  entries: Parameters<typeof createFolderViewSettingsStorageSnapshot>[0],
): FolderViewSettingsStorageSnapshot => createFolderViewSettingsStorageSnapshot(entries);

const storage = (initial: unknown) => {
  let value = initial;
  const fake: FolderViewSettingsStorage & {
    load: ReturnType<typeof vi.fn<FolderViewSettingsStorage["load"]>>;
    save: ReturnType<typeof vi.fn<FolderViewSettingsStorage["save"]>>;
    replace(next: unknown): void;
  } = {
    load: vi.fn(() => Promise.resolve(value)),
    save: vi.fn((next) => {
      value = next;
      return Promise.resolve();
    }),
    replace(next) {
      value = next;
    },
  };
  return fake;
};

const loadStore = () => import("./index.js");

beforeEach(() => {
  vi.resetModules();
});

describe("FolderViewSettingsStore", () => {
  it("location을 격리하고 같은 location의 모든 subscriber에 최신값을 공유한다", async () => {
    const { FolderViewSettingsStore } = await loadStore();
    const fakeStorage = storage(null);
    await FolderViewSettingsStore.initialize({ surface: "desktop", storage: fakeStorage });
    const firstConsumer = vi.fn(() => FolderViewSettingsStore.getSettings(folderA));
    const secondConsumer = vi.fn(() => FolderViewSettingsStore.getSettings(folderA));
    FolderViewSettingsStore.subscribe(firstConsumer);
    FolderViewSettingsStore.subscribe(secondConsumer);

    await FolderViewSettingsStore.update(folderA, { viewMode: "details" });

    expect(firstConsumer).toHaveReturnedWith(settings("details"));
    expect(secondConsumer).toHaveReturnedWith(settings("details"));
    expect(FolderViewSettingsStore.getSettings(folderB)).toEqual(DEFAULT_FOLDER_VIEW_SETTINGS);
    expect(fakeStorage.save).toHaveBeenCalledExactlyOnceWith(
      saved([{ location: folderA, settings: settings("details") }]),
    );
  });

  it("새 runtime에서 Desktop과 Folder별 저장 설정을 복원한다", async () => {
    const { FolderViewSettingsStore } = await loadStore();
    const fakeStorage = storage(
      saved([
        { location: null, settings: settings("list") },
        {
          location: folderA,
          settings: settings("content", { sortKey: "date", sortDirection: "descending" }),
        },
      ]),
    );

    await FolderViewSettingsStore.initialize({ surface: "desktop", storage: fakeStorage });

    expect(FolderViewSettingsStore.getSettings(null)).toEqual(settings("list"));
    expect(FolderViewSettingsStore.getSettings(folderA)).toEqual(
      settings("content", { sortKey: "date", sortDirection: "descending" }),
    );
    expect(FolderViewSettingsStore.getSettings(folderB)).toEqual(DEFAULT_FOLDER_VIEW_SETTINGS);
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });

  it("reconcile은 사라진 Folder 설정을 제거하고 Desktop과 현재 Folder 설정은 유지한다", async () => {
    const { FolderViewSettingsStore } = await loadStore();
    const fakeStorage = storage(
      saved([
        { location: null, settings: settings("list") },
        { location: folderA, settings: settings("details") },
        { location: folderB, settings: settings("tiles") },
      ]),
    );
    await FolderViewSettingsStore.initialize({ surface: "desktop", storage: fakeStorage });

    await FolderViewSettingsStore.reconcileFolders([folderA]);

    expect(FolderViewSettingsStore.getSnapshot().entries).toEqual([
      { location: null, settings: settings("list") },
      { location: folderA, settings: settings("details") },
    ]);
    expect(fakeStorage.save).toHaveBeenCalledExactlyOnceWith(
      saved([
        { location: null, settings: settings("list") },
        { location: folderA, settings: settings("details") },
      ]),
    );
  });

  it("mobile은 Medium Icons를 사용하고 settings를 읽거나 쓰거나 정리하지 않는다", async () => {
    const { FolderViewSettingsStore } = await loadStore();
    const fakeStorage = storage(saved([{ location: folderA, settings: settings("details") }]));

    await FolderViewSettingsStore.initialize({ surface: "mobile", storage: fakeStorage });
    await expect(
      FolderViewSettingsStore.update(folderA, { viewMode: "extra-large-icons" }),
    ).resolves.toEqual({ ok: false, reason: "no-op" });
    await expect(FolderViewSettingsStore.reconcileFolders([])).resolves.toEqual({
      ok: false,
      reason: "no-op",
    });
    await expect(FolderViewSettingsStore.reload()).resolves.toEqual({
      ok: false,
      reason: "no-op",
    });

    expect(FolderViewSettingsStore.getSettings(folderA)).toEqual(DEFAULT_FOLDER_VIEW_SETTINGS);
    expect(fakeStorage.load).not.toHaveBeenCalled();
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });

  it("mobile에서 desktop으로 돌아오면 저장된 최신 설정을 읽어 적용한다", async () => {
    const { FolderViewSettingsStore } = await loadStore();
    const fakeStorage = storage(saved([{ location: folderA, settings: settings("details") }]));
    await FolderViewSettingsStore.initialize({ surface: "mobile", storage: fakeStorage });

    await FolderViewSettingsStore.setSurface("desktop");

    expect(fakeStorage.load).toHaveBeenCalledOnce();
    expect(FolderViewSettingsStore.getSettings(folderA)).toEqual(settings("details"));

    await FolderViewSettingsStore.setSurface("mobile");

    expect(FolderViewSettingsStore.getSnapshot().entries).toEqual([]);
    expect(FolderViewSettingsStore.getSettings(folderA)).toEqual(DEFAULT_FOLDER_VIEW_SETTINGS);
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });

  it("write failure 뒤 runtime commit을 유지하고 다음 명령은 최신 전체 설정을 저장한다", async () => {
    const { FolderViewSettingsStore } = await loadStore();
    const fakeStorage = storage(null);
    await FolderViewSettingsStore.initialize({ surface: "desktop", storage: fakeStorage });
    fakeStorage.save.mockRejectedValueOnce(new Error("quota"));

    const failed = await FolderViewSettingsStore.update(folderA, { viewMode: "details" });
    const succeeded = await FolderViewSettingsStore.update(folderA, {
      sortKey: "date",
      sortDirection: "descending",
    });

    expect(failed).toMatchObject({
      ok: false,
      reason: "storage-write-failed",
      committed: true,
    });
    expect(FolderViewSettingsStore.getSettings(folderA)).toEqual(
      settings("details", { sortKey: "date", sortDirection: "descending" }),
    );
    expect(succeeded).toMatchObject({ ok: true });
    expect(fakeStorage.save.mock.calls[1]?.[0]).toEqual(
      saved([
        {
          location: folderA,
          settings: settings("details", { sortKey: "date", sortDirection: "descending" }),
        },
      ]),
    );
  });

  it("느린 save 중 후속 변경을 직렬화해 각 명령의 최신 snapshot을 저장한다", async () => {
    const { FolderViewSettingsStore } = await loadStore();
    const fakeStorage = storage(null);
    await FolderViewSettingsStore.initialize({ surface: "desktop", storage: fakeStorage });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    fakeStorage.save.mockReturnValueOnce(gate);

    const first = FolderViewSettingsStore.update(folderA, { viewMode: "details" });
    const second = FolderViewSettingsStore.update(folderA, { sortKey: "date" });
    await vi.waitFor(() => expect(fakeStorage.save).toHaveBeenCalledOnce());
    expect(FolderViewSettingsStore.getSettings(folderA)).toEqual(settings("details"));

    release();
    await first;
    await second;

    expect(fakeStorage.save.mock.calls.map(([snapshot]) => snapshot.entries[0]?.settings)).toEqual([
      settings("details"),
      settings("details", { sortKey: "date" }),
    ]);
  });

  it("no-op과 malformed Action은 snapshot·알림·저장을 만들지 않는다", async () => {
    const { FolderViewSettingsStore } = await loadStore();
    const fakeStorage = storage(null);
    await FolderViewSettingsStore.initialize({ surface: "desktop", storage: fakeStorage });
    const before = FolderViewSettingsStore.getSnapshot();
    const listener = vi.fn();
    FolderViewSettingsStore.subscribe(listener);

    await expect(
      FolderViewSettingsStore.update(folderA, { viewMode: "medium-icons" }),
    ).resolves.toEqual({ ok: false, reason: "no-op" });
    await expect(
      FolderViewSettingsStore.dispatch({
        type: "folder-view-settings.update",
        location: folderA,
        change: { detailsColumnWidths: { modified: 0, type: 120 } },
      }),
    ).resolves.toEqual({ ok: false, reason: "invalid-settings-change" });

    expect(FolderViewSettingsStore.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(fakeStorage.save).not.toHaveBeenCalled();
  });
});
