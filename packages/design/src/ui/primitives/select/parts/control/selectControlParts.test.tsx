import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { SelectRootUI } from "../selectRootUI";
import { SelectClearUI } from "./selectClearUI";
import { SelectLabelUI } from "./selectLabelUI";
import { SelectTriggerUI } from "./selectTriggerUI";
import { SelectValueUI } from "./selectValueUI";

afterEach(cleanupUITest);

const options = [{ label: "문서", value: "documents" }] as const;

describe("Select control part", () => {
  it("Label은 trigger 이름을 제공하고 div prop, className과 ref를 전달한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <SelectRootUI items={options}>
        <SelectLabelUI className="custom" data-testid="label" ref={ref}>
          태그
        </SelectLabelUI>
        <SelectTriggerUI>
          <SelectValueUI placeholder="선택" />
        </SelectTriggerUI>
      </SelectRootUI>,
    );

    const label = screen.getByTestId("label");
    expect(label.tagName).toBe("DIV");
    expect(label.className).toContain("wd-select-ui__label");
    expect(label.className).toContain("custom");
    expect(screen.getByRole("combobox", { name: "태그" })).toBeTruthy();
    expect(ref.current).toBe(label);
  });

  it("Trigger는 기본 button, combobox role, 장식 icon, prop, className과 ref를 제공한다", () => {
    const ref = createRef<HTMLButtonElement>();
    renderUITest(
      <SelectRootUI items={options}>
        <SelectTriggerUI aria-label="태그" className="custom" ref={ref}>
          선택
        </SelectTriggerUI>
      </SelectRootUI>,
    );

    const trigger = screen.getByRole("combobox", { name: "태그" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.getAttribute("type")).toBe("button");
    expect(trigger.className).toContain("custom");
    expect(trigger.querySelector('[aria-hidden="true"]')?.textContent).toBe("▾");
    expect(ref.current).toBe(trigger);
  });

  it("Value는 선택 label과 placeholder, span prop, className과 ref를 제공한다", () => {
    const ref = createRef<HTMLSpanElement>();
    const { rerender } = renderUITest(
      <SelectRootUI items={options}>
        <SelectTriggerUI aria-label="태그">
          <SelectValueUI className="custom" data-testid="value" placeholder="선택" ref={ref} />
        </SelectTriggerUI>
      </SelectRootUI>,
    );

    const value = screen.getByTestId("value");
    expect(value.tagName).toBe("SPAN");
    expect(value.textContent).toBe("선택");
    expect(value.className).toContain("custom");
    expect(ref.current).toBe(value);

    rerender(
      <SelectRootUI items={options} value="documents">
        <SelectTriggerUI aria-label="태그">
          <SelectValueUI data-testid="value" placeholder="선택" />
        </SelectTriggerUI>
      </SelectRootUI>,
    );
    expect(screen.getByTestId("value").textContent).toBe("문서");
  });

  it("Clear는 기본 button과 문구를 렌더링하고 ref, click과 clear callback을 전달한다", () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    const onValueChange = vi.fn();
    renderUITest(
      <SelectRootUI defaultValue="documents" items={options} onValueChange={onValueChange}>
        <SelectClearUI aria-label="태그 지우기" onClick={onClick} ref={ref} />
      </SelectRootUI>,
    );

    const clear = screen.getByRole("button", { name: "태그 지우기" });
    expect(clear.getAttribute("type")).toBe("button");
    expect(clear.textContent).toBe("Clear");
    expect(ref.current).toBe(clear);

    fireEvent.click(clear);
    expect(onClick).toHaveBeenCalledOnce();
    expect(onValueChange).toHaveBeenCalledWith(null, { reason: "clear-press" });
  });

  it("Clear는 값이 없거나 readOnly이면 비활성이고 callback을 실행하지 않는다", () => {
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
