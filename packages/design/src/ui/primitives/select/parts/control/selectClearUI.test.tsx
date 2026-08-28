import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { SelectRootUI } from "../selectRootUI";
import { SelectClearUI } from "./selectClearUI";

afterEach(cleanupUITest);

const options = [{ label: "문서", value: "documents" }] as const;

describe("SelectClearUI", () => {
  it("기본 button과 문구를 렌더링하고 ref, click과 clear callback을 전달한다", () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    const onValueChange = vi.fn();
    renderUITest(
      <SelectRootUI defaultValue="documents" items={options} onValueChange={onValueChange}>
        <SelectClearUI aria-label="태그 지우기" className="custom" onClick={onClick} ref={ref} />
      </SelectRootUI>,
    );

    const clear = screen.getByRole("button", { name: "태그 지우기" });
    expect(clear.getAttribute("type")).toBe("button");
    expect(clear.textContent).toBe("Clear");
    expect(clear.className).toContain("wd-select-ui__clear");
    expect(clear.className).toContain("custom");
    expect(ref.current).toBe(clear);

    fireEvent.click(clear);
    expect(onClick).toHaveBeenCalledOnce();
    expect(onValueChange).toHaveBeenCalledWith(null, { reason: "clear-press" });
  });

  it("값이 없거나 readOnly이면 비활성이고 callback을 실행하지 않는다", () => {
    const onClick = vi.fn();
    const { rerender } = renderUITest(
      <SelectRootUI items={options}>
        <SelectClearUI aria-label="태그 지우기" onClick={onClick} />
      </SelectRootUI>,
    );

    expect(screen.getByRole("button", { name: "태그 지우기" })).toHaveProperty("disabled", true);
    rerender(
      <SelectRootUI items={options} readOnly value="documents">
        <SelectClearUI aria-label="태그 지우기" onClick={onClick} />
      </SelectRootUI>,
    );
    fireEvent.click(screen.getByRole("button", { name: "태그 지우기" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
