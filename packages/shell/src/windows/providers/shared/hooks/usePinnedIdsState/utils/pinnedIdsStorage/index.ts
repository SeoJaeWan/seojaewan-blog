export interface PinnedIdsStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface PinnedIdsReadResult {
  needsWriteBack: boolean;
  pinnedIds: readonly string[];
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

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** 저장된 pin ID와 정규화 write-back 필요 여부를 읽는다. */
export const readPinnedIds = (
  storageKey: string,
  storage: PinnedIdsStorage | null = getBrowserPinnedIdsStorage(),
): PinnedIdsReadResult => {
  if (storage === null) {
    return { needsWriteBack: false, pinnedIds: [] };
  }

  let value: string | null;

  try {
    value = storage.getItem(storageKey);
  } catch {
    return { needsWriteBack: false, pinnedIds: [] };
  }

  if (value === null) {
    return { needsWriteBack: false, pinnedIds: [] };
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(value);
  } catch {
    return { needsWriteBack: true, pinnedIds: [] };
  }

  if (!isStringArray(parsedValue)) {
    return { needsWriteBack: true, pinnedIds: [] };
  }

  const pinnedIds = [...new Set(parsedValue)];

  return { needsWriteBack: pinnedIds.length !== parsedValue.length, pinnedIds };
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
