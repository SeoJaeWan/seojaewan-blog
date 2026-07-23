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
import { WINDOWS_PIN_STORAGE_KEY } from "../../constants";
import { useWindowsPinsValue } from "./index";

const CALCULATOR = { id: "calculator", title: "계산기" } satisfies WindowItem;
const TERMINAL = { id: "terminal", title: "터미널" } satisfies WindowItem;
const NOTES = { id: "notes", title: "메모장" } satisfies WindowItem;
const WINDOWS_ITEMS = [CALCULATOR, TERMINAL, NOTES] satisfies readonly WindowItem[];

const subscribe: SubscribeWindowEvent = () => () => undefined;

const storePinnedIds = (pinnedIds: readonly string[]) => {
  window.localStorage.setItem(WINDOWS_PIN_STORAGE_KEY, JSON.stringify(pinnedIds));
};

const renderPinsValue = (
  dispatch: DispatchWindowEvent = vi.fn<DispatchWindowEvent>(),
  initialWindowsItems: readonly WindowItem[] = WINDOWS_ITEMS,
) => {
  let windowsItems = initialWindowsItems;

  const Wrapper = ({ children }: PropsWithChildren) => (
    <WindowsEventsContext.Provider value={{ dispatch, subscribe }}>
      <WindowsItemsContext.Provider value={windowsItems}>{children}</WindowsItemsContext.Provider>
    </WindowsEventsContext.Provider>
  );
  const rendered = renderHook(() => useWindowsPinsValue(), { wrapper: Wrapper });

  return {
    ...rendered,
    rerenderWithWindowsItems: (nextWindowsItems: readonly WindowItem[]) => {
      windowsItems = nextWindowsItems;
      rendered.rerender();
    },
  };
};

