import type { AnimationEvent, TransitionEvent } from "react";
import { createElement } from "react";

import type { WindowItem } from "@window/ui";

import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Windows } from "../..";
import { WINDOWS_PIN_STORAGE_KEY } from "../../providers/windowsPinsProvider/constants";
import type { WindowPinEvent, WindowPinsReorderedEvent } from "../../types";
import { useWindowEvent } from "../useWindowEvent";
import { useWindowsPins } from "../useWindowsPins";
import { useWindowPinAnimation } from "./index";

const WINDOW_PIN_STORAGE_KEYS = { windows: WINDOWS_PIN_STORAGE_KEY } as const;

const CALCULATOR = { id: "calculator", title: "계산기" } satisfies WindowItem;
const TERMINAL = { id: "terminal", title: "터미널" } satisfies WindowItem;
const NOTES = { id: "notes", title: "메모장" } satisfies WindowItem;
const WINDOWS_ITEMS = [CALCULATOR, TERMINAL, NOTES] satisfies readonly WindowItem[];

interface ReorderObservation {
  payload: WindowPinsReorderedEvent;
  pinnedIds: readonly string[];
}

interface LifecycleHarnessProps {
  onReorder?: (observation: ReorderObservation) => void;
  onUnpin?: (payload: WindowPinEvent) => void;
}

const LifecycleHarness = ({ onReorder, onUnpin }: LifecycleHarnessProps) => {
  const pins = useWindowsPins();
  const lifecycle = useWindowPinAnimation();

  useWindowEvent("windowsPinsReordered", (payload) => {
    onReorder?.({ payload, pinnedIds: payload.pinnedIds });
  });
  useWindowEvent("windowUnpinFromStart", (payload) => {
    onUnpin?.(payload);
  });
  return createElement(
    "div",
    null,
    createElement("output", { "data-testid": "pinned-ids" }, JSON.stringify(pins.pinnedIds)),
    createElement(
      "output",
      { "data-testid": "pinned-items" },
      JSON.stringify(lifecycle.pinnedItems.map((item) => item.id)),
    ),
    createElement(
      "output",
      { "data-testid": "pin-animation" },
      JSON.stringify(lifecycle.pinnedItemAnimation),
    ),
    createElement(
      "button",
      { onClick: () => lifecycle.reorder("terminal", 0), type: "button" },
      "request terminal first",
    ),
    createElement(
      "button",
      { onClick: () => pins.unpin("calculator"), type: "button" },
      "unpin calculator",
    ),
    lifecycle.pinnedItems.map((item) =>
      createElement(
        "button",
        {
          "data-testid": `pin-item-${item.id}`,
          key: item.id,
          onAnimationEnd: (event: AnimationEvent<HTMLButtonElement>) =>
            lifecycle.onPinnedItemAnimationEnd(event, item),
          onTransitionEnd: (event: TransitionEvent<HTMLButtonElement>) =>
            lifecycle.onPinnedItemTransitionEnd(event, item),
          type: "button",
        },
        item.title,
      ),
    ),
  );
};

const createTree = (windowsItems: readonly WindowItem[], props: LifecycleHarnessProps = {}) =>
  createElement(Windows, {
    children: createElement(LifecycleHarness, props),
    windowsItems,
  });

