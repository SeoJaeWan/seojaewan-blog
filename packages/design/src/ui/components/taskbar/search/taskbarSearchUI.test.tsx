import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskbarSearchUI } from "./taskbarSearchUI.js";

afterEach(() => cleanup());

describe("TaskbarSearchUI", () => {
  it("고정된 Search 의미와 consumer native button 속성을 함께 렌더링한다", () => {
    render(<TaskbarSearchUI aria-describedby="search-help" data-consumer="root" />);

    const button = screen.getByRole("button", { name: "검색 열기" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-describedby")).toBe("search-help");
    expect(button.getAttribute("data-consumer")).toBe("root");
    expect(button.textContent).toContain("검색");
    expect(button.querySelector(".taskbar-search__icon")).not.toBeNull();
  });

  it("pointer activation을 onAction에 한 번 전달하고 selected는 표현만 바꾼다", () => {
    const onAction = vi.fn();
    render(<TaskbarSearchUI onAction={onAction} selected />);

    const button = screen.getByRole("button", { name: "검색 열기" });
    expect(button.getAttribute("data-selected")).toBe("true");
    expect(button.hasAttribute("aria-expanded")).toBe(false);
    expect(button.hasAttribute("aria-controls")).toBe(false);

    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("native disabled 입력은 onAction을 전달하지 않는다", () => {
    const onAction = vi.fn();
    render(<TaskbarSearchUI disabled onAction={onAction} />);

    const button = screen.getByRole("button", { name: "검색 열기" });
    fireEvent.click(button);

    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(onAction).not.toHaveBeenCalled();
  });
});
