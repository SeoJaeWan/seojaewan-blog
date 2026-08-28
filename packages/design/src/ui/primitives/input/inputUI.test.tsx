import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import { InputUI } from "./index";

afterEach(cleanupUITest);

describe("InputUI", () => {
  it("기본 type을 text로 설정한다", () => {
    renderUITest(<InputUI aria-label="검색어" />);
    const input = screen.getByRole("textbox", { name: "검색어" });

    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("type")).toBe("text");
  });

  it("접근 가능한 이름과 native props를 전달한다", () => {
    const ref = { current: null as HTMLInputElement | null };

    renderUITest(
      <InputUI
        ref={ref}
        aria-describedby="search-help"
        aria-invalid="true"
        aria-label="파일 검색"
        className="taskbar-search"
        disabled
        name="query"
        readOnly
        type="search"
      />,
    );

    const input = screen.getByRole("searchbox", { name: "파일 검색" });

    expect(input.getAttribute("aria-describedby")).toBe("search-help");
    expect(input.getAttribute("name")).toBe("query");
    expect(input.getAttribute("type")).toBe("search");
    expect(input.classList.contains("wd-input-ui")).toBe(true);
    expect(input.classList.contains("taskbar-search")).toBe(true);
    expect((input as HTMLInputElement).disabled).toBe(true);
    expect(input.hasAttribute("readonly")).toBe(true);
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("전달한 ref를 native input에 연결한다", () => {
    const ref = { current: null as HTMLInputElement | null };
    renderUITest(<InputUI aria-label="경로" ref={ref} />);
    const input = screen.getByRole("textbox", { name: "경로" });

    expect(ref.current).toBe(input);
  });

  it("defaultValue와 native change를 지원한다", () => {
    const onChange = vi.fn();
    renderUITest(<InputUI aria-label="Query" defaultValue="doc" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Query" });

    fireEvent.change(input, { target: { value: "documents" } });

    expect((input as HTMLInputElement).value).toBe("documents");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("controlled value를 소비자가 소유한다", () => {
    const onChange = vi.fn();
    renderUITest(<InputUI aria-label="Path" onChange={onChange} value="/documents" />);
    const input = screen.getByRole("textbox", { name: "Path" });

    fireEvent.change(input, { target: { value: "/pictures" } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect((input as HTMLInputElement).value).toBe("/documents");
  });
});
