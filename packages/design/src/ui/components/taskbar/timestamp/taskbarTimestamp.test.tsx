import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  TaskbarTimestampClock,
  TaskbarTimestampTimer,
} from "../../../../headless/taskbar/index.js";
import { useTaskbarTimestampController } from "../../../../headless/taskbar/index.js";
import { TaskbarTimestamp } from "./taskbarTimestamp.js";

const HYDRATION_CLOCK: TaskbarTimestampClock = Object.freeze({
  /** hydration fixture의 고정 local Date를 반환한다. */
  now: () => new Date(2026, 6, 10, 15, 42, 0, 0),
  /** 실제 timer 없이 첫 mount 갱신만 관찰한다. */
  setTimeout: () => 0 as unknown as TaskbarTimestampTimer,
  /** hydration fixture에는 취소할 실제 timer가 없다. */
  clearTimeout: () => undefined,
});

/** 실제 Timestamp controller와 읽기 전용 Component를 조합한다. */
const TimestampControllerProbe = () => {
  const timestamp = useTaskbarTimestampController(HYDRATION_CLOCK);
  return <TaskbarTimestamp value={timestamp.value} />;
};

afterEach(() => cleanup());

describe("TaskbarTimestamp", () => {
  it("현재 시간과 날짜를 interaction 없는 읽기 전용 두 줄 text로 표시한다", () => {
    const { container } = render(
      <TaskbarTimestamp value={{ time: "15:42", date: "2026-07-10" }} />,
    );
    const timestamp = container.querySelector(".taskbar-timestamp");

    expect(timestamp?.getAttribute("data-status")).toBe("ready");
    expect(screen.getByText("15:42")).not.toBeNull();
    expect(screen.getByText("2026-07-10")).not.toBeNull();
    expect(container.querySelector("button, a, [tabindex], [role], [title]")).toBeNull();
  });

  it("준비 전에는 announce하지 않는 두 줄 skeleton을 같은 root에 표시한다", () => {
    const { container } = render(<TaskbarTimestamp value={null} />);
    const timestamp = container.querySelector(".taskbar-timestamp");
    const skeleton = container.querySelector(".taskbar-timestamp__skeleton");

    expect(timestamp?.getAttribute("data-status")).toBe("not-ready");
    expect(skeleton?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll(".taskbar-timestamp__skeleton-line")).toHaveLength(2);
  });

  it("server와 hydration 첫 DOM을 일치시키고 mount 뒤 현재 값을 즉시 표시한다", async () => {
    const serverHtml = renderToString(<TimestampControllerProbe />);
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.append(container);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const root = hydrateRoot(container, <TimestampControllerProbe />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toBe("15:422026-07-10");
    expect(consoleError).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    consoleError.mockRestore();
    container.remove();
  });
});
