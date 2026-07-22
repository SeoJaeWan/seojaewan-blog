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

const renderPinnedIds = (validItemIds: ReadonlySet<string> = VALID_ITEM_IDS) =>
  renderHook(() => usePinnedIdsState({ storageKey: STORAGE_KEY, validItemIds }));

const storePinnedIds = (value: unknown) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("usePinnedIdsState", () => {
  describe("server render와 storage 복원", () => {
    it("server render에는 빈 상태를 사용하고 hydration 뒤 storage 값을 복원한다", async () => {
      const container = document.createElement("div");
      storePinnedIds(["calculator"]);
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

    it("storage key가 없으면 빈 상태를 유지하고 빈 배열을 저장하지 않는다", () => {
      const setItem = vi.spyOn(Storage.prototype, "setItem");

      const { result } = renderPinnedIds();

      expect(result.current.pinnedIds).toEqual([]);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(setItem).not.toHaveBeenCalled();
    });

    it("유효한 storage 값은 순서대로 복원하고 다시 저장하지 않는다", async () => {
      storePinnedIds(["terminal", "calculator"]);
      const setItem = vi.spyOn(Storage.prototype, "setItem");

      const { result } = renderPinnedIds();

      await waitFor(() => expect(result.current.pinnedIds).toEqual(["terminal", "calculator"]));
      expect(setItem).not.toHaveBeenCalled();
    });

    it("잘못된 JSON은 빈 상태로 복구하고 storage를 빈 배열로 덮어쓴다", async () => {
      window.localStorage.setItem(STORAGE_KEY, "[");
      const setItem = vi.spyOn(Storage.prototype, "setItem");

      const { result } = renderPinnedIds();

      await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toBe("[]"));
      expect(result.current.pinnedIds).toEqual([]);
      expect(setItem).toHaveBeenCalledOnce();
    });

    it.each([
      { label: "pin ID 배열 대신 저장된 객체", value: { id: "calculator" } },
      { label: "문자열 외 항목이 섞인 배열", value: ["calculator", 1] },
    ])("$label 값은 빈 상태로 복구하고 storage를 덮어쓴다", async ({ value }) => {
      storePinnedIds(value);

      const { result } = renderPinnedIds();

      await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toBe("[]"));
      expect(result.current.pinnedIds).toEqual([]);
    });

    it("중복과 유효하지 않은 ID를 제거하고 최초 순서를 storage에 유지한다", async () => {
      storePinnedIds(["calculator", "missing", "calculator", "terminal"]);

      const { result } = renderPinnedIds();

      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]));
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
        JSON.stringify(["calculator", "terminal"]),
      );
    });
  });

  describe("updatePinnedIds", () => {
    it("canonical 상태와 storage를 변경하고 이전 목록과 변경된 목록을 반환한다", async () => {
      storePinnedIds(["calculator"]);
      const { result } = renderPinnedIds();
      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator"]));
      let change: PinnedIdsChange | null = null;

      act(() => {
        change = result.current.updatePinnedIds((pinnedIds) => [...pinnedIds, "terminal"]);
      });

      expect(change).toEqual({
        pinnedIds: ["calculator", "terminal"],
        previousPinnedIds: ["calculator"],
      });
      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]));
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
        JSON.stringify(["calculator", "terminal"]),
      );
    });

    it("같은 tick의 연속 update를 최신 canonical 상태에서 계산한다", async () => {
      const { result } = renderPinnedIds();
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
    });

    it("updater가 null을 반환하면 state와 storage를 변경하지 않는다", async () => {
      storePinnedIds(["calculator"]);
      const { result } = renderPinnedIds();
      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator"]));
      const setItem = vi.spyOn(Storage.prototype, "setItem");
      let change: PinnedIdsChange | null = null;

      act(() => {
        change = result.current.updatePinnedIds(() => null);
      });

      expect(change).toBeNull();
      expect(result.current.pinnedIds).toEqual(["calculator"]);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(["calculator"]));
      expect(setItem).not.toHaveBeenCalled();
    });

    it("같은 목록을 새 배열로 반환해도 state와 storage를 변경하지 않는다", async () => {
      storePinnedIds(["calculator", "terminal"]);
      const { result } = renderPinnedIds();
      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]));
      const setItem = vi.spyOn(Storage.prototype, "setItem");
      let change: PinnedIdsChange | null = null;

      act(() => {
        change = result.current.updatePinnedIds((pinnedIds) => [...pinnedIds]);
      });

      expect(change).toBeNull();
      expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]);
      expect(setItem).not.toHaveBeenCalled();
    });

    it("updater 결과의 중복과 유효하지 않은 ID도 canonical 값으로 정리한다", async () => {
      storePinnedIds(["calculator"]);
      const { result } = renderPinnedIds();
      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator"]));
      let change: PinnedIdsChange | null = null;

      act(() => {
        change = result.current.updatePinnedIds(() => [
          "calculator",
          "missing",
          "terminal",
          "terminal",
        ]);
      });

      expect(change).toEqual({
        pinnedIds: ["calculator", "terminal"],
        previousPinnedIds: ["calculator"],
      });
      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]));
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
        JSON.stringify(["calculator", "terminal"]),
      );
    });

    it("정규화 결과가 현재 빈 상태와 같으면 storage를 변경하지 않는다", () => {
      const { result } = renderPinnedIds();
      const setItem = vi.spyOn(Storage.prototype, "setItem");
      let change: PinnedIdsChange | null = null;

      act(() => {
        change = result.current.updatePinnedIds(() => ["missing", "missing"]);
      });

      expect(change).toBeNull();
      expect(result.current.pinnedIds).toEqual([]);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(setItem).not.toHaveBeenCalled();
    });
  });

  describe("validItemIds 변경", () => {
    it("사라진 중간 ID를 state와 storage에서 제거하고 나머지 순서를 유지한다", async () => {
      const initialValidItemIds = new Set(["calculator", "terminal", "notepad"]);
      storePinnedIds(["calculator", "terminal", "notepad"]);
      const { rerender, result } = renderHook(
        ({ validItemIds }: { validItemIds: ReadonlySet<string> }) =>
          usePinnedIdsState({ storageKey: STORAGE_KEY, validItemIds }),
        { initialProps: { validItemIds: initialValidItemIds } },
      );
      await waitFor(() =>
        expect(result.current.pinnedIds).toEqual(["calculator", "terminal", "notepad"]),
      );

      rerender({ validItemIds: new Set(["calculator", "notepad"]) });

      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "notepad"]));
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(
        JSON.stringify(["calculator", "notepad"]),
      );
    });
  });

  describe("storage 실패", () => {
    it("storage read 실패는 빈 메모리 상태로 격리하고 write-back하지 않는다", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("read failed");
      });
      const setItem = vi.spyOn(Storage.prototype, "setItem");

      const { result } = renderPinnedIds();

      expect(result.current.pinnedIds).toEqual([]);
      expect(setItem).not.toHaveBeenCalled();
    });

    it("storage write 실패에도 메모리 상태를 갱신하고 변경 결과를 반환한다", async () => {
      const { result } = renderPinnedIds();
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("write failed");
      });
      let change: PinnedIdsChange | null = null;

      act(() => {
        change = result.current.updatePinnedIds(() => ["calculator"]);
      });

      expect(change).toEqual({ pinnedIds: ["calculator"], previousPinnedIds: [] });
      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator"]));
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });
});
