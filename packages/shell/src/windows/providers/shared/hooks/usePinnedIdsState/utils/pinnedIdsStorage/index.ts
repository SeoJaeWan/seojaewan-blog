export interface PinnedIdsStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const getBrowserPinnedIdsStorage = (): PinnedIdsStorage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** 저장된 pin ID를 검증하고 중복은 처음 등장한 순서만 유지한다. */
export const readPinnedIds = (
  storageKey: string,
  storage: PinnedIdsStorage | null = getBrowserPinnedIdsStorage(),
): readonly string[] => {
  if (storage === null) {
    return [];
  }

  try {
    const value = storage.getItem(storageKey);

    if (value === null) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(value);

    if (!Array.isArray(parsedValue) || !parsedValue.every((item) => typeof item === "string")) {
      return [];
    }

    return [...new Set(parsedValue)];
  } catch {
    return [];
  }
};

/** 최종 pin ID를 versioned localStorage key에 저장하고 실패를 격리한다. */
export const writePinnedIds = (
  storageKey: string,
  pinnedIds: readonly string[],
  storage: PinnedIdsStorage | null = getBrowserPinnedIdsStorage(),
): boolean => {
  if (storage === null) {
    return false;
  }

  try {
    storage.setItem(storageKey, JSON.stringify(pinnedIds));
    return true;
  } catch {
    return false;
  }
};
