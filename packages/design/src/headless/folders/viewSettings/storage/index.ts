/**
 * @file 위치별 Folder 보기 설정의 versioned 저장 형식과 Application storage port를 정의한다.
 *
 * 실제 localStorage key, JSON 변환과 location key 인코딩은 Application adapter가 소유한다.
 */
import type { FileExplorerLocation } from "../../model/index.js";
import {
  areFolderViewSettingsEqual,
  areFolderViewSettingsLocationsEqual,
  DEFAULT_FOLDER_VIEW_SETTINGS,
  type FolderViewSettings,
  parseFolderViewSettings,
  parseFolderViewSettingsLocation,
} from "../model/index.js";

/** 저장된 하나의 Desktop 또는 Folder location과 최신 설정 pair다. */
export type FolderViewSettingsStorageEntry = Readonly<{
  location: FileExplorerLocation;
  settings: FolderViewSettings;
}>;

/** 위치별 Folder 보기 설정의 schema version 1 저장값이다. */
export type FolderViewSettingsStorageSnapshot = Readonly<{
  schemaVersion: 1;
  entries: readonly FolderViewSettingsStorageEntry[];
}>;

/** 저장값을 복원하며 정리가 필요했는지도 함께 전달하는 결과다. */
export type ParsedFolderViewSettingsStorageSnapshot = Readonly<{
  snapshot: FolderViewSettingsStorageSnapshot;
  repaired: boolean;
}>;

/** Application이 브라우저 실행 경계에서 제공하는 Folder 보기 설정 전용 저장 port다. */
export type FolderViewSettingsStorage = Readonly<{
  /** 현재 저장된 parsed 값을 읽고 값이 없으면 null을 반환한다. */
  load(): Promise<unknown>;
  /** 모든 location 설정을 하나의 최신 snapshot으로 저장한다. */
  save(snapshot: FolderViewSettingsStorageSnapshot): Promise<void>;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (record: Record<string, unknown>, expected: readonly string[]): boolean => {
  const keys = Object.keys(record);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
};

const locationKey = (location: FileExplorerLocation): string =>
  location === null ? "desktop" : `folder:${location.id}`;

const freezeEntry = ({
  location,
  settings,
}: FolderViewSettingsStorageEntry): FolderViewSettingsStorageEntry =>
  Object.freeze({
    location: location === null ? null : Object.freeze({ ...location }),
    settings: parseFolderViewSettings(settings),
  });

/** 검증된 entry를 identity 순서로 정렬해 immutable schema version 1 저장값을 만든다. */
export const createFolderViewSettingsStorageSnapshot = (
  entries: readonly FolderViewSettingsStorageEntry[],
): FolderViewSettingsStorageSnapshot =>
  Object.freeze({
    schemaVersion: 1,
    entries: Object.freeze(
      entries
        .map(freezeEntry)
        .sort((left, right) =>
          locationKey(left.location).localeCompare(locationKey(right.location)),
        ),
    ),
  });

/**
 * schema version 1 저장값을 복원한다.
 *
 * malformed entry, implicit 기본값과 중복 identity는 제거하며 중복에서는 마지막 값을 유지한다.
 */
export const parseFolderViewSettingsStorageSnapshot = (
  value: unknown,
): ParsedFolderViewSettingsStorageSnapshot | null => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["schemaVersion", "entries"]) ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.entries)
  ) {
    return null;
  }
  const candidates = value.entries;

  const byLocation = new Map<string, FolderViewSettingsStorageEntry>();
  let repaired = false;
  for (const candidate of candidates) {
    if (!isRecord(candidate) || !hasOnlyKeys(candidate, ["location", "settings"])) {
      repaired = true;
      continue;
    }
    try {
      const location = parseFolderViewSettingsLocation(candidate.location);
      const settings = parseFolderViewSettings(candidate.settings);
      const key = locationKey(location);
      if (areFolderViewSettingsEqual(settings, DEFAULT_FOLDER_VIEW_SETTINGS)) {
        repaired = true;
        byLocation.delete(key);
        continue;
      }
      if (byLocation.has(key)) repaired = true;
      byLocation.set(key, { location, settings });
    } catch {
      repaired = true;
    }
  }

  const snapshot = createFolderViewSettingsStorageSnapshot([...byLocation.values()]);
  if (!repaired && snapshot.entries.length === candidates.length) {
    repaired = snapshot.entries.some((entry, index) => {
      const original = candidates[index] as FolderViewSettingsStorageEntry | undefined;
      return (
        original === undefined ||
        !areFolderViewSettingsLocationsEqual(entry.location, original.location) ||
        !areFolderViewSettingsEqual(entry.settings, original.settings)
      );
    });
  }

  return Object.freeze({ snapshot, repaired });
};
