import { createElement } from "react";
import type { Root } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePinnedIdsState } from "./index";
import type { PinnedIdsChange } from "./types";

const STORAGE_KEY = "testPinnedIds_v1";
const VALID_ITEM_IDS = new Set(["calculator", "terminal"]);

const PinnedIdsProbe = () => {
  const { pinnedIds } = usePinnedIdsState({
    storageKey: STORAGE_KEY,
    validItemIds: VALID_ITEM_IDS,
  });

  return createElement("output", null, JSON.stringify(pinnedIds));
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("usePinnedIdsState", () => {
  it("server render에는 빈 상태를 사용하고 hydration 뒤 storage 값을 복원한다", async () => {
    const container = document.createElement("div");
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["calculator"]));
    container.innerHTML = renderToString(createElement(PinnedIdsProbe));
    document.body.append(container);

    expect(container.textContent).toBe("[]");

    let root: Root | null = null;

    try {
      act(() => {
        root = hydrateRoot(container, createElement(PinnedIdsProbe));
      });

      await waitFor(() => expect(container.textContent).toBe(JSON.stringify(["calculator"])));
    } finally {
      act(() => root?.unmount());
      container.remove();
    }
  });

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

  it("문자열이 아닌 값이 포함된 배열은 빈 상태로 복구하고 storage를 덮어쓴다", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["calculator", 1]));

    const { result } = renderHook(() =>
      usePinnedIdsState({ storageKey: STORAGE_KEY, validItemIds: VALID_ITEM_IDS }),
    );

    await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toBe("[]"));
    expect(result.current.pinnedIds).toEqual([]);
  });

  it("pin ID 배열 대신 객체가 저장되면 빈 상태로 복구하고 storage를 []로 덮어쓴다", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: "calculator" }));

    const { result } = renderHook(() =>
      usePinnedIdsState({ storageKey: STORAGE_KEY, validItemIds: VALID_ITEM_IDS }),
    );

    await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toBe("[]"));
    expect(result.current.pinnedIds).toEqual([]);
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

  it("유효 item 목록에서 사라진 ID를 state와 storage에서 정리한다", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["calculator", "terminal"]));
    const { result, rerender } = renderHook(
      ({ validItemIds }: { validItemIds: ReadonlySet<string> }) =>
        usePinnedIdsState({ storageKey: STORAGE_KEY, validItemIds }),
      { initialProps: { validItemIds: VALID_ITEM_IDS } },
    );
    await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]));

    rerender({ validItemIds: new Set(["calculator"]) });

    await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator"]));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(["calculator"]));
  });

  it("storage write가 실패해도 메모리 상태를 갱신한다", async () => {
    const { result } = renderHook(() =>
      usePinnedIdsState({ storageKey: STORAGE_KEY, validItemIds: VALID_ITEM_IDS }),
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    act(() => {
      result.current.updatePinnedIds(() => ["calculator"]);
    });

    await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator"]));
  });
});
