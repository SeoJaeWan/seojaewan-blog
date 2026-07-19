import { createElement, StrictMode } from "react";
import type { Root } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

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
import { TASKBAR_PIN_STORAGE_KEY } from "../../providers/taskbarPinsProvider/constants";
import { WINDOWS_PIN_STORAGE_KEY } from "../../providers/windowsPinsProvider/constants";
import type { WindowPinEvent, WindowPinsReorderedEvent } from "../../types";
import { useTaskbarPins } from "../useTaskbarPins";
import { useWindowEvent } from "../useWindowEvent";
import { useWindowsPins } from "./index";

const WINDOW_PIN_STORAGE_KEYS = {
  taskbar: TASKBAR_PIN_STORAGE_KEY,
  windows: WINDOWS_PIN_STORAGE_KEY,
} as const;

const WINDOWS_ITEMS = [
  { id: "calculator", title: "계산기" },
  { id: "terminal", title: "터미널" },
] satisfies readonly WindowItem[];

interface PinObservation {
  payload: WindowPinEvent;
  pinnedIds: readonly string[];
}

interface ReorderObservation {
  payload: WindowPinsReorderedEvent;
  pinnedIds: readonly string[];
}

interface PinHarnessProps {
  onTaskbarPin?: (observation: PinObservation) => void;
  onTaskbarUnpin?: (observation: PinObservation) => void;
  onWindowsPin?: (observation: PinObservation) => void;
  onWindowsReorder?: (observation: ReorderObservation) => void;
  onWindowsUnpin?: (observation: PinObservation) => void;
}

const PinHarness = ({
  onTaskbarPin,
  onTaskbarUnpin,
  onWindowsPin,
  onWindowsReorder,
  onWindowsUnpin,
}: PinHarnessProps) => {
  const taskbarPins = useTaskbarPins();
  const windowsPins = useWindowsPins();

  useWindowEvent("windowPinToStart", (payload) => {
    onWindowsPin?.({ payload, pinnedIds: payload.pinnedIds });
  });
  useWindowEvent("windowUnpinFromStart", (payload) => {
    onWindowsUnpin?.({ payload, pinnedIds: payload.pinnedIds });
  });
  useWindowEvent("windowPinToTaskbar", (payload) => {
    onTaskbarPin?.({ payload, pinnedIds: payload.pinnedIds });
  });
  useWindowEvent("windowUnpinFromTaskbar", (payload) => {
    onTaskbarUnpin?.({ payload, pinnedIds: payload.pinnedIds });
  });
  useWindowEvent("windowsPinsReordered", (payload) => {
    onWindowsReorder?.({ payload, pinnedIds: payload.pinnedIds });
  });

  return createElement(
    "div",
    null,
    createElement(
      "output",
      { "data-testid": "windows-pins" },
      JSON.stringify(windowsPins.pinnedIds),
    ),
    createElement(
      "output",
      { "data-testid": "taskbar-pins" },
      JSON.stringify(taskbarPins.pinnedIds),
    ),
    createElement(
      "button",
      { onClick: () => windowsPins.pin("calculator"), type: "button" },
      "windows pin calculator",
    ),
    createElement(
      "button",
      {
        onClick: () => {
          windowsPins.pin("calculator");
          windowsPins.pin("terminal");
        },
        type: "button",
      },
      "windows pin both",
    ),
    createElement(
      "button",
      { onClick: () => windowsPins.pin("missing"), type: "button" },
      "windows pin missing",
    ),
    createElement(
      "button",
      { onClick: () => windowsPins.unpin("calculator"), type: "button" },
      "windows unpin calculator",
    ),
    createElement(
      "button",
      { onClick: () => windowsPins.unpin("missing"), type: "button" },
      "windows unpin missing",
    ),
    createElement(
      "button",
      { onClick: () => taskbarPins.pin("terminal"), type: "button" },
      "taskbar pin terminal",
    ),
    createElement(
      "button",
      { onClick: () => taskbarPins.unpin("terminal"), type: "button" },
      "taskbar unpin terminal",
    ),
    createElement(
      "button",
      { onClick: () => windowsPins.applyReorder("terminal", 0), type: "button" },
      "windows reorder terminal first",
    ),
    createElement(
      "button",
      { onClick: () => windowsPins.applyReorder("missing", 0), type: "button" },
      "windows reorder missing",
    ),
    createElement(
      "button",
      { onClick: () => windowsPins.applyReorder("calculator", -1), type: "button" },
      "windows reorder invalid",
    ),
    createElement(
      "button",
      { onClick: () => windowsPins.applyReorder("calculator", 0), type: "button" },
      "windows reorder same",
    ),
  );
};

