import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { SelectRootUI } from "../selectRootUI";
import { SelectClearUI } from "./selectClearUI";

afterEach(cleanupUITest);

const options = [{ label: "문서", value: "documents" }] as const;

describe("SelectClearUI", () => {
  it("값이 없으면 button과 layout을 렌더링하지 않는다", () => {
    renderUITest(
      <SelectRootUI items={options}>
        <SelectClearUI aria-label="태그 지우기" />
      </SelectRootUI>,
    );

    expect(screen.queryByRole("button", { name: "태그 지우기" })).toBeNull();
  });

  it("값이 있으면 기본 button과 기호를 렌더링하고 ref, click과 clear callback을 전달한다", () => {
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
    const icon = clear.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(clear.className).toContain("wd-select-ui__clear");
    expect(clear.className).toContain("custom");
    expect(ref.current).toBe(clear);

    fireEvent.click(clear);
    expect(onClick).toHaveBeenCalledOnce();
    expect(onValueChange).toHaveBeenCalledWith(null, { reason: "clear-press" });
  });

  it.each([
    ["disabled", { disabled: true }],
    ["readOnly", { readOnly: true }],
  ] as const)(
    "값이 있는 %s 루트에서는 보이는 비활성 button이고 callback을 실행하지 않는다",
    (_, rootProps) => {
      const onClick = vi.fn();
      const onValueChange = vi.fn();
      renderUITest(
        <SelectRootUI
          items={options}
          onValueChange={onValueChange}
          value="documents"
          {...rootProps}
        >
          <SelectClearUI aria-label="태그 지우기" onClick={onClick} />
        </SelectRootUI>,
      );

      const clear = screen.getByRole("button", { name: "태그 지우기" });
      expect(clear).toHaveProperty("disabled", true);
      expect(clear.querySelector("svg")).not.toBeNull();
      fireEvent.click(clear);
      expect(onClick).not.toHaveBeenCalled();
      expect(onValueChange).not.toHaveBeenCalled();
    },
  );

  it("part 자체가 disabled이면 값과 무관하게 보이는 비활성 button이다", () => {
    renderUITest(
      <SelectRootUI items={options} value="documents">
        <SelectClearUI aria-label="태그 지우기" disabled />
      </SelectRootUI>,
    );

    expect(screen.getByRole("button", { name: "태그 지우기" })).toHaveProperty("disabled", true);
  });
});
