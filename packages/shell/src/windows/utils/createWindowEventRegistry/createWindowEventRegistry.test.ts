import { describe, expect, it, vi } from "vitest";

import type { WindowItemEvent } from "../../types";
import { createWindowEventRegistry } from "./index";

const WINDOW_ITEM_EVENT: WindowItemEvent = {
  item: { id: "calculator", title: "계산기" },
  source: "search",
};

describe("createWindowEventRegistry", () => {
  it("event name에 등록된 listener만 호출하고 unsubscribe 뒤에는 호출하지 않는다", () => {
    const registry = createWindowEventRegistry();
    const openListener = vi.fn();
    const locationListener = vi.fn();
    const unsubscribeOpen = registry.subscribe("windowOpen", openListener);

    registry.subscribe("windowOpenLocation", locationListener);
    registry.emit("windowOpen", WINDOW_ITEM_EVENT);

    expect(openListener).toHaveBeenCalledOnce();
    expect(openListener).toHaveBeenCalledWith(WINDOW_ITEM_EVENT);
    expect(locationListener).not.toHaveBeenCalled();

    unsubscribeOpen();
    registry.emit("windowOpen", WINDOW_ITEM_EVENT);

    expect(openListener).toHaveBeenCalledOnce();
  });

  it("dispatch 시작 시점의 listener snapshot을 끝까지 순회한다", () => {
    const registry = createWindowEventRegistry();
    const calls: string[] = [];
    const thirdListener = () => calls.push("third");
    let unsubscribeSecond: () => void = () => undefined;

    registry.subscribe("windowOpen", () => {
      calls.push("first");
      unsubscribeSecond();
      registry.subscribe("windowOpen", thirdListener);
    });
    unsubscribeSecond = registry.subscribe("windowOpen", () => calls.push("second"));

    registry.emit("windowOpen", WINDOW_ITEM_EVENT);
    expect(calls).toEqual(["first", "second"]);

    calls.length = 0;
    registry.emit("windowOpen", WINDOW_ITEM_EVENT);
    expect(calls).toEqual(["first", "third"]);
  });

  it("listener 오류를 보고하고 나머지 listener와 dispatch 호출부를 유지한다", () => {
    const listenerError = new Error("observer failed");
    const reportError = vi.fn();
    const registry = createWindowEventRegistry({ reportError });
    const nextListener = vi.fn();

    registry.subscribe("windowOpen", () => {
      throw listenerError;
    });
    registry.subscribe("windowOpen", nextListener);

    expect(() => registry.emit("windowOpen", WINDOW_ITEM_EVENT)).not.toThrow();
    expect(reportError).toHaveBeenCalledOnce();
    expect(reportError).toHaveBeenCalledWith(listenerError);
    expect(nextListener).toHaveBeenCalledOnce();
  });
});
