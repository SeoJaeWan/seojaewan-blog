import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { usePinnedIdsState } from "./index";
import type { PinnedIdsChange } from "./types";

const STORAGE_KEY = "testPinnedIds_v1";
const VALID_ITEM_IDS = new Set(["calculator", "terminal"]);

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("usePinnedIdsState", () => {
  it("storage 값을 복원하면서 중복과 유효하지 않은 ID를 정리한다", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(["calculator", "missing", "calculator"]),
    );

    const { result } = renderHook(() =>
      usePinnedIdsState({ storageKey: STORAGE_KEY, validItemIds: VALID_ITEM_IDS }),
    );

    await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator"]));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(["calculator"]));
  });

  it("같은 tick의 연속 update를 최신 ID에서 계산하고 완료 결과를 반환한다", async () => {
    const { result } = renderHook(() =>
      usePinnedIdsState({ storageKey: STORAGE_KEY, validItemIds: VALID_ITEM_IDS }),
    );
    let firstChange: PinnedIdsChange | null = null;
    let secondChange: PinnedIdsChange | null = null;

    act(() => {
      firstChange = result.current.updatePinnedIds((pinnedIds) => [...pinnedIds, "calculator"]);
      secondChange = result.current.updatePinnedIds((pinnedIds) => [...pinnedIds, "terminal"]);
    });

    expect(firstChange).toEqual({ pinnedIds: ["calculator"], previousPinnedIds: [] });
    expect(secondChange).toEqual({
      pinnedIds: ["calculator", "terminal"],
      previousPinnedIds: ["calculator"],
    });
    await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
      JSON.stringify(["calculator", "terminal"]),
    );
  });
});
