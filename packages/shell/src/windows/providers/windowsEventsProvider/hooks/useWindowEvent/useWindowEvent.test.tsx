import { cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WindowItemEvent } from "../../../../types";
import { useWindowDispatch, WindowsEventsProvider } from "../..";
import { useWindowEvent } from "./";

const WINDOW_ITEM_EVENT: WindowItemEvent = {
  item: { id: "calculator", title: "계산기" },
  source: "search",
};

type ObservableEventName = "windowOpen" | "windowOpenLocation";

interface ObserverProps {
  eventName: ObservableEventName;
  listener: (event: WindowItemEvent) => void;
}

const Observer = ({ eventName, listener }: ObserverProps) => {
  useWindowEvent(eventName, listener);
  return null;
};

const Dispatcher = () => {
  const dispatch = useWindowDispatch();

  return (
    <div>
      <button onClick={() => dispatch("windowOpen", WINDOW_ITEM_EVENT)} type="button">
        open
      </button>
      <button onClick={() => dispatch("windowOpenLocation", WINDOW_ITEM_EVENT)} type="button">
        open location
      </button>
    </div>
  );
};

interface TestTreeProps {
  eventName?: ObservableEventName;
  listener?: ObserverProps["listener"];
}

const TestTree = ({ eventName = "windowOpen", listener }: TestTreeProps) => (
  <WindowsEventsProvider>
    {listener ? <Observer eventName={eventName} listener={listener} /> : null}
    <Dispatcher />
  </WindowsEventsProvider>
);

afterEach(cleanup);

describe("useWindowEvent", () => {
  it("Windows 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useWindowEvent("windowOpen", vi.fn()))).toThrow(
      "useWindowEvent는 Windows 안에서 사용해야 합니다.",
    );
  });

  it("구독한 event name에서만 listener를 실행한다", () => {
    const listener = vi.fn();
    render(<TestTree listener={listener} />);

    fireEvent.click(screen.getByRole("button", { name: "open location" }));
    expect(listener).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^open$/ }));
    expect(listener).toHaveBeenCalledOnce();
  });

  it("구독한 event payload를 listener에 전달한다", () => {
    const listener = vi.fn();
    render(<TestTree listener={listener} />);

    fireEvent.click(screen.getByRole("button", { name: /^open$/ }));

    expect(listener).toHaveBeenCalledWith(WINDOW_ITEM_EVENT);
  });

  it("listener가 변경되면 최신 listener를 실행한다", () => {
    const previousListener = vi.fn();
    const nextListener = vi.fn();
    const { rerender } = render(<TestTree listener={previousListener} />);

    rerender(<TestTree listener={nextListener} />);
    fireEvent.click(screen.getByRole("button", { name: /^open$/ }));

    expect(previousListener).not.toHaveBeenCalled();
    expect(nextListener).toHaveBeenCalledOnce();
  });

  it("event name이 변경되면 이전 구독을 해제하고 새 event를 구독한다", () => {
    const listener = vi.fn();
    const { rerender } = render(<TestTree listener={listener} />);

    rerender(<TestTree eventName="windowOpenLocation" listener={listener} />);
    fireEvent.click(screen.getByRole("button", { name: /^open$/ }));
    expect(listener).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "open location" }));
    expect(listener).toHaveBeenCalledOnce();
  });

  it("observer가 unmount되면 구독을 해제한다", () => {
    const listener = vi.fn();
    const { rerender } = render(<TestTree listener={listener} />);

    fireEvent.click(screen.getByRole("button", { name: /^open$/ }));
    expect(listener).toHaveBeenCalledOnce();

    rerender(<TestTree />);
    fireEvent.click(screen.getByRole("button", { name: /^open$/ }));

    expect(listener).toHaveBeenCalledOnce();
  });
});
