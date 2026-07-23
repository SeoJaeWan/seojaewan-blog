import { type PropsWithChildren, StrictMode } from "react";

import type { WindowItem } from "@window/ui";

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WindowsItemsUpdatedEvent } from "../../../../types";
import { WindowsEventsContext } from "../../../windowsEventsProvider/context";
import type {
  DispatchWindowEvent,
  SubscribeWindowEvent,
} from "../../../windowsEventsProvider/types";
import { useWindowsItemsValue } from ".";

const INITIAL_ITEMS = [{ id: "calculator", title: "계산기" }] satisfies readonly WindowItem[];
const NEXT_ITEMS = [
  ...INITIAL_ITEMS,
  { id: "terminal", title: "터미널" },
] satisfies readonly WindowItem[];
const FINAL_ITEMS = [
  ...NEXT_ITEMS,
  { id: "notepad", title: "메모장" },
] satisfies readonly WindowItem[];

const subscribe: SubscribeWindowEvent = () => () => undefined;

const createWrapper = (dispatch: DispatchWindowEvent, strict = false) => {
  const Wrapper = ({ children }: PropsWithChildren) => {
    const provider = (
      <WindowsEventsContext.Provider value={{ dispatch, subscribe }}>
        {children}
      </WindowsEventsContext.Provider>
    );

    return strict ? <StrictMode>{provider}</StrictMode> : provider;
  };

  return Wrapper;
};

const renderWindowsItemsValue = (dispatch = vi.fn<DispatchWindowEvent>(), strict = false) => {
  const rendered = renderHook(({ windowsItems }) => useWindowsItemsValue(windowsItems), {
    initialProps: { windowsItems: INITIAL_ITEMS },
    wrapper: createWrapper(dispatch, strict),
  });

  return { dispatch, ...rendered };
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useWindowsItemsValue", () => {
  describe("초기 상태", () => {
    it("입력받은 WindowItem 목록 참조를 그대로 반환한다", () => {
      const { result } = renderWindowsItemsValue();

      expect(result.current).toBe(INITIAL_ITEMS);
    });

    it("최초 render에는 변경 event를 전달하지 않는다", () => {
      const { dispatch } = renderWindowsItemsValue();

      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe("목록 변경 감지", () => {
    it("같은 목록 참조로 다시 render하면 변경 event를 전달하지 않는다", () => {
      const { dispatch, rerender } = renderWindowsItemsValue();

      rerender({ windowsItems: INITIAL_ITEMS });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it("내용이 같아도 목록 참조가 바뀌면 변경 event를 전달한다", () => {
      const { dispatch, rerender } = renderWindowsItemsValue();
      const equivalentItems = [...INITIAL_ITEMS];

      rerender({ windowsItems: equivalentItems });

      expect(dispatch).toHaveBeenCalledOnce();
    });
  });

  describe("변경 event 전달", () => {
    it("변경 event에 이전 목록과 현재 목록의 정확한 참조를 전달한다", () => {
      const { dispatch, rerender } = renderWindowsItemsValue();

      rerender({ windowsItems: NEXT_ITEMS });

      expect(dispatch).toHaveBeenCalledWith("windowsItemsUpdated", {
        items: NEXT_ITEMS,
        previousItems: INITIAL_ITEMS,
      });
      const payload = dispatch.mock.calls[0][1] as WindowsItemsUpdatedEvent;
      expect(payload.items).toBe(NEXT_ITEMS);
      expect(payload.previousItems).toBe(INITIAL_ITEMS);
    });

    it("연속 변경에는 직전 render의 목록 참조를 이전 값으로 전달한다", () => {
      const { dispatch, rerender } = renderWindowsItemsValue();

      rerender({ windowsItems: NEXT_ITEMS });
      rerender({ windowsItems: FINAL_ITEMS });

      expect(dispatch).toHaveBeenCalledTimes(2);
      expect(dispatch).toHaveBeenNthCalledWith(2, "windowsItemsUpdated", {
        items: FINAL_ITEMS,
        previousItems: NEXT_ITEMS,
      });
      const payload = dispatch.mock.calls[1][1] as WindowsItemsUpdatedEvent;
      expect(payload.items).toBe(FINAL_ITEMS);
      expect(payload.previousItems).toBe(NEXT_ITEMS);
    });

    it("StrictMode에서도 목록 참조 변경 event를 한 번만 전달한다", () => {
      const { dispatch, rerender } = renderWindowsItemsValue(undefined, true);

      rerender({ windowsItems: NEXT_ITEMS });

      expect(dispatch).toHaveBeenCalledOnce();
    });
  });
});
