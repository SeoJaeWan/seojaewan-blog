import { useState } from "react";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskbarSearch } from "./taskbarSearch.js";

afterEach(() => cleanup());

/** 실제 controlled 입력을 유지하며 변경 값을 관찰하는 fixture다. */
const ControlledSearch = ({ onValueChange }: { onValueChange: (value: string) => void }) => {
  const [value, setValue] = useState("");
  return (
    <TaskbarSearch
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange(next);
      }}
    />
  );
};

describe("TaskbarSearch", () => {
  it("native input 속성을 전달하며 실제 텍스트 입력을 제공한다", () => {
    render(<TaskbarSearch aria-describedby="search-help" defaultValue="기존 검색어" />);
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "검색" });
    expect(input.type).toBe("text");
    expect(input.value).toBe("기존 검색어");
    expect(input.getAttribute("aria-describedby")).toBe("search-help");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("진입 focus는 열기 요청을 보내고 입력·재클릭은 추가 요청을 보내지 않는다", () => {
    const onAction = vi.fn();
    render(<TaskbarSearch onAction={onAction} selected />);
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "검색" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "hello world" } });
    fireEvent.click(input);
    expect(onAction).toHaveBeenCalledOnce();
    expect(input.getAttribute("data-selected")).toBe("true");
    expect(input.hasAttribute("aria-controls")).toBe(false);
  });

  it("한글 composition 중 입력과 완성 값·공백·삭제를 그대로 전달한다", () => {
    const changed = vi.fn();
    render(<ControlledSearch onValueChange={changed} />);
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "검색" });
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "ㅎ" } });
    expect(input.value).toBe("ㅎ");
    fireEvent.change(input, { target: { value: "한" } });
    fireEvent.compositionEnd(input, { data: "한" });
    fireEvent.change(input, { target: { value: "한 글 " } });
    expect(input.value).toBe("한 글 ");
    expect(changed).toHaveBeenLastCalledWith("한 글 ");
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    expect(changed).toHaveBeenLastCalledWith("");
  });

  it("disabled input은 진입 요청을 보내지 않는다", () => {
    const onAction = vi.fn();
    render(<TaskbarSearch disabled onAction={onAction} />);
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "검색" });
    fireEvent.click(input);
    expect(input.disabled).toBe(true);
    expect(onAction).not.toHaveBeenCalled();
  });
});
