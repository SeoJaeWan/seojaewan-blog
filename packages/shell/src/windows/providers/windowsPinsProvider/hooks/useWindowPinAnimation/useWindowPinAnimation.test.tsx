import type { AnimationEvent, TransitionEvent } from "react";

import type { WindowItem } from "@window/ui";

import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WindowsItemsContext } from "../../../windowsItemsProvider/context";
import { WindowsPinsContext } from "../../context";
import type { WindowsPinsContextValue, WindowsPinsMutation } from "../../types";
import { useWindowPinAnimation } from "./index";

const CALCULATOR = { id: "calculator", title: "계산기" } satisfies WindowItem;
const TERMINAL = { id: "terminal", title: "터미널" } satisfies WindowItem;
const NOTES = { id: "notes", title: "메모장" } satisfies WindowItem;

const createPinsValue = (
  pinnedIds: readonly string[],
  mutation: WindowsPinsMutation | null = null,
): WindowsPinsContextValue => ({
  isPinned: (itemId) => pinnedIds.includes(itemId),
  mutation,
  pin: vi.fn(),
  pinnedIds,
  reorder: vi.fn(),
  unpin: vi.fn(),
});

interface HookHarnessProps {
  pins: WindowsPinsContextValue;
  windowsItems: readonly WindowItem[];
}

const HookHarness = ({ pins, windowsItems }: HookHarnessProps) => (
  <WindowsItemsContext.Provider value={windowsItems}>
    <WindowsPinsContext.Provider value={pins}>
      <AnimationObservation />
    </WindowsPinsContext.Provider>
  </WindowsItemsContext.Provider>
);

const AnimationObservation = () => {
  const animation = useWindowPinAnimation();

  return (
    <div>
      <output data-testid="pinned-items">
        {JSON.stringify(animation.pinnedItems.map((item) => item.id))}
      </output>
      <output data-testid="pin-animation">{JSON.stringify(animation.pinnedItemAnimation)}</output>
      {animation.pinnedItems.map((item) => (
        <button
          data-testid={`pin-item-${item.id}`}
          key={item.id}
          onAnimationEnd={(event: AnimationEvent<HTMLButtonElement>) =>
            animation.onPinnedItemAnimationEnd(event, item)
          }
          onTransitionEnd={(event: TransitionEvent<HTMLButtonElement>) =>
            animation.onPinnedItemTransitionEnd(event, item)
          }
          type="button"
        >
          <span>{item.title}</span>
        </button>
      ))}
    </div>
  );
};

const expectPinnedItems = (pinnedIds: readonly string[]) => {
  expect(screen.getByTestId("pinned-items").textContent).toBe(JSON.stringify(pinnedIds));
};

const expectAnimation = (animation: { itemId: string; phase: "in" | "out" } | null) => {
  expect(screen.getByTestId("pin-animation").textContent).toBe(JSON.stringify(animation));
};

