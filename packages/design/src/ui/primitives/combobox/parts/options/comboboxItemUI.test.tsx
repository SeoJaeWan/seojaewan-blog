import { createRef } from "react";

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ComboboxRootUI } from "../comboboxRootUI";
import { ComboboxInputUI } from "../control/comboboxInputUI";
import { ComboboxContentUI } from "./comboboxContentUI";
import { ComboboxItemUI } from "./comboboxItemUI";

afterEach(cleanupUITest);

const options = [
  { label: "바탕 화면", value: "desktop" },
  { disabled: true, label: "보관함", value: "archive" },
] as const;

describe("ComboboxItemUI", () => {
  it("option의 값, 이름, prop, className, ref와 선택 callback을 제공한다", async () => {
    const ref = createRef<HTMLDivElement>();
    const onValueChange = vi.fn();
    renderUITest(
      <ComboboxRootUI defaultOpen items={options} onValueChange={onValueChange}>
        <ComboboxInputUI aria-label="경로" />
        <ComboboxContentUI>
          <ComboboxItemUI className="custom" data-testid="item" ref={ref} value="desktop">
            바탕 화면
          </ComboboxItemUI>
        </ComboboxContentUI>
      </ComboboxRootUI>,
    );

    const item = screen.getByRole("option", { name: "바탕 화면" });
    expect(item).toBe(screen.getByTestId("item"));
    expect(item.className).toContain("wd-combobox-ui__item");
    expect(item.className).toContain("custom");
    expect(ref.current).toBe(item);

    fireEvent.click(item);
    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith("desktop", { reason: "item-press" }),
    );
  });

  it("disabled option의 비활성 의미를 보존하고 callback을 실행하지 않는다", () => {
    const onValueChange = vi.fn();
    renderUITest(
      <ComboboxRootUI defaultOpen items={options} onValueChange={onValueChange}>
        <ComboboxInputUI aria-label="경로" />
        <ComboboxContentUI>
          <ComboboxItemUI disabled value="archive">
            보관함
          </ComboboxItemUI>
        </ComboboxContentUI>
      </ComboboxRootUI>,
    );

    const item = screen.getByRole("option", { name: "보관함" });
    expect(item.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(item);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
