"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  PinnedIdsChange,
  UpdatePinnedIds,
  UsePinnedIdsStateOptions,
  UsePinnedIdsStateResult,
} from "./types";

const EMPTY_PINNED_IDS: readonly string[] = [];

interface StoredPinnedIds {
  needsWriteBack: boolean;
  pinnedIds: readonly string[];
}

const arePinnedIdsEqual = (left: readonly string[], right: readonly string[]) =>
  left === right ||
  (left.length === right.length && left.every((itemId, index) => itemId === right[index]));

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const normalizePinnedIds = (pinnedIds: readonly string[], validItemIds: ReadonlySet<string>) => {
  const seenItemIds = new Set<string>();
  const nextPinnedIds: string[] = [];

  for (const itemId of pinnedIds) {
    if (!validItemIds.has(itemId) || seenItemIds.has(itemId)) {
      continue;
    }

    seenItemIds.add(itemId);
    nextPinnedIds.push(itemId);
  }

  return nextPinnedIds.length === pinnedIds.length ? pinnedIds : nextPinnedIds;
};

const readStoredPinnedIds = (storageKey: string): StoredPinnedIds => {
  let storedValue: string | null;

  try {
    storedValue = window.localStorage.getItem(storageKey);
  } catch {
    return { needsWriteBack: false, pinnedIds: EMPTY_PINNED_IDS };
  }

  if (storedValue === null) {
    return { needsWriteBack: false, pinnedIds: EMPTY_PINNED_IDS };
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    return { needsWriteBack: true, pinnedIds: EMPTY_PINNED_IDS };
  }

  return isStringArray(parsedValue)
    ? { needsWriteBack: false, pinnedIds: parsedValue }
    : { needsWriteBack: true, pinnedIds: EMPTY_PINNED_IDS };
};

const writeStoredPinnedIds = (storageKey: string, pinnedIds: readonly string[]) => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(pinnedIds));
  } catch {
    // Persistence 실패는 Provider가 소유한 메모리 상태 변경을 취소하지 않는다.
  }
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
      const pinnedIds = normalizePinnedIds(requestedPinnedIds, validItemIdsRef.current);

      if (arePinnedIdsEqual(previousPinnedIds, pinnedIds)) {
        return null;
      }

      applyPinnedIdsState(pinnedIds);
      writeStoredPinnedIds(storageKey, pinnedIds);

      return { pinnedIds, previousPinnedIds };
    },
    [applyPinnedIdsState, storageKey],
  );

  const updatePinnedIds = useCallback<UpdatePinnedIds>(
    (update) => {
      const currentPinnedIds = normalizePinnedIds(pinnedIdsRef.current, validItemIdsRef.current);

      if (!arePinnedIdsEqual(pinnedIdsRef.current, currentPinnedIds)) {
        commitPinnedIds(currentPinnedIds);
      }

      const nextPinnedIds = update(currentPinnedIds);
      return nextPinnedIds === null ? null : commitPinnedIds(nextPinnedIds);
    },
    [commitPinnedIds],
  );

  useEffect(() => {
    const { needsWriteBack, pinnedIds: storedPinnedIds } = readStoredPinnedIds(storageKey);
    const nextPinnedIds = normalizePinnedIds(storedPinnedIds, validItemIdsRef.current);

    applyPinnedIdsState(nextPinnedIds);

    if (needsWriteBack || !arePinnedIdsEqual(storedPinnedIds, nextPinnedIds)) {
      writeStoredPinnedIds(storageKey, nextPinnedIds);
    }
  }, [applyPinnedIdsState, storageKey]);

  useEffect(() => {
    const nextPinnedIds = normalizePinnedIds(pinnedIdsRef.current, validItemIds);
    commitPinnedIds(nextPinnedIds);
  }, [commitPinnedIds, validItemIds]);

  const pinnedIds = useMemo(
    () => normalizePinnedIds(pinnedIdsState, validItemIds),
    [pinnedIdsState, validItemIds],
  );

  return useMemo(() => ({ pinnedIds, updatePinnedIds }), [pinnedIds, updatePinnedIds]);
};
