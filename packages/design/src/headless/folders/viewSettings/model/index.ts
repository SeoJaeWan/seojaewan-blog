/**
 * @file File Explorer의 위치별 보기·정렬 설정과 변경 Action을 정의한다.
 *
 * tab, Window와 Workspace placement는 소유하지 않으며 Desktop은 `null` location으로 유지한다.
 */
import { parseResourceRef } from "../../../resources/index.js";
import type { FileExplorerLocation } from "../../model/index.js";

/** File Explorer가 제공하는 여덟 가지 collection 보기 방식이다. */
export type FolderViewMode =
  | "extra-large-icons"
  | "large-icons"
  | "medium-icons"
  | "small-icons"
  | "list"
  | "details"
  | "tiles"
  | "content";

/** File Explorer collection을 정렬할 수 있는 Resource 속성이다. */
export type FolderViewSortKey = "name" | "date";

/** 정렬 결과의 진행 방향이다. */
export type FolderViewSortDirection = "ascending" | "descending";

/** 자세히 보기에서 사용자가 조절할 수 있는 두 고정 column 폭이다. */
export type FolderDetailsColumnWidths = Readonly<{
  modified: number;
  type: number;
}>;

/** 하나의 Desktop 또는 Folder location이 소유하는 최신 보기 설정이다. */
export type FolderViewSettings = Readonly<{
  viewMode: FolderViewMode;
  sortKey: FolderViewSortKey;
  sortDirection: FolderViewSortDirection;
  detailsColumnWidths: FolderDetailsColumnWidths;
}>;

/** responsive runtime에서 File Explorer가 설정을 소비하는 surface 종류다. */
export type FolderViewSettingsSurface = "desktop" | "mobile";

/** 위치별 설정 중 한 번의 Action이 원자적으로 바꿀 필드다. */
export type FolderViewSettingsChange = Readonly<{
  viewMode?: FolderViewMode;
  sortKey?: FolderViewSortKey;
  sortDirection?: FolderViewSortDirection;
  detailsColumnWidths?: FolderDetailsColumnWidths;
}>;

/** File Explorer controller가 위치별 설정 변경을 요청하는 serializable Action이다. */
export type FolderViewSettingsAction = Readonly<{
  type: "folder-view-settings.update";
  location: FileExplorerLocation;
  change: FolderViewSettingsChange;
}>;

/** desktop과 mobile의 implicit Medium Icons 기본값이다. */
export const DEFAULT_FOLDER_VIEW_SETTINGS: FolderViewSettings = Object.freeze({
  viewMode: "medium-icons",
  sortKey: "name",
  sortDirection: "ascending",
  detailsColumnWidths: Object.freeze({ modified: 160, type: 120 }),
});

const VIEW_MODES: readonly FolderViewMode[] = [
  "extra-large-icons",
  "large-icons",
  "medium-icons",
  "small-icons",
  "list",
  "details",
  "tiles",
  "content",
];

const isFolderViewMode = (value: unknown): value is FolderViewMode =>
  VIEW_MODES.some((mode) => mode === value);

const SETTINGS_KEYS = ["viewMode", "sortKey", "sortDirection", "detailsColumnWidths"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (record: Record<string, unknown>, expected: readonly string[]): boolean => {
  const keys = Object.keys(record);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
};

const isPositiveFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/** 외부 값을 엄격한 Folder location으로 복원하며 Desktop `null`도 그대로 허용한다. */
export const parseFolderViewSettingsLocation = (value: unknown): FileExplorerLocation => {
  if (value === null) return null;
  const ref = parseResourceRef(value);
  if (ref.kind !== "folder")
    throw new TypeError("보기 설정 location은 Folder 또는 Desktop이어야 합니다");
  return ref;
};

/** 외부 값을 정확한 필드와 유효한 column 폭을 가진 immutable 설정으로 복원한다. */
export const parseFolderViewSettings = (value: unknown): FolderViewSettings => {
  if (!isRecord(value) || !hasOnlyKeys(value, SETTINGS_KEYS)) {
    throw new TypeError("Folder 보기 설정 형식이 올바르지 않습니다");
  }
  if (!isFolderViewMode(value.viewMode)) {
    throw new TypeError("지원하지 않는 Folder 보기 방식입니다");
  }
  if (value.sortKey !== "name" && value.sortKey !== "date") {
    throw new TypeError("지원하지 않는 Folder 정렬 기준입니다");
  }
  if (value.sortDirection !== "ascending" && value.sortDirection !== "descending") {
    throw new TypeError("지원하지 않는 Folder 정렬 방향입니다");
  }
  if (
    !isRecord(value.detailsColumnWidths) ||
    !hasOnlyKeys(value.detailsColumnWidths, ["modified", "type"]) ||
    !isPositiveFiniteNumber(value.detailsColumnWidths.modified) ||
    !isPositiveFiniteNumber(value.detailsColumnWidths.type)
  ) {
    throw new TypeError("자세히 보기 column 폭은 양의 유한한 숫자여야 합니다");
  }

  return Object.freeze({
    viewMode: value.viewMode,
    sortKey: value.sortKey,
    sortDirection: value.sortDirection,
    detailsColumnWidths: Object.freeze({
      modified: value.detailsColumnWidths.modified,
      type: value.detailsColumnWidths.type,
    }),
  });
};

/** 두 설정이 중첩 column 폭까지 같은지 판정한다. */
export const areFolderViewSettingsEqual = (
  left: FolderViewSettings,
  right: FolderViewSettings,
): boolean =>
  left.viewMode === right.viewMode &&
  left.sortKey === right.sortKey &&
  left.sortDirection === right.sortDirection &&
  left.detailsColumnWidths.modified === right.detailsColumnWidths.modified &&
  left.detailsColumnWidths.type === right.detailsColumnWidths.type;

/** Folder identity 또는 Desktop root가 같은 탐색 위치인지 판정한다. */
export const areFolderViewSettingsLocationsEqual = (
  left: FileExplorerLocation,
  right: FileExplorerLocation,
): boolean => (left === null ? right === null : right !== null && left.id === right.id);