const restorePins = async (
  pinnedIds: readonly string[],
  dispatch: DispatchWindowEvent = vi.fn<DispatchWindowEvent>(),
  windowsItems: readonly WindowItem[] = WINDOWS_ITEMS,
) => {
  storePinnedIds(pinnedIds);
  const rendered = renderPinsValue(dispatch, windowsItems);
  await waitFor(() => expect(rendered.result.current.pinnedIds).toEqual(pinnedIds));
  return rendered;
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("useWindowsPinsValue", () => {
  describe("초기 상태와 복원", () => {
    it("localStorage가 비어 있으면 빈 Windows pin 목록으로 시작한다", () => {
      const { result } = renderPinsValue();

      expect(result.current.pinnedIds).toEqual([]);
    });

    it("Windows 전용 localStorage의 pin ID를 저장된 순서대로 복원한다", async () => {
      const { result } = await restorePins(["terminal", "calculator"]);

      expect(result.current.pinnedIds).toEqual(["terminal", "calculator"]);
    });

    it("localStorage에서 pin 목록을 복원할 때는 사용자 action event를 전달하지 않는다", async () => {
      const dispatch = vi.fn<DispatchWindowEvent>();

      const { result } = await restorePins(["terminal"], dispatch);

      expect(result.current.mutation).toBeNull();
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe("조회", () => {
    it("isPinned은 현재 pin 목록에 item이 포함되어 있는지 반환한다", async () => {
      const { result } = await restorePins(["calculator"]);

      expect(result.current.isPinned("calculator")).toBe(true);
      expect(result.current.isPinned("terminal")).toBe(false);
    });
  });

  describe("pin", () => {
    it("유효한 item을 기존 pin 목록 마지막에 추가한다", async () => {
      const { result } = await restorePins(["calculator"]);

      act(() => result.current.pin("terminal"));

      expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]);
    });

    it("item을 pin하면 변경된 목록을 Windows 전용 localStorage에 저장한다", () => {
      const { result } = renderPinsValue();

      act(() => result.current.pin("calculator"));

      expect(window.localStorage.getItem(WINDOWS_PIN_STORAGE_KEY)).toBe(
        JSON.stringify(["calculator"]),
      );
    });

    it("item을 pin하면 event로 추가한 item과 변경 전·후 pin 목록을 전달한다", () => {
      const dispatch = vi.fn<DispatchWindowEvent>();
      const { result } = renderPinsValue(dispatch);

      act(() => result.current.pin("calculator"));

      expect(dispatch).toHaveBeenCalledOnce();
      expect(dispatch).toHaveBeenCalledWith("windowPinToStart", {
        itemId: "calculator",
        pinnedIds: ["calculator"],
        previousPinnedIds: [],
      });
    });

    it("item을 pin하면 들어오는 animation이 사용할 item과 변경 전·후 pin 목록을 기록한다", () => {
      const { result } = renderPinsValue();

      act(() => result.current.pin("calculator"));

      expect(result.current.mutation).toEqual({
        itemId: "calculator",
        pinnedIds: ["calculator"],
        previousPinnedIds: [],
        revision: 1,
        type: "pin",
      });
    });

    it("이미 pin된 item을 다시 pin해도 pin 목록, localStorage와 event는 변경되지 않는다", async () => {
      const dispatch = vi.fn<DispatchWindowEvent>();
      const { result } = await restorePins(["calculator"], dispatch);
      const setItem = vi.spyOn(Storage.prototype, "setItem");

      act(() => result.current.pin("calculator"));

      expect(result.current.pinnedIds).toEqual(["calculator"]);
      expect(window.localStorage.getItem(WINDOWS_PIN_STORAGE_KEY)).toBe(
        JSON.stringify(["calculator"]),
      );
      expect(result.current.mutation).toBeNull();
      expect(setItem).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    });

    it("windowsItems에 없는 item을 pin해도 pin 목록, localStorage와 event는 변경되지 않는다", () => {
      const dispatch = vi.fn<DispatchWindowEvent>();
      const { result } = renderPinsValue(dispatch);
      const setItem = vi.spyOn(Storage.prototype, "setItem");

      act(() => result.current.pin("missing"));

      expect(result.current.pinnedIds).toEqual([]);
      expect(window.localStorage.getItem(WINDOWS_PIN_STORAGE_KEY)).toBeNull();
      expect(result.current.mutation).toBeNull();
      expect(setItem).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe("unpin", () => {
    it("중간 item을 unpin하면 나머지 pin의 순서를 유지한 채 해당 item만 제거한다", async () => {
      const { result } = await restorePins(["calculator", "terminal", "notes"]);

      act(() => result.current.unpin("terminal"));

      expect(result.current.pinnedIds).toEqual(["calculator", "notes"]);
    });

    it("item을 unpin하면 변경된 목록을 Windows 전용 localStorage에 저장한다", async () => {
      const { result } = await restorePins(["calculator", "terminal"]);

      act(() => result.current.unpin("calculator"));

      expect(window.localStorage.getItem(WINDOWS_PIN_STORAGE_KEY)).toBe(
        JSON.stringify(["terminal"]),
      );
    });

    it("item을 unpin하면 event로 제거한 item과 변경 전·후 pin 목록을 전달한다", async () => {
      const dispatch = vi.fn<DispatchWindowEvent>();
      const { result } = await restorePins(["calculator", "terminal"], dispatch);

      act(() => result.current.unpin("calculator"));

      expect(dispatch).toHaveBeenCalledOnce();
      expect(dispatch).toHaveBeenCalledWith("windowUnpinFromStart", {
        itemId: "calculator",
        pinnedIds: ["terminal"],
        previousPinnedIds: ["calculator", "terminal"],
      });
    });

    it("item을 unpin하면 나가는 animation이 사용할 item과 변경 전·후 pin 목록을 기록한다", async () => {
      const { result } = await restorePins(["calculator", "terminal"]);

      act(() => result.current.unpin("calculator"));

      expect(result.current.mutation).toEqual({
        itemId: "calculator",
        pinnedIds: ["terminal"],
        previousPinnedIds: ["calculator", "terminal"],
        revision: 1,
        type: "unpin",
      });
    });

    it("pin되지 않은 item을 unpin해도 pin 목록, localStorage와 event는 변경되지 않는다", async () => {
      const dispatch = vi.fn<DispatchWindowEvent>();
      const { result } = await restorePins(["calculator"], dispatch);
      const setItem = vi.spyOn(Storage.prototype, "setItem");

      act(() => result.current.unpin("terminal"));

      expect(result.current.pinnedIds).toEqual(["calculator"]);
      expect(window.localStorage.getItem(WINDOWS_PIN_STORAGE_KEY)).toBe(
        JSON.stringify(["calculator"]),
      );
      expect(result.current.mutation).toBeNull();
      expect(setItem).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe("pin 순서 변경", () => {
    it("pin 순서를 변경하면 item을 요청한 위치로 즉시 이동하고 나머지 item의 상대 순서를 유지한다", async () => {
      const { result } = await restorePins(["calculator", "terminal", "notes"]);

      act(() => result.current.reorder("notes", 0));

      expect(result.current.pinnedIds).toEqual(["notes", "calculator", "terminal"]);
    });

    it("pin 순서를 변경하면 변경된 순서를 Windows 전용 localStorage에 즉시 저장한다", async () => {
      const { result } = await restorePins(["calculator", "terminal", "notes"]);

      act(() => result.current.reorder("notes", 0));

      expect(window.localStorage.getItem(WINDOWS_PIN_STORAGE_KEY)).toBe(
        JSON.stringify(["notes", "calculator", "terminal"]),
      );
    });

    it("pin 순서를 변경하면 event로 이동한 item, 이전 위치, 새 위치와 변경 전·후 pin 목록을 전달한다", async () => {
      const dispatch = vi.fn<DispatchWindowEvent>();
      const { result } = await restorePins(["calculator", "terminal", "notes"], dispatch);

      act(() => result.current.reorder("notes", 0));

      expect(dispatch).toHaveBeenCalledOnce();
      expect(dispatch).toHaveBeenCalledWith("windowsPinsReordered", {
        fromIndex: 2,
        movedItemId: "notes",
        pinnedIds: ["notes", "calculator", "terminal"],
        previousPinnedIds: ["calculator", "terminal", "notes"],
        toIndex: 0,
      });
    });

    it("pin 순서를 변경하면 animation이 사용할 item, 이전 위치, 새 위치와 변경 전·후 pin 목록을 기록한다", async () => {
      const { result } = await restorePins(["calculator", "terminal", "notes"]);

      act(() => result.current.reorder("notes", 0));

      expect(result.current.mutation).toEqual({
        fromIndex: 2,
        itemId: "notes",
        pinnedIds: ["notes", "calculator", "terminal"],
        previousPinnedIds: ["calculator", "terminal", "notes"],
        revision: 1,
        toIndex: 0,
        type: "reorder",
      });
    });

    it("pin되지 않은 item의 순서 변경을 요청해도 pin 목록, localStorage와 event는 변경되지 않는다", async () => {
      const dispatch = vi.fn<DispatchWindowEvent>();
      const { result } = await restorePins(["calculator", "terminal"], dispatch);
      const setItem = vi.spyOn(Storage.prototype, "setItem");

      act(() => result.current.reorder("missing", 0));

      expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]);
      expect(window.localStorage.getItem(WINDOWS_PIN_STORAGE_KEY)).toBe(
        JSON.stringify(["calculator", "terminal"]),
      );
      expect(result.current.mutation).toBeNull();
      expect(setItem).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    });

    it("정수가 아니거나 목록 범위를 벗어난 위치로 이동을 요청해도 아무 상태도 변경되지 않는다", async () => {
      const dispatch = vi.fn<DispatchWindowEvent>();
      const { result } = await restorePins(["calculator", "terminal"], dispatch);
      const setItem = vi.spyOn(Storage.prototype, "setItem");

      act(() => {
        result.current.reorder("calculator", -1);
        result.current.reorder("calculator", 2);
        result.current.reorder("calculator", 0.5);
      });

      expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]);
      expect(window.localStorage.getItem(WINDOWS_PIN_STORAGE_KEY)).toBe(
        JSON.stringify(["calculator", "terminal"]),
      );
      expect(result.current.mutation).toBeNull();
      expect(setItem).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    });

    it("현재와 같은 위치로 이동을 요청해도 아무 상태도 변경되지 않는다", async () => {
      const dispatch = vi.fn<DispatchWindowEvent>();
      const { result } = await restorePins(["calculator", "terminal"], dispatch);
      const setItem = vi.spyOn(Storage.prototype, "setItem");

      act(() => result.current.reorder("calculator", 0));

      expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]);
      expect(window.localStorage.getItem(WINDOWS_PIN_STORAGE_KEY)).toBe(
        JSON.stringify(["calculator", "terminal"]),
      );
      expect(result.current.mutation).toBeNull();
      expect(setItem).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe("연속 변경", () => {
    it("pin 목록을 여러 번 바꾸면 animation이 이전 변경과 혼동하지 않도록 각 변경을 새 기록으로 구분한다", () => {
      const { result } = renderPinsValue();
      const changes: unknown[] = [];

      act(() => result.current.pin("calculator"));
      changes.push(result.current.mutation);

      act(() => result.current.pin("terminal"));
      changes.push(result.current.mutation);

      act(() => result.current.unpin("calculator"));
      changes.push(result.current.mutation);

      expect(changes).toMatchObject([
        { itemId: "calculator", revision: 1, type: "pin" },
        { itemId: "terminal", revision: 2, type: "pin" },
        { itemId: "calculator", revision: 3, type: "unpin" },
      ]);
      expect(new Set(changes).size).toBe(3);
    });

    it("화면이 다시 그려지기 전에 여러 item을 연속으로 pin해도 각 변경은 바로 직전 pin 목록을 기준으로 처리한다", () => {
      const dispatch = vi.fn<DispatchWindowEvent>();
      const { result } = renderPinsValue(dispatch);

      act(() => {
        result.current.pin("calculator");
        result.current.pin("terminal");
      });

      expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]);
      expect(dispatch).toHaveBeenNthCalledWith(1, "windowPinToStart", {
        itemId: "calculator",
        pinnedIds: ["calculator"],
        previousPinnedIds: [],
      });
      expect(dispatch).toHaveBeenNthCalledWith(2, "windowPinToStart", {
        itemId: "terminal",
        pinnedIds: ["calculator", "terminal"],
        previousPinnedIds: ["calculator"],
      });
      expect(result.current.mutation).toEqual({
        itemId: "terminal",
        pinnedIds: ["calculator", "terminal"],
        previousPinnedIds: ["calculator"],
        revision: 2,
        type: "pin",
      });
    });
  });

  describe("외부 상태 동기화", () => {
    it("windowsItems에서 item이 사라지면 pin 목록과 localStorage에서 제거하되 사용자가 unpin한 것으로 알리지 않는다", async () => {
      const dispatch = vi.fn<DispatchWindowEvent>();
      const { result, rerenderWithWindowsItems } = await restorePins(
        ["calculator", "terminal", "notes"],
        dispatch,
      );

      rerenderWithWindowsItems([CALCULATOR, NOTES]);

      await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "notes"]));
      expect(window.localStorage.getItem(WINDOWS_PIN_STORAGE_KEY)).toBe(
        JSON.stringify(["calculator", "notes"]),
      );
      expect(result.current.mutation).toBeNull();
      expect(dispatch).not.toHaveBeenCalled();
    });
  });
});
