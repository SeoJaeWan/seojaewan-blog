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

const renderPinAddition = () => {
  const rendered = render(
    <HookHarness pins={createPinsValue(["calculator"])} windowsItems={[CALCULATOR, TERMINAL]} />,
  );
  const pinnedIds = ["calculator", "terminal"];

  rendered.rerender(
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

  return rendered;
};

const renderCalculatorRemoval = () => {
  const previousPinnedIds = ["calculator", "terminal"];
  const rendered = render(
    <HookHarness pins={createPinsValue(previousPinnedIds)} windowsItems={[CALCULATOR, TERMINAL]} />,
  );

  rendered.rerender(
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

  return rendered;
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useWindowPinAnimation", () => {
  describe("사용 조건과 초기 표시", () => {
    it("Windows 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
      expect(() => renderHook(() => useWindowPinAnimation())).toThrow(
        "useWindowPinAnimation은 Windows 안에서 사용해야 합니다.",
      );
    });

    it("Provider가 제공한 pin ID 순서대로 현재 WindowItem을 반환한다", () => {
      render(
        <HookHarness
          pins={createPinsValue(["terminal", "calculator"])}
          windowsItems={[CALCULATOR, TERMINAL]}
        />,
      );

      expectPinnedItems(["terminal", "calculator"]);
      expectAnimation(null);
    });

    it("이전 변경 내용이 남은 상태로 다시 열어도 과거 animation을 재실행하지 않는다", () => {
      const pinnedIds = ["calculator", "terminal"];

      render(
        <HookHarness
          pins={createPinsValue(pinnedIds, {
            itemId: "terminal",
            pinnedIds,
            previousPinnedIds: ["calculator"],
            revision: 5,
            type: "pin",
          })}
          windowsItems={[CALCULATOR, TERMINAL]}
        />,
      );

      expectPinnedItems(pinnedIds);
      expectAnimation(null);
    });
  });

  describe("들어오는 animation", () => {
    it("item이 pin 목록에 추가되면 새 위치에서 들어오는 animation을 실행한다", () => {
      renderPinAddition();

      expectPinnedItems(["calculator", "terminal"]);
      expectAnimation({ itemId: "terminal", phase: "in" });
    });

    it("다른 animation과 하위 element의 완료 event는 현재 item의 animation을 끝내지 않는다", () => {
      renderPinAddition();

      fireAnimationEnd(screen.getByTestId("pin-item-terminal"), "other-animation");
      fireAnimationEnd(screen.getByText("터미널"), "wb-windows-fade-in");

      expectAnimation({ itemId: "terminal", phase: "in" });
    });

    it("들어오는 animation이 완료되면 해당 item의 animation 상태를 정리한다", () => {
      renderPinAddition();

      fireAnimationEnd(screen.getByTestId("pin-item-terminal"), "wb-windows-fade-in");

      expectPinnedItems(["calculator", "terminal"]);
      expectAnimation(null);
    });
  });

  describe("나가는 animation", () => {
    it("item이 unpin되면 이전 화면에 남겨 두고 나가는 animation을 실행한다", () => {
      renderCalculatorRemoval();

      expectPinnedItems(["calculator", "terminal"]);
      expectAnimation({ itemId: "calculator", phase: "out" });
    });

    it("다른 CSS 속성과 하위 element의 transition 완료 event는 item을 제거하지 않는다", () => {
      renderCalculatorRemoval();

      fireEvent.transitionEnd(screen.getByTestId("pin-item-calculator"), {
        propertyName: "opacity",
      });
      fireEvent.transitionEnd(screen.getByText("계산기"), {
        propertyName: "transform",
      });

      expectPinnedItems(["calculator", "terminal"]);
      expectAnimation({ itemId: "calculator", phase: "out" });
    });

    it("나가는 animation이 완료되면 해당 item을 화면에서 제거한다", () => {
      renderCalculatorRemoval();

      fireEvent.transitionEnd(screen.getByTestId("pin-item-calculator"), {
        propertyName: "transform",
      });

      expectPinnedItems(["terminal"]);
      expect(screen.queryByTestId("pin-item-calculator")).toBeNull();
      expectAnimation(null);
    });
  });

  describe("사라진 item 정보 유지", () => {
    it("windowsItems에서 사라진 item의 마지막 정보를 나가는 animation이 끝날 때까지 유지한다", () => {
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
  });

  describe("pin 순서 변경", () => {
    it("pin 순서가 바뀌면 이동한 item을 이전 위치에서 내보내고 새 위치에서 다시 들어오게 한다", () => {
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
  });

  describe("완료 event fallback", () => {
    it("나가는 animation의 완료 event가 없어도 500ms 뒤 item을 화면에서 제거한다", () => {
      vi.useFakeTimers();
      renderCalculatorRemoval();

      act(() => {
        vi.advanceTimersByTime(499);
      });
      expectPinnedItems(["calculator", "terminal"]);
      expectAnimation({ itemId: "calculator", phase: "out" });

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expectPinnedItems(["terminal"]);
      expectAnimation(null);
    });

    it("들어오는 animation의 완료 event가 없어도 500ms 뒤 animation 상태를 정리한다", () => {
      vi.useFakeTimers();
      renderPinAddition();

      act(() => {
        vi.advanceTimersByTime(499);
      });
      expectPinnedItems(["calculator", "terminal"]);
      expectAnimation({ itemId: "terminal", phase: "in" });

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expectPinnedItems(["calculator", "terminal"]);
      expectAnimation(null);
    });
  });
});
