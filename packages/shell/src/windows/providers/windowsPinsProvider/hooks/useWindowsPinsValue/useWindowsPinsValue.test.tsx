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

const renderPinsValue = (dispatch: DispatchWindowEvent = vi.fn<DispatchWindowEvent>()) =>
  renderHook(() => useWindowsPinsValue(), { wrapper: createWrapper(dispatch) });

const restorePins = async (
  pinnedIds: readonly string[],
  dispatch: DispatchWindowEvent = vi.fn<DispatchWindowEvent>(),
) => {
  window.localStorage.setItem(WINDOWS_PIN_STORAGE_KEY, JSON.stringify(pinnedIds));
  const rendered = renderPinsValue(dispatch);
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
  it("전용 storage의 pin 목록을 event 없이 복원한다", async () => {
    const dispatch = vi.fn<DispatchWindowEvent>();

    const { result } = await restorePins(["terminal"], dispatch);

    expect(result.current.pinnedIds).toEqual(["terminal"]);
    expect(result.current.mutation).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("현재 pin 여부를 반환한다", async () => {
    const { result } = await restorePins(["calculator"]);

    expect(result.current.isPinned("calculator")).toBe(true);
    expect(result.current.isPinned("terminal")).toBe(false);
  });

  it("유효한 item을 pin하고 state·storage·event·mutation을 함께 갱신한다", async () => {
    const dispatch = vi.fn<DispatchWindowEvent>();
    const { result } = renderPinsValue(dispatch);

    act(() => result.current.pin("calculator"));

    await waitFor(() => expect(result.current.pinnedIds).toEqual(["calculator"]));
    expect(window.localStorage.getItem(WINDOWS_PIN_STORAGE_KEY)).toBe(
      JSON.stringify(["calculator"]),
    );
    expect(dispatch).toHaveBeenCalledWith("windowPinToStart", {
      itemId: "calculator",
      pinnedIds: ["calculator"],
      previousPinnedIds: [],
    });
    expect(result.current.mutation).toEqual({
      itemId: "calculator",
      pinnedIds: ["calculator"],
      previousPinnedIds: [],
      revision: 1,
      type: "pin",
    });
  });

  it("이미 pin된 item의 pin 요청은 no-op이다", async () => {
    const dispatch = vi.fn<DispatchWindowEvent>();
    const { result } = await restorePins(["calculator"], dispatch);

    act(() => result.current.pin("calculator"));

    expect(result.current.pinnedIds).toEqual(["calculator"]);
    expect(result.current.mutation).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("존재하지 않는 item의 pin 요청은 no-op이다", () => {
    const dispatch = vi.fn<DispatchWindowEvent>();
    const { result } = renderPinsValue(dispatch);

    act(() => result.current.pin("missing"));

    expect(result.current.pinnedIds).toEqual([]);
    expect(result.current.mutation).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("pin된 item을 unpin하고 state·storage·event·mutation을 함께 갱신한다", async () => {
    const dispatch = vi.fn<DispatchWindowEvent>();
    const { result } = await restorePins(["calculator", "terminal"], dispatch);

    act(() => result.current.unpin("calculator"));

    await waitFor(() => expect(result.current.pinnedIds).toEqual(["terminal"]));
    expect(window.localStorage.getItem(WINDOWS_PIN_STORAGE_KEY)).toBe(JSON.stringify(["terminal"]));
    expect(dispatch).toHaveBeenCalledWith("windowUnpinFromStart", {
      itemId: "calculator",
      pinnedIds: ["terminal"],
      previousPinnedIds: ["calculator", "terminal"],
    });
    expect(result.current.mutation).toEqual({
      itemId: "calculator",
      pinnedIds: ["terminal"],
      previousPinnedIds: ["calculator", "terminal"],
      revision: 1,
      type: "unpin",
    });
  });

  it("pin되지 않은 item의 unpin 요청은 no-op이다", () => {
    const dispatch = vi.fn<DispatchWindowEvent>();
    const { result } = renderPinsValue(dispatch);

    act(() => result.current.unpin("calculator"));

    expect(result.current.pinnedIds).toEqual([]);
    expect(result.current.mutation).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("성공한 action마다 animation mutation revision을 증가시킨다", async () => {
    const { result } = renderPinsValue();

    act(() => result.current.pin("calculator"));
    await waitFor(() => expect(result.current.mutation?.revision).toBe(1));

    act(() => result.current.pin("terminal"));
    await waitFor(() => expect(result.current.mutation?.revision).toBe(2));

    act(() => result.current.unpin("calculator"));
    await waitFor(() => expect(result.current.mutation?.revision).toBe(3));
  });

  it("reorder 요청 즉시 canonical state·storage·event·mutation을 갱신한다", async () => {
    const dispatch = vi.fn<DispatchWindowEvent>();
    const { result } = await restorePins(["calculator", "terminal"], dispatch);

    act(() => result.current.reorder("terminal", 0));

    await waitFor(() => expect(result.current.pinnedIds).toEqual(["terminal", "calculator"]));
    expect(window.localStorage.getItem(WINDOWS_PIN_STORAGE_KEY)).toBe(
      JSON.stringify(["terminal", "calculator"]),
    );
    expect(dispatch).toHaveBeenCalledWith("windowsPinsReordered", {
      fromIndex: 1,
      movedItemId: "terminal",
      pinnedIds: ["terminal", "calculator"],
      previousPinnedIds: ["calculator", "terminal"],
      toIndex: 0,
    });
    expect(result.current.mutation).toEqual({
      fromIndex: 1,
      itemId: "terminal",
      pinnedIds: ["terminal", "calculator"],
      previousPinnedIds: ["calculator", "terminal"],
      revision: 1,
      toIndex: 0,
      type: "reorder",
    });
  });

  it("pin되지 않은 item의 reorder 요청은 no-op이다", async () => {
    const dispatch = vi.fn<DispatchWindowEvent>();
    const { result } = await restorePins(["calculator", "terminal"], dispatch);

    act(() => result.current.reorder("missing", 0));

    expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]);
    expect(result.current.mutation).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("범위 밖 index의 reorder 요청은 no-op이다", async () => {
    const dispatch = vi.fn<DispatchWindowEvent>();
    const { result } = await restorePins(["calculator", "terminal"], dispatch);

    act(() => {
      result.current.reorder("calculator", -1);
      result.current.reorder("calculator", 2);
      result.current.reorder("calculator", 0.5);
    });

    expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]);
    expect(result.current.mutation).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("같은 위치의 reorder 요청은 no-op이다", async () => {
    const dispatch = vi.fn<DispatchWindowEvent>();
    const { result } = await restorePins(["calculator", "terminal"], dispatch);

    act(() => result.current.reorder("calculator", 0));

    expect(result.current.pinnedIds).toEqual(["calculator", "terminal"]);
    expect(result.current.mutation).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
