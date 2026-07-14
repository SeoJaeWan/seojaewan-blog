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
import type { WindowPinEvent } from "../../types";
import { WINDOW_PIN_STORAGE_KEYS } from "../../utils/windowPinStorage";
import { useWindowEvent } from "../useWindowEvent";
import { useWindowPins } from "./index";

const WINDOWS_ITEMS = [
  { id: "calculator", title: "계산기" },
  { id: "terminal", title: "터미널" },
] satisfies readonly WindowItem[];

interface PinObservation {
  payload: WindowPinEvent;
  pinnedIds: readonly string[];
}

interface PinHarnessProps {
  onTaskbarPin?: (observation: PinObservation) => void;
  onWindowsPin?: (observation: PinObservation) => void;
  onWindowsUnpin?: (observation: PinObservation) => void;
}

const PinHarness = ({ onTaskbarPin, onWindowsPin, onWindowsUnpin }: PinHarnessProps) => {
  const taskbarPins = useWindowPins("taskbar");
  const windowsPins = useWindowPins("windows");

  useWindowEvent("windowPinToStart", (payload) => {
    onWindowsPin?.({ payload, pinnedIds: windowsPins.pinnedIds });
  });
  useWindowEvent("windowUnpinFromStart", (payload) => {
    onWindowsUnpin?.({ payload, pinnedIds: windowsPins.pinnedIds });
  });
  useWindowEvent("windowPinToTaskbar", (payload) => {
    onTaskbarPin?.({ payload, pinnedIds: taskbarPins.pinnedIds });
  });

  return createElement(
    "div",
    null,
    createElement("output", { "data-testid": "windows-pins" }, JSON.stringify(windowsPins.pinnedIds)),
    createElement("output", { "data-testid": "taskbar-pins" }, JSON.stringify(taskbarPins.pinnedIds)),
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

describe("useWindowPins", () => {
  it("Windows 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useWindowPins("windows"))).toThrow(
      "useWindowPins는 Windows 안에서 사용해야 합니다.",
    );
  });

  it("두 storage key를 독립적으로 복원하고 hydration event는 발생시키지 않는다", async () => {
    const onTaskbarPin = vi.fn();
    const onWindowsPin = vi.fn();

    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.windows,
      JSON.stringify(["calculator", "calculator"]),
    );
    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.taskbar,
      JSON.stringify(["terminal"]),
    );

    render(createTree({ onTaskbarPin, onWindowsPin }, true));

    await expectPinnedIds("windows-pins", ["calculator"]);
    await expectPinnedIds("taskbar-pins", ["terminal"]);
    expect(onWindowsPin).not.toHaveBeenCalled();
    expect(onTaskbarPin).not.toHaveBeenCalled();
  });

  it("server render에는 빈 상태를 사용하고 hydration 후 storage 값을 복원한다", async () => {
    const onWindowsPin = vi.fn();
    const container = document.createElement("div");

    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.windows,
      JSON.stringify(["calculator"]),
    );
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
    window.localStorage.setItem(
      WINDOW_PIN_STORAGE_KEYS.taskbar,
      JSON.stringify(["terminal", 1]),
    );

    render(createTree());

    await expectPinnedIds("windows-pins", []);
    await expectPinnedIds("taskbar-pins", []);
  });

  it("Windows pin을 저장하고 Provider 반영 뒤 event를 전달한다", async () => {
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
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBe(
      JSON.stringify(["calculator", "terminal"]),
    );
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

  it("unpin 결과를 저장하고 Provider 반영 뒤 event를 전달한다", async () => {
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

  it("Taskbar pin은 별도 key와 event만 변경한다", async () => {
    const onTaskbarPin = vi.fn<(observation: PinObservation) => void>();
    const onWindowsPin = vi.fn();

    render(createTree({ onTaskbarPin, onWindowsPin }));
    fireEvent.click(screen.getByRole("button", { name: "taskbar pin terminal" }));

    await expectPinnedIds("taskbar-pins", ["terminal"]);
    await expectPinnedIds("windows-pins", []);
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.taskbar)).toBe(
      JSON.stringify(["terminal"]),
    );
    expect(window.localStorage.getItem(WINDOW_PIN_STORAGE_KEYS.windows)).toBeNull();
    expect(onTaskbarPin).toHaveBeenCalledOnce();
    expect(onWindowsPin).not.toHaveBeenCalled();
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
