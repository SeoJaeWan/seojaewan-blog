import { describe, expect, it } from "vitest";

import { createResourceRef } from "../../../resources/index.js";
import { DEFAULT_FOLDER_VIEW_SETTINGS, type FolderViewSettings } from "../model/index.js";
import {
  createFolderViewSettingsStorageSnapshot,
  parseFolderViewSettingsStorageSnapshot,
} from "./index.js";

const folderA = createResourceRef("folder", "20000000-0000-4000-8000-000000000001");
const folderB = createResourceRef("folder", "20000000-0000-4000-8000-000000000002");

const settings = (viewMode: FolderViewSettings["viewMode"]): FolderViewSettings => ({
  ...DEFAULT_FOLDER_VIEW_SETTINGS,
  viewMode,
});

describe("FolderViewSettingsStorageSnapshot", () => {
  it("location identity 순서의 immutable schema version 1 snapshot을 만든다", () => {
    const snapshot = createFolderViewSettingsStorageSnapshot([
      { location: folderB, settings: settings("details") },
      { location: null, settings: settings("list") },
      { location: folderA, settings: settings("tiles") },
    ]);

    expect(snapshot.entries.map(({ location }) => location?.id ?? null)).toEqual([
      null,
      folderA.id,
      folderB.id,
    ]);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.entries)).toBe(true);
    expect(Object.isFrozen(snapshot.entries[0]?.settings.detailsColumnWidths)).toBe(true);
  });

  it("정상 snapshot을 동일한 location별 설정으로 복원한다", () => {
    const saved = createFolderViewSettingsStorageSnapshot([
      { location: null, settings: settings("details") },
      { location: folderA, settings: settings("content") },
    ]);

    const parsed = parseFolderViewSettingsStorageSnapshot(saved);

    expect(parsed?.snapshot).toEqual(saved);
    expect(parsed?.repaired).toBe(false);
  });

  it("malformed·기본값 entry를 제거하고 중복 location의 마지막 설정을 유지한다", () => {
    const parsed = parseFolderViewSettingsStorageSnapshot({
      schemaVersion: 1,
      entries: [
        { location: folderA, settings: settings("list") },
        { location: { kind: "content", id: folderB.id }, settings: settings("details") },
        { location: folderB, settings: DEFAULT_FOLDER_VIEW_SETTINGS },
        { location: folderA, settings: settings("tiles") },
        { location: folderB },
      ],
    });

    expect(parsed?.repaired).toBe(true);
    expect(parsed?.snapshot.entries).toEqual([{ location: folderA, settings: settings("tiles") }]);
  });

  it.each([null, { schemaVersion: 2, entries: [] }, { schemaVersion: 1, entries: "bad" }])(
    "전체 schema를 해석할 수 없는 %j 값은 null을 반환한다",
    (value) => {
      expect(parseFolderViewSettingsStorageSnapshot(value)).toBeNull();
    },
  );
});
