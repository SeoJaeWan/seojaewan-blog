import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WindowTitleBar } from "./index.js";

afterEach(() => {
  cleanup();
});

describe("WindowTitleBar", () => {
  it("같은 빈 영역의 연속 click을 두 번씩 묶어 maximize 요청을 반복한다", () => {
    const onToggleMaximized = vi.fn();
    const { container } = render(
      <WindowTitleBar controls={null} onToggleMaximized={onToggleMaximized}>
        문서 제목
      </WindowTitleBar>,
    );
    const dragRegion = container.querySelector<HTMLElement>("[data-window-drag-region]")!;

    for (const detail of [0, 1, 2, 3, 4]) fireEvent.click(dragRegion, { detail });

    expect(onToggleMaximized).toHaveBeenCalledTimes(2);
  });

  it("interactive child의 pointer와 반복 click을 창 이동·maximize 요청에서 제외한다", () => {
    const onMoveStart = vi.fn();
    const onToggleMaximized = vi.fn();
    render(
      <WindowTitleBar
        controls={<button type="button">닫기</button>}
        onMoveStart={onMoveStart}
        onToggleMaximized={onToggleMaximized}
      >
        <input aria-label="문서 제목" defaultValue="문서 제목" />
      </WindowTitleBar>,
    );
    const title = screen.getByRole("textbox", { name: "문서 제목" });

    fireEvent.pointerDown(title, { button: 0, isPrimary: true, pointerId: 1 });
    fireEvent.click(title, { detail: 2 });
    fireEvent.click(title, { detail: 4 });

    expect(onMoveStart).not.toHaveBeenCalled();
    expect(onToggleMaximized).not.toHaveBeenCalled();
  });
});
