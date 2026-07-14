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

interface PinCommitObservation {
  payload: WindowPinEvent;
  windowsPinnedIds: readonly string[];
}

interface PinCommitProbeProps {
  onEvent: (observation: PinCommitObservation) => void;
}

const PinCommitProbe = ({ onEvent }: PinCommitProbeProps) => {
  const state = useContext(WindowsStateContext);
  const controller = useContext(WindowsControllerContext);

  if (state === null || controller === null) {
    throw new Error("Windows context를 찾을 수 없습니다.");
  }

  useWindowEvent("windowPinToStart", (payload) => {
    onEvent({ payload, windowsPinnedIds: state.windowsPinnedIds });
  });

  return createElement(
    "button",
    {
      onClick: () =>
        controller.commitState(() => ({
          event: {
            name: "windowPinToStart",
            payload: {
              itemId: "calculator",
              pinnedIds: ["calculator"],
              previousPinnedIds: [],
            },
          },
          patch: { windowsPinnedIds: ["calculator"] },
        })),
      type: "button",
    },
    "pin",
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
      createElement(
        Windows,
        {
          children: createElement(WindowsItemsObserver, { listener }),
          windowsItems,
        },
      );
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
        createElement(
          Windows,
          {
            children: createElement(WindowsItemsObserver, { listener }),
            windowsItems,
          },
        ),
      );
    const { rerender } = render(createTree(INITIAL_ITEMS));

    rerender(createTree(NEXT_ITEMS));

    expect(listener).toHaveBeenCalledOnce();
  });

  it("mutable state를 commit한 render 뒤에 state event를 전달한다", async () => {
    const onEvent = vi.fn<(observation: PinCommitObservation) => void>();

    render(
      createElement(
        Windows,
        {
          children: createElement(PinCommitProbe, { onEvent }),
          windowsItems: INITIAL_ITEMS,
        },
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "pin" }));

    await waitFor(() => expect(onEvent).toHaveBeenCalledOnce());
    expect(onEvent).toHaveBeenCalledWith({
      payload: {
        itemId: "calculator",
        pinnedIds: ["calculator"],
        previousPinnedIds: [],
      },
      windowsPinnedIds: ["calculator"],
    });
  });
});
