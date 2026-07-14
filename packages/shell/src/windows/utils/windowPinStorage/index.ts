import type { WindowPinTarget } from "../../types";

interface WindowPinStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export const WINDOW_PIN_STORAGE_KEYS = {
  taskbar: "taskbarPinnedIds_v1",
  windows: "windowsPinnedIds_v1",
} as const satisfies Record<WindowPinTarget, string>;

const getBrowserWindowPinStorage = (): WindowPinStorage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/**
 * 저장된 pin ID를 string array로 검증하고 중복은 첫 순서만 유지한다.
 *
 * @param target 값을 읽을 pin surface
 * @param storage localStorage 호환 저장소
 * @returns 복원 가능한 pin ID 또는 빈 배열
 */
export const readWindowPinnedIds = (
  target: WindowPinTarget,
  storage: WindowPinStorage | null = getBrowserWindowPinStorage(),
): readonly string[] => {
  if (storage === null) {
    return [];
  }

  try {
    const value = storage.getItem(WINDOW_PIN_STORAGE_KEYS[target]);

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

/**
 * pin ID를 target별 versioned localStorage key에 저장한다.
 *
 * @param target 값을 저장할 pin surface
 * @param pinnedIds 저장할 최종 pin ID
 * @param storage localStorage 호환 저장소
 * @returns 저장 성공 여부
 */
export const writeWindowPinnedIds = (
  target: WindowPinTarget,
  pinnedIds: readonly string[],
  storage: WindowPinStorage | null = getBrowserWindowPinStorage(),
): boolean => {
  if (storage === null) {
    return false;
  }

  try {
    storage.setItem(WINDOW_PIN_STORAGE_KEYS[target], JSON.stringify(pinnedIds));
    return true;
  } catch {
    return false;
  }
};
