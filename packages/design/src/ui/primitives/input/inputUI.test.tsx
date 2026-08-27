import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import { InputUI } from "./index";
import indexSource from "./index.ts?raw";
import typesSource from "./inputUI.types.ts?raw";

afterEach(cleanupUITest);

describe("InputUI", () => {
  it("native input props, 접근 가능한 이름과 ref를 전달한다", () => {
    const ref = { current: null as HTMLInputElement | null };

    renderUITest(
      <InputUI
        ref={ref}
        aria-describedby="search-help"
        aria-label="Search files"
        className="taskbar-search"
        disabled
        name="query"
        readOnly
        type="search"
      />,
    );

    const input = screen.getByRole("searchbox", { name: "Search files" });

    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("aria-describedby")).toBe("search-help");
    expect(input.getAttribute("name")).toBe("query");
    expect(input.getAttribute("type")).toBe("search");
    expect(input.classList.contains("wd-input-ui")).toBe(true);
    expect(input.classList.contains("taskbar-search")).toBe(true);
    expect((input as HTMLInputElement).disabled).toBe(true);
    expect(input.hasAttribute("readonly")).toBe(true);
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

  it("프로젝트 공개 경계에서 Base UI 타입을 노출하지 않는다", () => {
    expect(indexSource).not.toContain("@base-ui/react");
    expect(typesSource).not.toContain("@base-ui/react");
  });
});