const createTree = (props: PinHarnessProps = {}, strict = false) => {
  const windows = createElement(Windows, {
    children: createElement(PinHarness, props),
    windowsItems: WINDOWS_ITEMS,
  });

  return strict ? createElement(StrictMode, null, windows) : windows;
};

const expectPinnedIds = async (testId: "taskbar-pins" | "windows-pins", pinnedIds: string[]) => {
  await waitFor(() =>
    expect(screen.getByTestId(testId).textContent).toBe(JSON.stringify(pinnedIds)),
  );
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("useWindowsPins와 useTaskbarPins", () => {
  it("Windows 밖에서 호출하면 각 hook의 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useWindowsPins())).toThrow(
      "useWindowsPins는 Windows 안에서 사용해야 합니다.",
    );
    expect(() => renderHook(() => useTaskbarPins())).toThrow(
      "useTaskbarPins는 Windows 안에서 사용해야 합니다.",
    );
  });

  it("두 storage key를 독립적으로 복원하고 hydration event는 발생시키지 않는다", async () => {
    const onTaskbarPin = vi.fn();
    const onWindowsPin = vi.fn();

    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.windows,
      JSON.stringify(["calculator", "calculator"]),
    );
    window.localStorage.setItem(WINDOW_PIN_STORAGE_KEYS.taskbar, JSON.stringify(["terminal"]));

    render(createTree({ onTaskbarPin, onWindowsPin }, true));

    await expectPinnedIds("windows-pins", ["calculator"]);
    await expectPinnedIds("taskbar-pins", ["terminal"]);
    expect(onWindowsPin).not.toHaveBeenCalled();
    expect(onTaskbarPin).not.toHaveBeenCalled();
  });

  it("server render에는 빈 상태를 사용하고 hydration 후 storage 값을 복원한다", async () => {
    const onWindowsPin = vi.fn();
    const container = document.createElement("div");

    window.localStorage.setItem(WINDOW_PIN_STORAGE_KEYS.windows, JSON.stringify(["calculator"]));
    container.innerHTML = renderToString(createTree({ onWindowsPin }));
    document.body.append(container);

    expect(container.querySelector('[data-testid="windows-pins"]')?.textContent).toBe("[]");

    let root: Root | null = null;

    try {
      act(() => {
        root = hydrateRoot(container, createTree({ onWindowsPin }));
      });

      await waitFor(() =>
        expect(container.querySelector('[data-testid="windows-pins"]')?.textContent).toBe(
          JSON.stringify(["calculator"]),
        ),
      );
      expect(onWindowsPin).not.toHaveBeenCalled();
    } finally {
      act(() => {
        root?.unmount();
      });
      container.remove();
    }
  });

  it("손상된 storage 값은 빈 배열로 복구한다", async () => {
    window.localStorage.setItem(WINDOW_PIN_STORAGE_KEYS.windows, "[");
    window.localStorage.setItem(WINDOW_PIN_STORAGE_KEYS.taskbar, JSON.stringify(["terminal", 1]));

    render(createTree());

    await expectPinnedIds("windows-pins", []);
    await expectPinnedIds("taskbar-pins", []);
  });

  it("Windows pin을 반영·저장하고 완료 event를 전달한다", async () => {
    const onWindowsPin = vi.fn<(observation: PinObservation) => void>();

    render(createTree({ onWindowsPin }));
    fireEvent.click(screen.getByRole("button", { name: "windows pin calculator" }));

    await expectPinnedIds("windows-pins", ["calculator"]);
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBe(
      JSON.stringify(["calculator"]),
    );
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.taskbar)).toBeNull();
    expect(onWindowsPin).toHaveBeenCalledWith({
      payload: {
        itemId: "calculator",
        pinnedIds: ["calculator"],
        previousPinnedIds: [],
      },
      pinnedIds: ["calculator"],
    });

    fireEvent.click(screen.getByRole("button", { name: "windows pin calculator" }));
    expect(onWindowsPin).toHaveBeenCalledOnce();
  });

  it("같은 tick의 연속 pin도 최신 Provider 상태에서 계산한다", async () => {
    const onWindowsPin = vi.fn<(observation: PinObservation) => void>();

    render(createTree({ onWindowsPin }));
    fireEvent.click(screen.getByRole("button", { name: "windows pin both" }));

    await expectPinnedIds("windows-pins", ["calculator", "terminal"]);
    expect(onWindowsPin).toHaveBeenCalledTimes(2);
    expect(onWindowsPin.mock.calls[1]?.[0].payload).toEqual({
      itemId: "terminal",
      pinnedIds: ["calculator", "terminal"],
      previousPinnedIds: ["calculator"],
    });
  });

  it("없는 item pin과 없는 ID unpin은 상태와 event를 변경하지 않는다", async () => {
    const onWindowsPin = vi.fn();
    const onWindowsUnpin = vi.fn();

    render(createTree({ onWindowsPin, onWindowsUnpin }));
    fireEvent.click(screen.getByRole("button", { name: "windows pin missing" }));
    fireEvent.click(screen.getByRole("button", { name: "windows unpin missing" }));

    await expectPinnedIds("windows-pins", []);
    expect(onWindowsPin).not.toHaveBeenCalled();
    expect(onWindowsUnpin).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBeNull();
  });

  it("Windows unpin 결과를 반영·저장하고 완료 event를 전달한다", async () => {
    const onWindowsUnpin = vi.fn<(observation: PinObservation) => void>();

    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.windows,
      JSON.stringify(["calculator", "terminal"]),
    );
    render(createTree({ onWindowsUnpin }));
    await expectPinnedIds("windows-pins", ["calculator", "terminal"]);

    fireEvent.click(screen.getByRole("button", { name: "windows unpin calculator" }));

    await expectPinnedIds("windows-pins", ["terminal"]);
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBe(
      JSON.stringify(["terminal"]),
    );
    expect(onWindowsUnpin).toHaveBeenCalledWith({
      payload: {
        itemId: "calculator",
        pinnedIds: ["terminal"],
        previousPinnedIds: ["calculator", "terminal"],
      },
      pinnedIds: ["terminal"],
    });
  });

  it("Taskbar는 등록·취소와 전용 storage/event만 제공한다", async () => {
    const onTaskbarPin = vi.fn<(observation: PinObservation) => void>();
    const onTaskbarUnpin = vi.fn<(observation: PinObservation) => void>();
    const onWindowsPin = vi.fn();

    render(createTree({ onTaskbarPin, onTaskbarUnpin, onWindowsPin }));
    fireEvent.click(screen.getByRole("button", { name: "taskbar pin terminal" }));

    await expectPinnedIds("taskbar-pins", ["terminal"]);
    await expectPinnedIds("windows-pins", []);
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.taskbar)).toBe(
      JSON.stringify(["terminal"]),
    );
    expect(onTaskbarPin).toHaveBeenCalledOnce();
    expect(onWindowsPin).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "taskbar unpin terminal" }));
    await expectPinnedIds("taskbar-pins", []);
    expect(onTaskbarUnpin).toHaveBeenCalledOnce();
  });

  it("windowsItems에 없는 pin ID는 양쪽 state와 storage에서 event 없이 정리한다", async () => {
    const onTaskbarUnpin = vi.fn();
    const onWindowsUnpin = vi.fn();

    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.windows,
      JSON.stringify(["missing", "calculator"]),
    );
    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.taskbar,
      JSON.stringify(["terminal", "missing"]),
    );

    render(createTree({ onTaskbarUnpin, onWindowsUnpin }));

    await expectPinnedIds("windows-pins", ["calculator"]);
    await expectPinnedIds("taskbar-pins", ["terminal"]);
    await waitFor(() => {
      expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBe(
        JSON.stringify(["calculator"]),
      );
      expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.taskbar)).toBe(
        JSON.stringify(["terminal"]),
      );
    });
    expect(onWindowsUnpin).not.toHaveBeenCalled();
    expect(onTaskbarUnpin).not.toHaveBeenCalled();
  });

  it("windowsItems prop에서 item이 사라지면 hook mount와 무관하게 양쪽 pin을 정리한다", async () => {
    const onTaskbarUnpin = vi.fn();
    const onWindowsUnpin = vi.fn();
    const createRuntimeTree = (windowsItems: readonly WindowItem[]) =>
      createElement(Windows, {
        children: createElement(PinHarness, { onTaskbarUnpin, onWindowsUnpin }),
        windowsItems,
      });

    window.localStorage.setItem(WINDOW_PIN_STORAGE_KEYS.windows, JSON.stringify(["terminal"]));
    window.localStorage.setItem(WINDOW_PIN_STORAGE_KEYS.taskbar, JSON.stringify(["terminal"]));

    const { rerender } = render(createRuntimeTree(WINDOWS_ITEMS));
    await expectPinnedIds("windows-pins", ["terminal"]);
    await expectPinnedIds("taskbar-pins", ["terminal"]);

    rerender(createRuntimeTree([WINDOWS_ITEMS[0]]));

    await expectPinnedIds("windows-pins", []);
    await expectPinnedIds("taskbar-pins", []);
    await waitFor(() => {
      expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBe(JSON.stringify([]));
      expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.taskbar)).toBe(JSON.stringify([]));
    });
    expect(onWindowsUnpin).not.toHaveBeenCalled();
    expect(onTaskbarUnpin).not.toHaveBeenCalled();
  });

  it("Windows pin을 최종 index로 반영하고 reorder event를 전달한다", async () => {
    const onWindowsReorder = vi.fn<(observation: ReorderObservation) => void>();

    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.windows,
      JSON.stringify(["calculator", "terminal"]),
    );
    render(createTree({ onWindowsReorder }));
    await expectPinnedIds("windows-pins", ["calculator", "terminal"]);

    fireEvent.click(screen.getByRole("button", { name: "windows reorder terminal first" }));

    await expectPinnedIds("windows-pins", ["terminal", "calculator"]);
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBe(
      JSON.stringify(["terminal", "calculator"]),
    );
    expect(onWindowsReorder).toHaveBeenCalledWith({
      payload: {
        fromIndex: 1,
        movedItemId: "terminal",
        pinnedIds: ["terminal", "calculator"],
        previousPinnedIds: ["calculator", "terminal"],
        toIndex: 0,
      },
      pinnedIds: ["terminal", "calculator"],
    });
  });

  it("없는 ID, 범위 밖 index와 같은 위치 reorder는 no-op이다", async () => {
    const onWindowsReorder = vi.fn();

    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.windows,
      JSON.stringify(["calculator", "terminal"]),
    );
    render(createTree({ onWindowsReorder }));
    await expectPinnedIds("windows-pins", ["calculator", "terminal"]);

    fireEvent.click(screen.getByRole("button", { name: "windows reorder missing" }));
    fireEvent.click(screen.getByRole("button", { name: "windows reorder invalid" }));
    fireEvent.click(screen.getByRole("button", { name: "windows reorder same" }));

    expect(screen.getByTestId("windows-pins").textContent).toBe(
      JSON.stringify(["calculator", "terminal"]),
    );
    expect(onWindowsReorder).not.toHaveBeenCalled();
  });

  it("storage write가 실패해도 Provider 상태와 observer를 갱신한다", async () => {
    const onWindowsPin = vi.fn();

    render(createTree({ onWindowsPin }));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    fireEvent.click(screen.getByRole("button", { name: "windows pin calculator" }));

    await expectPinnedIds("windows-pins", ["calculator"]);
    expect(onWindowsPin).toHaveBeenCalledOnce();
  });
});
