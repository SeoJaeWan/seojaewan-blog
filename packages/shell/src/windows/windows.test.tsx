import { createElement, StrictMode, useContext } from "react";

import type { WindowItem } from "@window/ui";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useWindowEvent } from "./hooks/useWindowEvent";
import { Windows, WindowsControllerContext, WindowsStateContext } from "./index";
import type { WindowPinEvent, WindowsItemsUpdatedEvent } from "./types";

const INITIAL_ITEMS = [{ id: "calculator", title: "계산기" }] satisfies readonly WindowItem[];
const NEXT_ITEMS = [
  ...INITIAL_ITEMS,
  { id: "terminal", title: "터미널" },
] satisfies readonly WindowItem[];

interface WindowsItemsObserverProps {
  listener: (event: WindowsItemsUpdatedEvent) => void;
}

const WindowsItemsObserver = ({ listener }: WindowsItemsObserverProps) => {
  useWindowEvent("windowsItemsUpdated", listener);
  return null;
};

interface PinUpdateProbeProps {
  onEvent: (payload: WindowPinEvent) => void;
}

const PinUpdateProbe = ({ onEvent }: PinUpdateProbeProps) => {
  const state = useContext(WindowsStateContext);
  const controller = useContext(WindowsControllerContext);

  if (state === null || controller === null) {
    throw new Error("Windows context를 찾을 수 없습니다.");
  }

  useWindowEvent("windowPinToStart", (payload) => {
    onEvent(payload);
  });

  return createElement(
    "div",
    null,
    createElement(
      "output",
      { "data-testid": "windows-pins" },
      JSON.stringify(state.windowsPinnedIds),
    ),
    createElement(
      "button",
      {
        onClick: () =>
          controller.updateWindowsPinnedIds((previousPinnedIds) => {
            const pinnedIds = [...previousPinnedIds, "calculator"];

            return {
              event: {
                name: "windowPinToStart",
                payload: {
                  itemId: "calculator",
                  pinnedIds,
                  previousPinnedIds,
                },
              },
              pinnedIds,
            };
          }),
        type: "button",
      },
      "pin",
    ),
  );
};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("Windows", () => {
  it("최초 mount와 같은 items 참조에는 event를 발생시키지 않고 새 참조만 전달한다", () => {
    const listener = vi.fn();
    const createTree = (windowsItems: readonly WindowItem[]) =>
      createElement(Windows, {
        children: createElement(WindowsItemsObserver, { listener }),
        windowsItems,
      });
    const { rerender } = render(createTree(INITIAL_ITEMS));

    expect(listener).not.toHaveBeenCalled();

    rerender(createTree(INITIAL_ITEMS));
    expect(listener).not.toHaveBeenCalled();

    rerender(createTree(NEXT_ITEMS));
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({
      items: NEXT_ITEMS,
      previousItems: INITIAL_ITEMS,
    });
  });

  it("StrictMode에서도 items 참조 변경 event를 한 번만 전달한다", () => {
    const listener = vi.fn();
    const createTree = (windowsItems: readonly WindowItem[]) =>
      createElement(
        StrictMode,
        null,
        createElement(Windows, {
          children: createElement(WindowsItemsObserver, { listener }),
          windowsItems,
        }),
      );
    const { rerender } = render(createTree(INITIAL_ITEMS));

    rerender(createTree(NEXT_ITEMS));

    expect(listener).toHaveBeenCalledOnce();
  });

  it("pin update에서 완료 payload를 직접 전달하고 다음 render에 state를 반영한다", async () => {
    const onEvent = vi.fn<(payload: WindowPinEvent) => void>();

    render(
      createElement(Windows, {
        children: createElement(PinUpdateProbe, { onEvent }),
        windowsItems: INITIAL_ITEMS,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "pin" }));

    expect(onEvent).toHaveBeenCalledOnce();
    expect(onEvent).toHaveBeenCalledWith({
      itemId: "calculator",
      pinnedIds: ["calculator"],
      previousPinnedIds: [],
    });
    await waitFor(() =>
      expect(screen.getByTestId("windows-pins").textContent).toBe(JSON.stringify(["calculator"])),
    );
  });
});
