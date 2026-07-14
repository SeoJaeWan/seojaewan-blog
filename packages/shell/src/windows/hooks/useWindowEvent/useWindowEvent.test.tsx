import { createElement } from "react";

import { cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Windows } from "../..";
import type { WindowItemEvent } from "../../types";
import { useWindowDispatch } from "../useWindowDispatch";
import { useWindowEvent } from "./index";

const WINDOWS_ITEMS = [{ id: "calculator", title: "계산기" }] as const;
const WINDOW_ITEM_EVENT: WindowItemEvent = {
  item: WINDOWS_ITEMS[0],
  source: "search",
};

interface ObserverProps {
  listener: (event: WindowItemEvent) => void;
}

const Observer = ({ listener }: ObserverProps) => {
  useWindowEvent("windowOpen", listener);
  return null;
};

const Dispatcher = () => {
  const dispatch = useWindowDispatch();

  return createElement(
    "div",
    null,
    createElement(
      "button",
      { onClick: () => dispatch("windowOpen", WINDOW_ITEM_EVENT), type: "button" },
      "open",
    ),
    createElement(
      "button",
      { onClick: () => dispatch("windowOpenLocation", WINDOW_ITEM_EVENT), type: "button" },
      "open location",
    ),
  );
};

const createTree = (listener?: ObserverProps["listener"]) =>
  createElement(
    Windows,
    {
      children: [
        listener ? createElement(Observer, { key: "observer", listener }) : null,
        createElement(Dispatcher, { key: "dispatcher" }),
      ],
      windowsItems: WINDOWS_ITEMS,
    },
  );

afterEach(cleanup);

describe("useWindowEvent", () => {
  it("Windows 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useWindowEvent("windowOpen", vi.fn()))).toThrow(
      "useWindowEvent는 Windows 안에서 사용해야 합니다.",
    );
  });

  it("event name이 일치할 때만 최신 listener를 실행한다", () => {
    const previousListener = vi.fn();
    const nextListener = vi.fn();
    const { rerender } = render(createTree(previousListener));

    rerender(createTree(nextListener));
    fireEvent.click(screen.getByRole("button", { name: "open location" }));
    expect(previousListener).not.toHaveBeenCalled();
    expect(nextListener).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^open$/ }));
    expect(previousListener).not.toHaveBeenCalled();
    expect(nextListener).toHaveBeenCalledOnce();
    expect(nextListener).toHaveBeenCalledWith(WINDOW_ITEM_EVENT);
  });

  it("observer가 unmount되면 구독을 해제한다", () => {
    const listener = vi.fn();
    const { rerender } = render(createTree(listener));

    fireEvent.click(screen.getByRole("button", { name: /^open$/ }));
    expect(listener).toHaveBeenCalledOnce();

    rerender(createTree());
    fireEvent.click(screen.getByRole("button", { name: /^open$/ }));

    expect(listener).toHaveBeenCalledOnce();
  });
});