const expectOutput = async (
  testId: "pin-animation" | "pinned-ids" | "pinned-items",
  value: unknown,
) => {
  await waitFor(() => expect(screen.getByTestId(testId).textContent).toBe(JSON.stringify(value)));
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("useWindowPinAnimation", () => {
  it("Windows 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useWindowPinAnimation())).toThrow(
      "useWindowPinAnimation은 Windows 안에서 사용해야 합니다.",
    );
  });

  it("out 완료 뒤 reorder를 반영하고 in 완료 뒤 animation을 정리한다", async () => {
    const onReorder = vi.fn<(observation: ReorderObservation) => void>();

    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.windows,
      JSON.stringify(["calculator", "terminal"]),
    );
    render(createTree(WINDOWS_ITEMS, { onReorder }));
    await expectOutput("pinned-items", ["calculator", "terminal"]);

    fireEvent.click(screen.getByRole("button", { name: "request terminal first" }));

    await expectOutput("pin-animation", { itemId: "terminal", phase: "out" });
    expect(screen.getByTestId("pinned-ids").textContent).toBe(
      JSON.stringify(["calculator", "terminal"]),
    );
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBe(
      JSON.stringify(["calculator", "terminal"]),
    );

    fireEvent.transitionEnd(screen.getByTestId("pin-item-terminal"), {
      propertyName: "opacity",
    });
    expect(screen.getByTestId("pin-animation").textContent).toBe(
      JSON.stringify({ itemId: "terminal", phase: "out" }),
    );

    fireEvent.transitionEnd(screen.getByTestId("pin-item-terminal"), {
      propertyName: "transform",
    });

    await expectOutput("pinned-ids", ["terminal", "calculator"]);
    await expectOutput("pin-animation", { itemId: "terminal", phase: "in" });
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBe(
      JSON.stringify(["terminal", "calculator"]),
    );
    expect(onReorder).toHaveBeenCalledWith({
      payload: {
        fromIndex: 1,
        movedItemId: "terminal",
        pinnedIds: ["terminal", "calculator"],
        previousPinnedIds: ["calculator", "terminal"],
        toIndex: 0,
      },
      pinnedIds: ["terminal", "calculator"],
    });

    fireEvent.animationEnd(screen.getByTestId("pin-item-terminal"), {
      animationName: "other-animation",
    });
    expect(screen.getByTestId("pin-animation").textContent).toBe(
      JSON.stringify({ itemId: "terminal", phase: "in" }),
    );

    fireEvent.animationEnd(screen.getByTestId("pin-item-terminal"), {
      animationName: "wb-windows-fade-in",
    });
    await expectOutput("pin-animation", null);
  });

  it("사라진 item을 out 동안 유지하고 완료 뒤 event 없이 정리한다", async () => {
    const onUnpin = vi.fn();

    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.windows,
      JSON.stringify(["calculator", "terminal"]),
    );
    const { rerender } = render(createTree(WINDOWS_ITEMS, { onUnpin }));
    await expectOutput("pinned-items", ["calculator", "terminal"]);

    rerender(createTree([CALCULATOR, NOTES], { onUnpin }));

    await expectOutput("pin-animation", { itemId: "terminal", phase: "out" });
    expect(screen.getByTestId("pinned-items").textContent).toBe(
      JSON.stringify(["calculator", "terminal"]),
    );
    await expectOutput("pinned-ids", ["calculator"]);
    await waitFor(() =>
      expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBe(
        JSON.stringify(["calculator"]),
      ),
    );

    fireEvent.transitionEnd(screen.getByTestId("pin-item-terminal"), {
      propertyName: "transform",
    });

    await expectOutput("pinned-items", ["calculator"]);
    await expectOutput("pinned-ids", ["calculator"]);
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBe(
      JSON.stringify(["calculator"]),
    );
    expect(onUnpin).not.toHaveBeenCalled();
  });

  it("여러 stale item을 pin 순서대로 하나씩 정리한다", async () => {
    const onUnpin = vi.fn();

    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.windows,
      JSON.stringify(["calculator", "terminal", "notes"]),
    );
    const { rerender } = render(createTree(WINDOWS_ITEMS, { onUnpin }));
    await expectOutput("pinned-items", ["calculator", "terminal", "notes"]);

    rerender(createTree([CALCULATOR], { onUnpin }));
    await expectOutput("pin-animation", { itemId: "terminal", phase: "out" });

    fireEvent.transitionEnd(screen.getByTestId("pin-item-terminal"), {
      propertyName: "transform",
    });
    await expectOutput("pin-animation", { itemId: "notes", phase: "out" });

    fireEvent.transitionEnd(screen.getByTestId("pin-item-notes"), {
      propertyName: "transform",
    });
    await expectOutput("pinned-ids", ["calculator"]);
    await expectOutput("pin-animation", null);
    expect(onUnpin).not.toHaveBeenCalled();
  });

  it("복원 시 windowsItems에 없는 ID는 렌더하지 않고 즉시 조용히 제거한다", async () => {
    const onUnpin = vi.fn();

    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.windows,
      JSON.stringify(["missing", "calculator"]),
    );
    render(createTree([CALCULATOR], { onUnpin }));

    await expectOutput("pinned-ids", ["calculator"]);
    await expectOutput("pinned-items", ["calculator"]);
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBe(
      JSON.stringify(["calculator"]),
    );
    expect(onUnpin).not.toHaveBeenCalled();
  });

  it("animation event가 누락되면 watchdog이 stale cleanup을 완료한다", async () => {
    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.windows,
      JSON.stringify(["calculator", "terminal"]),
    );
    const { rerender } = render(createTree(WINDOWS_ITEMS));
    await expectOutput("pinned-items", ["calculator", "terminal"]);
    vi.useFakeTimers();

    rerender(createTree([CALCULATOR]));
    act(() => undefined);
    expect(screen.getByTestId("pin-animation").textContent).toBe(
      JSON.stringify({ itemId: "terminal", phase: "out" }),
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("pinned-items").textContent).toBe(JSON.stringify(["calculator"]));
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBe(
      JSON.stringify(["calculator"]),
    );
  });

  it("out 중 pin 배열이 바뀌면 캡처한 reorder를 취소한다", async () => {
    const onReorder = vi.fn();

    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.windows,
      JSON.stringify(["calculator", "terminal"]),
    );
    render(createTree(WINDOWS_ITEMS, { onReorder }));
    await expectOutput("pinned-items", ["calculator", "terminal"]);

    fireEvent.click(screen.getByRole("button", { name: "request terminal first" }));
    await expectOutput("pin-animation", { itemId: "terminal", phase: "out" });
    fireEvent.click(screen.getByRole("button", { name: "unpin calculator" }));
    await expectOutput("pinned-ids", ["terminal"]);

    fireEvent.transitionEnd(screen.getByTestId("pin-item-terminal"), {
      propertyName: "transform",
    });

    await expectOutput("pin-animation", null);
    expect(screen.getByTestId("pinned-ids").textContent).toBe(JSON.stringify(["terminal"]));
    expect(onReorder).not.toHaveBeenCalled();
  });
});
