export interface PinnedIdsChange {
  pinnedIds: readonly string[];
  previousPinnedIds: readonly string[];
}

export type PinnedIdsUpdater = (currentPinnedIds: readonly string[]) => readonly string[] | null;

export type UpdatePinnedIds = (update: PinnedIdsUpdater) => PinnedIdsChange | null;

export interface UsePinnedIdsStateOptions {
  storageKey: string;
  validItemIds: ReadonlySet<string>;
}

export interface UsePinnedIdsStateResult {
  pinnedIds: readonly string[];
  updatePinnedIds: UpdatePinnedIds;
}
