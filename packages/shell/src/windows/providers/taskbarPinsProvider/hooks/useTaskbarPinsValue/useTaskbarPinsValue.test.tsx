import type { PropsWithChildren } from "react";

import type { WindowItem } from "@window/ui";

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WindowsEventsContext } from "../../../windowsEventsProvider/context";
import type {
  DispatchWindowEvent,
  SubscribeWindowEvent,
} from "../../../windowsEventsProvider/types";
import { WindowsItemsContext } from "../../../windowsItemsProvider/context";
import { TASKBAR_PIN_STORAGE_KEY } from "../../constants";
import { useTaskbarPinsValue } from "./index";

const WINDOWS_ITEMS = [
  { id: "calculator", title: "계산기" },
  { id: "terminal", title: "터미널" },
  { id: "notepad", title: "메모장" },
] satisfies readonly WindowItem[];

const subscribe: SubscribeWindowEvent = () => () => undefined;

const createWrapper = (
  dispatch: DispatchWindowEvent,
  windowsItems: readonly WindowItem[] = WINDOWS_ITEMS,
) =>
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <WindowsEventsContext.Provider value={{ dispatch, subscribe }}>
        <WindowsItemsContext.Provider value={windowsItems}>{children}</WindowsItemsContext.Provider>
      </WindowsEventsContext.Provider>
    );
  };

const renderTaskbarPins = (
  dispatch = vi.fn<DispatchWindowEvent>(),
  windowsItems: readonly WindowItem[] = WINDOWS_ITEMS,
) => {
  const rendered = renderHook(() => useTaskbarPinsValue(), {
    wrapper: createWrapper(dispatch, windowsItems),
  });

  return { dispatch, ...rendered };
};

