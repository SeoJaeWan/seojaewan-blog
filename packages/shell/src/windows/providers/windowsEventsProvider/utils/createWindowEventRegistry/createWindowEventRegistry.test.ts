import { describe, expect, it, vi } from "vitest";

import type { WindowItemEvent } from "../../../../types";
import { createWindowEventRegistry } from "./index";

const WINDOW_ITEM_EVENT: WindowItemEvent = {
  item: { id: "calculator", title: "계산기" },
  source: "search",
};

describe("createWindowEventRegistry", () => {
  describe("subscribe", () => {
    it("listener를 구독하면 해당 event를 수신한다", () => {
      const registry = createWindowEventRegistry();
      const listener = vi.fn();
      registry.subscribe("windowOpen", listener);

      registry.emit("windowOpen", WINDOW_ITEM_EVENT);

      expect(listener).toHaveBeenCalledOnce();
    });

    it("listener에 emit한 payload를 그대로 전달한다", () => {
      const registry = createWindowEventRegistry();
      const listener = vi.fn();
      registry.subscribe("windowOpen", listener);

      registry.emit("windowOpen", WINDOW_ITEM_EVENT);

      expect(listener).toHaveBeenCalledWith(WINDOW_ITEM_EVENT);
    });

    it("서로 다른 event name의 listener를 격리한다", () => {
      const registry = createWindowEventRegistry();
      const openListener = vi.fn();
      const locationListener = vi.fn();
      registry.subscribe("windowOpen", openListener);
      registry.subscribe("windowOpenLocation", locationListener);

      registry.emit("windowOpen", WINDOW_ITEM_EVENT);

      expect(openListener).toHaveBeenCalledOnce();
      expect(locationListener).not.toHaveBeenCalled();
    });

    it("같은 event에 등록된 여러 listener를 모두 호출한다", () => {
      const registry = createWindowEventRegistry();
      const firstListener = vi.fn();
      const secondListener = vi.fn();
      registry.subscribe("windowOpen", firstListener);
      registry.subscribe("windowOpen", secondListener);

      registry.emit("windowOpen", WINDOW_ITEM_EVENT);

      expect(firstListener).toHaveBeenCalledOnce();
      expect(secondListener).toHaveBeenCalledOnce();
    });

    it("같은 event에 같은 listener를 중복 구독해도 한 번만 호출한다", () => {
      const registry = createWindowEventRegistry();
      const listener = vi.fn();
      registry.subscribe("windowOpen", listener);
      registry.subscribe("windowOpen", listener);

      registry.emit("windowOpen", WINDOW_ITEM_EVENT);

      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe("unsubscribe", () => {
    it("반환된 함수로 listener 구독을 해제한다", () => {
      const registry = createWindowEventRegistry();
      const listener = vi.fn();
      const unsubscribe = registry.subscribe("windowOpen", listener);

      unsubscribe();
      registry.emit("windowOpen", WINDOW_ITEM_EVENT);

      expect(listener).not.toHaveBeenCalled();
    });

    it("하나의 listener를 해제해도 같은 event의 다른 listener는 유지한다", () => {
      const registry = createWindowEventRegistry();
      const removedListener = vi.fn();
      const remainingListener = vi.fn();
      const unsubscribe = registry.subscribe("windowOpen", removedListener);
      registry.subscribe("windowOpen", remainingListener);

      unsubscribe();
      registry.emit("windowOpen", WINDOW_ITEM_EVENT);

      expect(removedListener).not.toHaveBeenCalled();
      expect(remainingListener).toHaveBeenCalledOnce();
    });

    it.each([
      { label: "첫 번째", unsubscribeIndex: 0 },
      { label: "두 번째", unsubscribeIndex: 1 },
    ])(
      "중복 구독에서 $label unsubscribe를 호출하면 논리적 구독 전체를 해제한다",
      ({ unsubscribeIndex }) => {
        const registry = createWindowEventRegistry();
        const listener = vi.fn();
        const unsubscribes = [
          registry.subscribe("windowOpen", listener),
          registry.subscribe("windowOpen", listener),
        ];

        unsubscribes[unsubscribeIndex]?.();
        registry.emit("windowOpen", WINDOW_ITEM_EVENT);

        expect(listener).not.toHaveBeenCalled();
      },
    );

    it("구독 해제 함수를 반복 호출해도 다른 구독에 영향을 주지 않는다", () => {
      const registry = createWindowEventRegistry();
      const removedListener = vi.fn();
      const remainingListener = vi.fn();
      const unsubscribe = registry.subscribe("windowOpen", removedListener);
      registry.subscribe("windowOpen", remainingListener);

      unsubscribe();
      unsubscribe();
      registry.emit("windowOpen", WINDOW_ITEM_EVENT);

      expect(removedListener).not.toHaveBeenCalled();
      expect(remainingListener).toHaveBeenCalledOnce();
    });
  });

  describe("emit", () => {
    it("listener가 없는 event는 아무 동작 없이 종료한다", () => {
      const registry = createWindowEventRegistry();

      expect(() => registry.emit("windowOpen", WINDOW_ITEM_EVENT)).not.toThrow();
    });

    it("listener를 등록한 순서대로 호출한다", () => {
      const registry = createWindowEventRegistry();
      const calls: string[] = [];
      registry.subscribe("windowOpen", () => calls.push("first"));
      registry.subscribe("windowOpen", () => calls.push("second"));
      registry.subscribe("windowOpen", () => calls.push("third"));

      registry.emit("windowOpen", WINDOW_ITEM_EVENT);

      expect(calls).toEqual(["first", "second", "third"]);
    });
  });

  describe("dispatch snapshot", () => {
    it("dispatch 도중 해제된 listener도 현재 dispatch에서는 호출한다", () => {
      const registry = createWindowEventRegistry();
      const calls: string[] = [];
      let unsubscribeSecond: () => void = () => undefined;
      registry.subscribe("windowOpen", () => {
        calls.push("first");
        unsubscribeSecond();
      });
      unsubscribeSecond = registry.subscribe("windowOpen", () => calls.push("second"));

      registry.emit("windowOpen", WINDOW_ITEM_EVENT);

      expect(calls).toEqual(["first", "second"]);

      calls.length = 0;
      registry.emit("windowOpen", WINDOW_ITEM_EVENT);
      expect(calls).toEqual(["first"]);
    });

    it("dispatch 도중 추가된 listener는 다음 dispatch부터 호출한다", () => {
      const registry = createWindowEventRegistry();
      const calls: string[] = [];
      const addedListener = () => calls.push("added");
      registry.subscribe("windowOpen", () => {
        calls.push("initial");
        registry.subscribe("windowOpen", addedListener);
      });

      registry.emit("windowOpen", WINDOW_ITEM_EVENT);
      expect(calls).toEqual(["initial"]);

      calls.length = 0;
      registry.emit("windowOpen", WINDOW_ITEM_EVENT);
      expect(calls).toEqual(["initial", "added"]);
    });
  });

  describe("listener 오류", () => {
    it("listener 오류를 reporter에 전달한다", () => {
      const listenerError = new Error("observer failed");
      const reportError = vi.fn();
      const registry = createWindowEventRegistry({ reportError });
      registry.subscribe("windowOpen", () => {
        throw listenerError;
      });

      registry.emit("windowOpen", WINDOW_ITEM_EVENT);

      expect(reportError).toHaveBeenCalledOnce();
      expect(reportError).toHaveBeenCalledWith(listenerError);
    });

    it("listener 오류가 발생해도 다음 listener를 호출한다", () => {
      const registry = createWindowEventRegistry({ reportError: vi.fn() });
      const nextListener = vi.fn();
      registry.subscribe("windowOpen", () => {
        throw new Error("observer failed");
      });
      registry.subscribe("windowOpen", nextListener);

      registry.emit("windowOpen", WINDOW_ITEM_EVENT);

      expect(nextListener).toHaveBeenCalledOnce();
    });

    it("listener 오류를 emit 호출부로 전파하지 않는다", () => {
      const registry = createWindowEventRegistry({ reportError: vi.fn() });
      registry.subscribe("windowOpen", () => {
        throw new Error("observer failed");
      });

      expect(() => registry.emit("windowOpen", WINDOW_ITEM_EVENT)).not.toThrow();
    });
  });
});
