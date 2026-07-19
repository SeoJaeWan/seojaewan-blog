"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  PinnedIdsChange,
  UpdatePinnedIds,
  UsePinnedIdsStateOptions,
  UsePinnedIdsStateResult,
} from "./types";
import { readPinnedIds, writePinnedIds } from "./utils/pinnedIdsStorage";

const EMPTY_PINNED_IDS: readonly string[] = [];

const arePinnedIdsEqual = (left: readonly string[], right: readonly string[]) =>
  left === right ||
  (left.length === right.length && left.every((itemId, index) => itemId === right[index]));

const filterPinnedIds = (pinnedIds: readonly string[], validItemIds: ReadonlySet<string>) => {
  const nextPinnedIds = pinnedIds.filter((itemId) => validItemIds.has(itemId));
  return nextPinnedIds.length === pinnedIds.length ? pinnedIds : nextPinnedIds;
};

/** 한 surface의 pin ID 상태, persistence와 유효 ID 정리를 관리한다. */
export const usePinnedIdsState = ({
  storageKey,
  validItemIds,
}: UsePinnedIdsStateOptions): UsePinnedIdsStateResult => {
  const [pinnedIdsState, setPinnedIdsState] = useState(EMPTY_PINNED_IDS);
  const pinnedIdsRef = useRef(EMPTY_PINNED_IDS);
  const validItemIdsRef = useRef(validItemIds);
  validItemIdsRef.current = validItemIds;

  const applyPinnedIdsState = useCallback((nextPinnedIds: readonly string[]) => {
    if (arePinnedIdsEqual(pinnedIdsRef.current, nextPinnedIds)) {
      return;
    }

    pinnedIdsRef.current = nextPinnedIds;
    setPinnedIdsState(nextPinnedIds);
  }, []);

  const commitPinnedIds = useCallback(
    (requestedPinnedIds: readonly string[]): PinnedIdsChange | null => {
      const previousPinnedIds = pinnedIdsRef.current;
      const pinnedIds = filterPinnedIds(requestedPinnedIds, validItemIdsRef.current);

      if (arePinnedIdsEqual(previousPinnedIds, pinnedIds)) {
        return null;
      }

      applyPinnedIdsState(pinnedIds);
      writePinnedIds(storageKey, pinnedIds);

      return { pinnedIds, previousPinnedIds };
    },
    [applyPinnedIdsState, storageKey],
  );

  const updatePinnedIds = useCallback<UpdatePinnedIds>(
    (update) => {
      const currentPinnedIds = filterPinnedIds(pinnedIdsRef.current, validItemIdsRef.current);

      if (!arePinnedIdsEqual(pinnedIdsRef.current, currentPinnedIds)) {
        commitPinnedIds(currentPinnedIds);
      }

      const nextPinnedIds = update(currentPinnedIds);
      return nextPinnedIds === null ? null : commitPinnedIds(nextPinnedIds);
    },
    [commitPinnedIds],
  );

  useEffect(() => {
    const storedPinnedIds = readPinnedIds(storageKey);
    const nextPinnedIds = filterPinnedIds(storedPinnedIds, validItemIdsRef.current);

    applyPinnedIdsState(nextPinnedIds);

    if (!arePinnedIdsEqual(storedPinnedIds, nextPinnedIds)) {
      writePinnedIds(storageKey, nextPinnedIds);
    }
  }, [applyPinnedIdsState, storageKey]);

  useEffect(() => {
    const nextPinnedIds = filterPinnedIds(pinnedIdsRef.current, validItemIds);
    commitPinnedIds(nextPinnedIds);
  }, [commitPinnedIds, validItemIds]);

  const pinnedIds = useMemo(
    () => filterPinnedIds(pinnedIdsState, validItemIds),
    [pinnedIdsState, validItemIds],
  );

  return useMemo(() => ({ pinnedIds, updatePinnedIds }), [pinnedIds, updatePinnedIds]);
};