const storePinnedIds = (value: unknown) => {
  window.localStorage.setItem(TASKBAR_PIN_STORAGE_KEY, JSON.stringify(value));
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("useTaskbarPinsValue", () => {
  describe("초기 상태와 복원", () => {
    it("storage가 비어 있으면 빈 Taskbar pin 상태로 시작한다", () => {
      const { dispatch, result } = renderTaskbarPins();

      expect(result.current.pinnedIds).toEqual([]);
      expect(result.current.isPinned("calculator")).toBe(false);
      expect(window.localStorage.getItem(TASKBAR_PIN_STORAGE_KEY)).toBeNull();
      expect(dispatch).not.toHaveBeenCalled();
    });

    it("전용 storage의 pin ID를 순서대로 복원하되 event를 전달하지 않는다", async () => {
      storePinnedIds(["terminal", "calculator"]);

      const { dispatch, result } = renderTaskbarPins();

      await waitFor(() => expect(result.current.pinnedIds).toEqual(["terminal", "calculator"]));
      expect(dispatch).not.toHaveBeenCalled();
    });

    it("문자열이 아닌 값이 포함된 배열은 빈 상태로 복구하고 storage를 덮어쓴다", async () => {
      storePinnedIds(["calculator", 1]);

      const { dispatch, result } = renderTaskbarPins();

      await waitFor(() => expect(window.localStorage.getItem(TASKBAR_PIN_STORAGE_KEY)).toBe("[]"));
      expect(result.current.pinnedIds).toEqual([]);
      expect(result.current.isPinned("calculator")).toBe(false);
      expect(dispatch).not.toHaveBeenCalled();
    });

    it("pin ID 배열 대신 객체가 저장되면 빈 상태로 복구하고 storage를 []로 덮어쓴다", async () => {
      storePinnedIds({ id: "calculator" });

      const { dispatch, result } = renderTaskbarPins();

      await waitFor(() => expect(window.localStorage.getItem(TASKBAR_PIN_STORAGE_KEY)).toBe("[]"));
      expect(result.current.pinnedIds).toEqual([]);
      expect(result.current.isPinned("calculator")).toBe(false);
      expect(dispatch).not.toHaveBeenCalled();
    });

    it("중복 및 windowsItems에 없는 ID를 제거하고 최초 순서를 storage에 유지한다", async () => {
      storePinnedIds(["calculator", "missing", "calculator", "terminal"]);

      const { dispatch, result } = renderTaskbarPins();

      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]));
      expect(window.localStorage.getItem(TASKBAR_PIN_STORAGE_KEY)).toBe(
        JSON.stringify(["calculator", "terminal"]),
      );
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe("조회", () => {
    it("isPinned은 현재 pinnedIds의 포함 여부를 반환한다", async () => {
      storePinnedIds(["calculator", "notepad"]);

      const { result } = renderTaskbarPins();
      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "notepad"]));

      expect(result.current.isPinned("calculator")).toBe(true);
      expect(result.current.isPinned("terminal")).toBe(false);
      expect(result.current.isPinned("missing")).toBe(false);
    });
  });

  describe("pin", () => {
    it("유효한 item을 기존 목록의 마지막에 추가한다", async () => {
      storePinnedIds(["calculator", "terminal"]);
      const { result } = renderTaskbarPins();
      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]));

      act(() => result.current.pin("notepad"));

      await waitFor(() =>
        expect(result.current.pinnedIds).toEqual(["calculator", "terminal", "notepad"]),
      );
      expect(result.current.isPinned("notepad")).toBe(true);
    });

    it("pin 결과를 Taskbar 전용 storage에 저장한다", async () => {
      storePinnedIds(["calculator", "terminal"]);
      const { result } = renderTaskbarPins();
      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]));

      act(() => result.current.pin("notepad"));

      await waitFor(() =>
        expect(window.localStorage.getItem(TASKBAR_PIN_STORAGE_KEY)).toBe(
          JSON.stringify(["calculator", "terminal", "notepad"]),
        ),
      );
    });

    it("pin 완료 event에 이전 목록과 변경된 목록을 전달한다", async () => {
      storePinnedIds(["calculator", "terminal"]);
      const { dispatch, result } = renderTaskbarPins();
      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]));

      act(() => result.current.pin("notepad"));

      expect(dispatch).toHaveBeenCalledOnce();
      expect(dispatch).toHaveBeenCalledWith("windowPinToTaskbar", {
        itemId: "notepad",
        pinnedIds: ["calculator", "terminal", "notepad"],
        previousPinnedIds: ["calculator", "terminal"],
      });
    });

    it("이미 pin된 item은 state, storage와 event를 변경하지 않는다", async () => {
      storePinnedIds(["calculator", "terminal"]);
      const { dispatch, result } = renderTaskbarPins();
      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]));
      const setItem = vi.spyOn(Storage.prototype, "setItem");

      act(() => result.current.pin("calculator"));

      expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]);
      expect(window.localStorage.getItem(TASKBAR_PIN_STORAGE_KEY)).toBe(
        JSON.stringify(["calculator", "terminal"]),
      );
      expect(setItem).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    });

    it("windowsItems에 없는 item은 state, storage와 event를 변경하지 않는다", () => {
      const { dispatch, result } = renderTaskbarPins();
      const setItem = vi.spyOn(Storage.prototype, "setItem");

      act(() => result.current.pin("missing"));

      expect(result.current.pinnedIds).toEqual([]);
      expect(window.localStorage.getItem(TASKBAR_PIN_STORAGE_KEY)).toBeNull();
      expect(setItem).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe("unpin", () => {
    it("중간 ID만 제거하고 나머지 pin의 순서를 유지한다", async () => {
      storePinnedIds(["calculator", "terminal", "notepad"]);
      const { result } = renderTaskbarPins();
      await waitFor(() =>
        expect(result.current.pinnedIds).toEqual(["calculator", "terminal", "notepad"]),
      );

      act(() => result.current.unpin("terminal"));

      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "notepad"]));
      expect(result.current.isPinned("calculator")).toBe(true);
      expect(result.current.isPinned("terminal")).toBe(false);
      expect(result.current.isPinned("notepad")).toBe(true);
    });

    it("unpin 결과를 Taskbar 전용 storage에 저장한다", async () => {
      storePinnedIds(["calculator", "terminal", "notepad"]);
      const { result } = renderTaskbarPins();
      await waitFor(() =>
        expect(result.current.pinnedIds).toEqual(["calculator", "terminal", "notepad"]),
      );

      act(() => result.current.unpin("terminal"));

      await waitFor(() =>
        expect(window.localStorage.getItem(TASKBAR_PIN_STORAGE_KEY)).toBe(
          JSON.stringify(["calculator", "notepad"]),
        ),
      );
    });

    it("unpin 완료 event에 이전 목록과 변경된 목록을 전달한다", async () => {
      storePinnedIds(["calculator", "terminal", "notepad"]);
      const { dispatch, result } = renderTaskbarPins();
      await waitFor(() =>
        expect(result.current.pinnedIds).toEqual(["calculator", "terminal", "notepad"]),
      );

      act(() => result.current.unpin("terminal"));

      expect(dispatch).toHaveBeenCalledOnce();
      expect(dispatch).toHaveBeenCalledWith("windowUnpinFromTaskbar", {
        itemId: "terminal",
        pinnedIds: ["calculator", "notepad"],
        previousPinnedIds: ["calculator", "terminal", "notepad"],
      });
    });

    it("pin되지 않은 item은 state, storage와 event를 변경하지 않는다", async () => {
      storePinnedIds(["calculator"]);
      const { dispatch, result } = renderTaskbarPins();
      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator"]));
      const setItem = vi.spyOn(Storage.prototype, "setItem");

      act(() => result.current.unpin("terminal"));

      expect(result.current.pinnedIds).toEqual(["calculator"]);
      expect(window.localStorage.getItem(TASKBAR_PIN_STORAGE_KEY)).toBe(
        JSON.stringify(["calculator"]),
      );
      expect(setItem).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe("외부 상태 동기화", () => {
    it("windowsItems에서 사라진 pin을 자동 정리하지만 unpin event는 전달하지 않는다", async () => {
      storePinnedIds(["calculator", "terminal", "notepad"]);
      const dispatch = vi.fn<DispatchWindowEvent>();
      let windowsItems: readonly WindowItem[] = WINDOWS_ITEMS;
      const Wrapper = ({ children }: PropsWithChildren) => (
        <WindowsEventsContext.Provider value={{ dispatch, subscribe }}>
          <WindowsItemsContext.Provider value={windowsItems}>
            {children}
          </WindowsItemsContext.Provider>
        </WindowsEventsContext.Provider>
      );
      const { rerender, result } = renderHook(() => useTaskbarPinsValue(), {
        wrapper: Wrapper,
      });
      await waitFor(() =>
        expect(result.current.pinnedIds).toEqual(["calculator", "terminal", "notepad"]),
      );

      windowsItems = WINDOWS_ITEMS.filter((item) => item.id !== "terminal");
      rerender();

      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "notepad"]));
      expect(window.localStorage.getItem(TASKBAR_PIN_STORAGE_KEY)).toBe(
        JSON.stringify(["calculator", "notepad"]),
      );
      expect(dispatch).not.toHaveBeenCalled();
    });
  });
});