const fireAnimationEnd = (element: Element, animationName: string) => {
  const event = document.createEvent("Event");
  event.initEvent("webkitAnimationEnd", true, false);
  Object.defineProperty(event, "animationName", { value: animationName });
  fireEvent(element, event);
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useWindowPinAnimation", () => {
  it("Windows 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useWindowPinAnimation())).toThrow(
      "useWindowPinAnimation은 Windows 안에서 사용해야 합니다.",
    );
  });

  it("Context의 canonical ID 순서대로 현재 WindowItem을 반환한다", () => {
    render(
      <HookHarness
        pins={createPinsValue(["terminal", "calculator"])}
        windowsItems={[CALCULATOR, TERMINAL]}
      />,
    );

    expectPinnedItems(["terminal", "calculator"]);
    expectAnimation(null);
  });

  it("pin mutation을 받으면 새 item에 in animation을 적용하고 animationend로 완료한다", () => {
    const { rerender } = render(
      <HookHarness pins={createPinsValue(["calculator"])} windowsItems={[CALCULATOR, TERMINAL]} />,
    );
    const pinnedIds = ["calculator", "terminal"];

    rerender(
      <HookHarness
        pins={createPinsValue(pinnedIds, {
          itemId: "terminal",
          pinnedIds,
          previousPinnedIds: ["calculator"],
          revision: 1,
          type: "pin",
        })}
        windowsItems={[CALCULATOR, TERMINAL]}
      />,
    );

    expectPinnedItems(pinnedIds);
    expectAnimation({ itemId: "terminal", phase: "in" });

    fireAnimationEnd(screen.getByTestId("pin-item-terminal"), "other-animation");
    expectAnimation({ itemId: "terminal", phase: "in" });

    fireAnimationEnd(screen.getByTestId("pin-item-terminal"), "wb-windows-fade-in");
    expectAnimation(null);
  });

  it("unpin mutation을 받으면 이전 item을 out 동안 유지하고 transitionend 뒤 제거한다", () => {
    const previousPinnedIds = ["calculator", "terminal"];
    const { rerender } = render(
      <HookHarness
        pins={createPinsValue(previousPinnedIds)}
        windowsItems={[CALCULATOR, TERMINAL]}
      />,
    );

    rerender(
      <HookHarness
        pins={createPinsValue(["terminal"], {
          itemId: "calculator",
          pinnedIds: ["terminal"],
          previousPinnedIds,
          revision: 1,
          type: "unpin",
        })}
        windowsItems={[CALCULATOR, TERMINAL]}
      />,
    );

    expectPinnedItems(previousPinnedIds);
    expectAnimation({ itemId: "calculator", phase: "out" });

    fireEvent.transitionEnd(screen.getByTestId("pin-item-calculator"), {
      propertyName: "opacity",
    });
    expectPinnedItems(previousPinnedIds);

    fireEvent.transitionEnd(screen.getByTestId("pin-item-calculator"), {
      propertyName: "transform",
    });
    expectPinnedItems(["terminal"]);
    expectAnimation(null);
  });

  it("windowsItems에서 사라진 stale item snapshot을 out 완료까지 유지한다", () => {
    const previousPinnedIds = ["calculator", "terminal"];
    const { rerender } = render(
      <HookHarness
        pins={createPinsValue(previousPinnedIds)}
        windowsItems={[CALCULATOR, TERMINAL]}
      />,
    );

    rerender(
      <HookHarness pins={createPinsValue(["calculator"])} windowsItems={[CALCULATOR, NOTES]} />,
    );

    expectPinnedItems(previousPinnedIds);
    expect(screen.getByTestId("pin-item-terminal").textContent).toBe("터미널");
    expectAnimation({ itemId: "terminal", phase: "out" });

    fireEvent.transitionEnd(screen.getByTestId("pin-item-terminal"), {
      propertyName: "transform",
    });

    expectPinnedItems(["calculator"]);
    expect(screen.queryByTestId("pin-item-terminal")).toBeNull();
  });

  it("reorder mutation은 이전 순서의 out 뒤 canonical 순서의 in으로 투영한다", () => {
    const previousPinnedIds = ["calculator", "terminal"];
    const pinnedIds = ["terminal", "calculator"];
    const { rerender } = render(
      <HookHarness
        pins={createPinsValue(previousPinnedIds)}
        windowsItems={[CALCULATOR, TERMINAL]}
      />,
    );

    rerender(
      <HookHarness
        pins={createPinsValue(pinnedIds, {
          fromIndex: 1,
          itemId: "terminal",
          pinnedIds,
          previousPinnedIds,
          revision: 1,
          toIndex: 0,
          type: "reorder",
        })}
        windowsItems={[CALCULATOR, TERMINAL]}
      />,
    );

    expectPinnedItems(previousPinnedIds);
    expectAnimation({ itemId: "terminal", phase: "out" });

    fireEvent.transitionEnd(screen.getByTestId("pin-item-terminal"), {
      propertyName: "transform",
    });
    expectPinnedItems(pinnedIds);
    expectAnimation({ itemId: "terminal", phase: "in" });

    fireAnimationEnd(screen.getByTestId("pin-item-terminal"), "wb-windows-fade-in");
    expectAnimation(null);
  });

  it("DOM 완료 event가 누락되면 500ms watchdog이 현재 단계를 완료한다", () => {
    vi.useFakeTimers();
    const previousPinnedIds = ["calculator", "terminal"];
    const { rerender } = render(
      <HookHarness
        pins={createPinsValue(previousPinnedIds)}
        windowsItems={[CALCULATOR, TERMINAL]}
      />,
    );

    rerender(
      <HookHarness
        pins={createPinsValue(["terminal"], {
          itemId: "calculator",
          pinnedIds: ["terminal"],
          previousPinnedIds,
          revision: 1,
          type: "unpin",
        })}
        windowsItems={[CALCULATOR, TERMINAL]}
      />,
    );
    expectAnimation({ itemId: "calculator", phase: "out" });

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expectPinnedItems(previousPinnedIds);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expectPinnedItems(["terminal"]);
    expectAnimation(null);
  });
});
