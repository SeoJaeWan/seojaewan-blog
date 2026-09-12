import {
  DEFAULT_FOLDER_VIEW_SETTINGS,
  type FolderViewSettingsAction,
  type FolderViewSettingsSnapshot,
} from "../../../../headless/folders/index.js";

/**
 * Quick view Action을 Story 화면의 pressed 상태에 반영한다.
 */
export const reduceFileExplorerViewSettingsStory = (
  snapshot: FolderViewSettingsSnapshot,
  input: unknown,
): FolderViewSettingsSnapshot => {
  const action = input as FolderViewSettingsAction;
  if (action.type !== "folder-view-settings.update") return snapshot;
  const sameLocation = (entry: FolderViewSettingsSnapshot["entries"][number]) =>
    action.location === null
      ? entry.location === null
      : entry.location !== null && entry.location.id === action.location.id;
  const current = snapshot.entries.find(sameLocation)?.settings ?? DEFAULT_FOLDER_VIEW_SETTINGS;
  return Object.freeze({
    ...snapshot,
    entries: Object.freeze([
      ...snapshot.entries.filter((entry) => !sameLocation(entry)),
      Object.freeze({
        location: action.location,
        settings: Object.freeze({ ...current, ...action.change }),
      }),
    ]),
  });
};
