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

const WINDOWS_ITEMS = [
  { id: "calculator", title: "계산기" },
  { id: "terminal", title: "터미널" },
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

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("useWindowsPinsValue", () => {
  it("전용 storage를 event 없이 복원한다", async () => {
    const dispatch = vi.fn<DispatchWindowEvent>();
    window.localStorage.setItem(WINDOWS_PIN_STORAGE_KEY, JSON.stringify(["terminal"]));

    const { result } = renderHook(() => useWindowsPinsValue(), {
      wrapper: createWrapper(dispatch),
    });

    await waitFor(() => expect(result.current.pinnedIds).toEqual(["terminal"]));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("pin과 unpin을 저장하고 완료 event를 전달한다", async () => {
    const dispatch = vi.fn<DispatchWindowEvent>();
    const { result } = renderHook(() => useWindowsPinsValue(), {
      wrapper: createWrapper(dispatch),
    });

    act(() => result.current.pin("calculator"));

    await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator"]));
    expect(result.current.isPinned("calculator")).toBe(true);
    expect(window.localStorage.getItem(WINDOWS_PIN_STORAGE_KEY)).toBe(
      JSON.stringify(["calculator"]),
    );
    expect(dispatch).toHaveBeenLastCalledWith("windowPinToStart", {
      itemId: "calculator",
      pinnedIds: ["calculator"],
      previousPinnedIds: [],
    });

    act(() => result.current.unpin("calculator"));

    await waitFor(() => expect(result.current.pinnedIds).toEqual([]));
    expect(dispatch).toHaveBeenLastCalledWith("windowUnpinFromStart", {
      itemId: "calculator",
      pinnedIds: [],
      previousPinnedIds: ["calculator"],
    });
  });

  it("중복·없는 item pin과 없는 ID unpin은 no-op이다", () => {
    const dispatch = vi.fn<DispatchWindowEvent>();
    const { result } = renderHook(() => useWindowsPinsValue(), {
      wrapper: createWrapper(dispatch),
    });

    act(() => {
      result.current.pin("calculator");
      result.current.pin("calculator");
      result.current.pin("missing");
      result.current.unpin("missing");
    });

    expect(result.current.pinnedIds).toEqual(["calculator"]);
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it("유효한 reorder를 저장하고 완료 event를 전달한다", async () => {
    const dispatch = vi.fn<DispatchWindowEvent>();
    window.localStorage.setItem(
      WINDOWS_PIN_STORAGE_KEY,
      JSON.stringify(["calculator", "terminal"]),
    );
    const { result } = renderHook(() => useWindowsPinsValue(), {
      wrapper: createWrapper(dispatch),
    });
    await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]));

    act(() => result.current.applyReorder("terminal", 0));

    await waitFor(() => expect(result.current.pinnedIds).toEqual(["terminal", "calculator"]));
    expect(window.localStorage.getItem(WINDOWS_PIN_STORAGE_KEY)).toBe(
      JSON.stringify(["terminal", "calculator"]),
    );
    expect(dispatch).toHaveBeenLastCalledWith("windowsPinsReordered", {
      fromIndex: 1,
      movedItemId: "terminal",
      pinnedIds: ["terminal", "calculator"],
      previousPinnedIds: ["calculator", "terminal"],
      toIndex: 0,
    });
  });

  it("없는 ID, 범위 밖 index와 같은 위치 reorder는 no-op이다", async () => {
    const dispatch = vi.fn<DispatchWindowEvent>();
    window.localStorage.setItem(
      WINDOWS_PIN_STORAGE_KEY,
      JSON.stringify(["calculator", "terminal"]),
    );
    const { result } = renderHook(() => useWindowsPinsValue(), {
      wrapper: createWrapper(dispatch),
    });
    await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]));

    act(() => {
      result.current.applyReorder("missing", 0);
      result.current.applyReorder("calculator", -1);
      result.current.applyReorder("calculator", 0);
    });

    expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
