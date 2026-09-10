import { useState } from "react";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createResourceRef,
  type OperationId,
  type StartCommittedResult,
  type StartControllerActions,
  type StartOperationHandle,
} from "../../../../../../../headless/index.js";
import { type StartPinnedItemViewModel, TaskbarStartPinned } from "../../index.js";

const initialItems = [
  {
    resource: createResourceRef("folder", "30000000-0000-4000-8000-000000000001"),
    label: "첫째",
    reorderActions: ["right"],
  },
  {
    resource: createResourceRef("content", "30000000-0000-4000-8000-000000000002"),
    label: "둘째",
    reorderActions: ["first", "left", "right"],
  },
  {
    resource: createResourceRef("external-shortcut", "30000000-0000-4000-8000-000000000003"),
    label: "셋째",
    reorderActions: ["first", "left"],
  },
] as const satisfies readonly StartPinnedItemViewModel[];

type Deferred<Value> = Readonly<{
  promise: Promise<Value>;
  resolve(value: Value): void;
}>;

const deferred = <Value,>(): Deferred<Value> => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

describe("useStartPinnedDrag", () => {
  const originalRectDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "getBoundingClientRect",
  );
  let order = initialItems.map(({ label }) => label);

  beforeEach(() => {
    vi.useFakeTimers();
    class TestPointerEvent extends MouseEvent {
      readonly isPrimary: boolean;
      readonly pointerId: number;

      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.isPrimary = init.isPrimary ?? true;
        this.pointerId = init.pointerId ?? 0;
      }
    }
    vi.stubGlobal("PointerEvent", TestPointerEvent);
    order = initialItems.map(({ label }) => label);
    HTMLElement.prototype.getBoundingClientRect = vi.fn(function (this: HTMLElement) {
      const label = this.getAttribute("aria-label") ?? "";
      const index = order.findIndex((candidate) => candidate === label);
      const left = Math.max(0, index) * 100;
      return {
        bottom: 80,
        height: 80,
        left,
        right: left + 80,
        top: 0,
        width: 80,
        x: left,
        y: 0,
        toJSON: () => ({}),
      };
    });
  });

  afterEach(() => {
    cleanup();
    if (originalRectDescriptor !== undefined)
      Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", originalRectDescriptor);
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("pointer drop을 index reorder Action과 세 UI phase 및 150ms 이동으로 연결한다", async () => {
    const committed = deferred<StartCommittedResult>();
    const operationId = "pinned-reorder-1" as OperationId;
    const handle = {
      operationId,
      committed: committed.promise,
      presented: new Promise(() => undefined),
      settled: new Promise(() => undefined),
    } satisfies StartOperationHandle;
    const execute = vi.fn(() => handle);
    const completed: string[] = [];
    let setItems!: (items: readonly StartPinnedItemViewModel[]) => void;
    const actions: StartControllerActions = {
      abortTransition: vi.fn(() => true),
      completeTransition: vi.fn((_operationId, phase) => {
        completed.push(String(phase));
        if (phase === "start-reorder-measure-before") {
          order = ["둘째", "셋째", "첫째"];
          setItems([initialItems[1], initialItems[2], initialItems[0]]);
          committed.resolve({
            status: "committed",
            value: {
              pinnedItems: order.map((label) => ({
                resource: initialItems.find((item) => item.label === label)!.resource,
              })),
            },
          });
        }
        return true;
      }),
      execute,
      failTransition: vi.fn(() => true),
    };
    const Harness = () => {
      const [items, updateItems] = useState<readonly StartPinnedItemViewModel[]>(initialItems);
      setItems = updateItems;
      return <TaskbarStartPinned actions={actions} items={items} />;
    };
    render(<Harness />);
    const first = screen.getByRole("gridcell", { name: "첫째" });
    const second = screen.getByRole("gridcell", { name: "둘째" });
    const third = screen.getByRole("gridcell", { name: "셋째" });
    let captured = false;
    const releasePointerCapture = vi.fn(() => {
      captured = false;
    });
    first.setPointerCapture = vi.fn(() => {
      captured = true;
    });
    first.hasPointerCapture = vi.fn(() => captured);
    first.releasePointerCapture = releasePointerCapture;

    fireEvent.pointerDown(first, { button: 0, clientX: 20, clientY: 20, pointerId: 7 });
    fireEvent.pointerMove(window, { clientX: 220, clientY: 20, pointerId: 7 });
    await act(() => vi.advanceTimersByTimeAsync(20));
    expect(first.getAttribute("data-dragging")).toBe("true");
    expect(second.getAttribute("data-drag-preview")).toBe("true");
    expect(third.getAttribute("data-drag-preview")).toBe("true");
    expect(second.style.transform).toBe("translate(-100px, 0px)");
    expect(third.style.transform).toBe("translate(-100px, 0px)");
    expect(execute).not.toHaveBeenCalled();
    fireEvent.pointerUp(window, { clientX: 220, clientY: 20, pointerId: 7 });
    await act(() => Promise.resolve());

    expect(execute).toHaveBeenCalledExactlyOnceWith({
      type: "reorder",
      resource: initialItems[0].resource,
      intent: { type: "index", index: 2 },
    });
    expect(completed).toEqual(["start-reorder-measure-before", "start-reorder-measure-after"]);
    expect(screen.getAllByRole("gridcell").map((item) => item.getAttribute("aria-label"))).toEqual([
      "둘째",
      "셋째",
      "첫째",
    ]);
    await act(() => vi.advanceTimersByTimeAsync(20));
    expect(screen.getByRole("gridcell", { name: "첫째" }).style.transition).toContain("150ms");

    await act(() => vi.advanceTimersByTimeAsync(260));
    expect(completed).toEqual([
      "start-reorder-measure-before",
      "start-reorder-measure-after",
      "start-reorder-move",
    ]);
    expect(releasePointerCapture).toHaveBeenCalledWith(7);
  });

  it("여러 pointermove를 한 frame의 최신 위치로 합친다", async () => {
    const actions = {
      abortTransition: vi.fn(() => true),
      completeTransition: vi.fn(() => true),
      execute: vi.fn(() => {
        throw new Error("pointermove는 Action을 만들면 안 됩니다");
      }),
      failTransition: vi.fn(() => true),
    } satisfies StartControllerActions;
    const requestFrame = vi.spyOn(window, "requestAnimationFrame");
    render(<TaskbarStartPinned actions={actions} items={initialItems} />);
    const first = screen.getByRole("gridcell", { name: "첫째" });

    fireEvent.pointerDown(first, { button: 0, clientX: 10, clientY: 10, pointerId: 6 });
    fireEvent.pointerMove(window, { clientX: 20, clientY: 10, pointerId: 6 });
    fireEvent.pointerMove(window, { clientX: 40, clientY: 10, pointerId: 6 });
    fireEvent.pointerMove(window, { clientX: 60, clientY: 10, pointerId: 6 });

    expect(requestFrame).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(20));
    expect(first.style.transform).toBe("translate(50px, 0px)");
    expect(actions.execute).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
  });

  it("Escape는 capture, listeners와 pending frame을 Action 없이 정리한다", async () => {
    const actions = {
      abortTransition: vi.fn(() => true),
      completeTransition: vi.fn(() => true),
      execute: vi.fn(() => {
        throw new Error("취소 gesture는 Action을 만들면 안 됩니다");
      }),
      failTransition: vi.fn(() => true),
    } satisfies StartControllerActions;
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame");
    const removeListener = vi.spyOn(window, "removeEventListener");
    render(<TaskbarStartPinned actions={actions} items={initialItems} />);
    const first = screen.getByRole("gridcell", { name: "첫째" });
    let captured = false;
    const releasePointerCapture = vi.fn(() => {
      captured = false;
    });
    first.setPointerCapture = vi.fn(() => {
      captured = true;
    });
    first.hasPointerCapture = vi.fn(() => captured);
    first.releasePointerCapture = releasePointerCapture;

    fireEvent.pointerDown(first, { button: 0, clientX: 10, clientY: 10, pointerId: 8 });
    fireEvent.pointerMove(window, { clientX: 220, clientY: 10, pointerId: 8 });
    await act(() => vi.advanceTimersByTimeAsync(20));
    expect(screen.getByRole("gridcell", { name: "둘째" }).style.transform).toBe(
      "translate(-100px, 0px)",
    );
    fireEvent.pointerMove(window, { clientX: 20, clientY: 10, pointerId: 8 });
    await act(() => vi.advanceTimersByTimeAsync(20));
    expect(screen.getByRole("gridcell", { name: "둘째" }).style.transform).toBe("");
    fireEvent.pointerMove(window, { clientX: 220, clientY: 10, pointerId: 8 });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(actions.execute).not.toHaveBeenCalled();
    expect(screen.getByRole("gridcell", { name: "둘째" }).style.transform).toBe("");
    expect(releasePointerCapture).toHaveBeenCalledWith(8);
    expect(cancelFrame).toHaveBeenCalled();
    expect(removeListener).toHaveBeenCalledWith("pointermove", expect.any(Function));
  });

  it("pointercancel은 capture를 반환하고 reorder Action을 만들지 않는다", () => {
    const actions = {
      abortTransition: vi.fn(() => true),
      completeTransition: vi.fn(() => true),
      execute: vi.fn(() => {
        throw new Error("pointercancel은 Action을 만들면 안 됩니다");
      }),
      failTransition: vi.fn(() => true),
    } satisfies StartControllerActions;
    render(<TaskbarStartPinned actions={actions} items={initialItems} />);
    const first = screen.getByRole("gridcell", { name: "첫째" });
    first.setPointerCapture = vi.fn();
    first.hasPointerCapture = vi.fn(() => true);
    const releasePointerCapture = vi.fn();
    first.releasePointerCapture = releasePointerCapture;

    fireEvent.pointerDown(first, { button: 0, clientX: 10, clientY: 10, pointerId: 9 });
    fireEvent.pointerCancel(window, { pointerId: 9 });

    expect(releasePointerCapture).toHaveBeenCalledWith(9);
    expect(actions.execute).not.toHaveBeenCalled();
  });

  it("pointer capture 상실은 preview를 복원하고 reorder Action을 만들지 않는다", async () => {
    const actions = {
      abortTransition: vi.fn(() => true),
      completeTransition: vi.fn(() => true),
      execute: vi.fn(() => {
        throw new Error("capture 상실은 Action을 만들면 안 됩니다");
      }),
      failTransition: vi.fn(() => true),
    } satisfies StartControllerActions;
    render(<TaskbarStartPinned actions={actions} items={initialItems} />);
    const first = screen.getByRole("gridcell", { name: "첫째" });
    first.setPointerCapture = vi.fn();
    first.hasPointerCapture = vi.fn(() => false);

    fireEvent.pointerDown(first, { button: 0, clientX: 10, clientY: 10, pointerId: 11 });
    fireEvent.pointerMove(window, { clientX: 220, clientY: 10, pointerId: 11 });
    await act(() => vi.advanceTimersByTimeAsync(20));
    expect(screen.getByRole("gridcell", { name: "둘째" }).dataset.dragPreview).toBe("true");

    fireEvent.lostPointerCapture(first, { pointerId: 11 });

    expect(screen.getByRole("gridcell", { name: "둘째" }).style.transform).toBe("");
    expect(actions.execute).not.toHaveBeenCalled();
  });

  it("unmount에서 진행 중 transition을 abort하고 capture와 listener를 정리한다", async () => {
    const operationId = "pinned-reorder-2" as OperationId;
    const handle = {
      operationId,
      committed: new Promise(() => undefined),
      presented: new Promise(() => undefined),
      settled: new Promise(() => undefined),
    } as unknown as StartOperationHandle;
    const actions: StartControllerActions = {
      abortTransition: vi.fn(() => true),
      completeTransition: vi.fn(() => true),
      execute: vi.fn(() => handle),
      failTransition: vi.fn(() => true),
    };
    const removeListener = vi.spyOn(window, "removeEventListener");
    const rendered = render(<TaskbarStartPinned actions={actions} items={initialItems} />);
    const first = screen.getByRole("gridcell", { name: "첫째" });
    const releasePointerCapture = vi.fn();
    first.setPointerCapture = vi.fn();
    first.hasPointerCapture = vi.fn(() => true);
    first.releasePointerCapture = releasePointerCapture;

    fireEvent.pointerDown(first, { button: 0, clientX: 10, clientY: 10, pointerId: 10 });
    fireEvent.pointerUp(window, { clientX: 220, clientY: 10, pointerId: 10 });
    await act(() => Promise.resolve());
    rendered.unmount();

    const abortTransition = actions.abortTransition as ReturnType<typeof vi.fn>;
    expect(abortTransition).toHaveBeenCalledWith(
      operationId,
      "start-reorder-measure-after",
      "start-pinned-component-unmounted",
    );
    expect(releasePointerCapture).toHaveBeenCalledWith(10);
    expect(removeListener).toHaveBeenCalledWith("pointerup", expect.any(Function));
  });
});
