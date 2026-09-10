import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTaskbarSearchInputFocus } from "./index.js";
/**
 * Hook이 반환하는 ref를 실제 input에 연결한다.
 */
const Harness = ({ open }: { open: boolean }) => (
  <input aria-label="검색" ref={useTaskbarSearchInputFocus(open)} />
);
afterEach(cleanup);
describe("useTaskbarSearchInputFocus", () => {
  it("열리는 시점에만 focus하고 다시 열면 재실행한다", () => {
    const view = render(<Harness open={false} />);
    const input = screen.getByRole("textbox");
    const focus = vi.spyOn(input, "focus");
    view.rerender(<Harness open />);
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    view.rerender(<Harness open />);
    expect(focus).toHaveBeenCalledTimes(1);
    view.rerender(<Harness open={false} />);
    expect(focus).toHaveBeenCalledTimes(1);
    view.rerender(<Harness open />);
    expect(focus).toHaveBeenCalledTimes(2);
  });
  it("처음부터 열린 input도 focus한다", () => {
    render(<Harness open />);
    expect(document.activeElement).toBe(screen.getByRole("textbox"));
  });
});
