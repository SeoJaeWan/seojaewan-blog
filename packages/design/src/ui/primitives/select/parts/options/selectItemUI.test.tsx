import { createRef } from "react";

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { SelectTriggerUI } from "../control/selectTriggerUI";
import { SelectRootUI } from "../selectRootUI";
import { SelectContentUI } from "./selectContentUI";
import { SelectItemUI } from "./selectItemUI";
import { SelectListUI } from "./selectListUI";

afterEach(cleanupUITest);

const options = [
  { label: "문서", value: "documents" },
  { disabled: true, label: "보관함", value: "archive" },
] as const;

describe("SelectItemUI", () => {
  it("option의 값, 이름, prop, className, ref와 선택 callback을 제공한다", async () => {
    const ref = createRef<HTMLElement>();
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderUITest(
      <SelectRootUI defaultOpen items={options} onValueChange={onValueChange}>
        <SelectTriggerUI aria-label="태그" />
        <SelectContentUI>
          <SelectListUI>
            <SelectItemUI className="custom" data-testid="item" ref={ref} value="documents">
              문서
            </SelectItemUI>
          </SelectListUI>
        </SelectContentUI>
      </SelectRootUI>,
    );

    const item = screen.getByRole("option", { name: "문서" });
    expect(item).toBe(screen.getByTestId("item"));
    expect(item.className).toContain("wd-select-ui__item");
    expect(item.className).toContain("custom");
    expect(ref.current).toBe(item);

    await user.click(item);
    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledWith("documents", { reason: "item-press" }),
    );
  });

  it("disabled option의 비활성 의미를 보존하고 callback을 실행하지 않는다", () => {
    const onValueChange = vi.fn();
    renderUITest(
      <SelectRootUI defaultOpen items={options} onValueChange={onValueChange}>
        <SelectTriggerUI aria-label="태그" />
        <SelectContentUI>
          <SelectListUI>
            <SelectItemUI disabled value="archive">
              보관함
            </SelectItemUI>
          </SelectListUI>
        </SelectContentUI>
      </SelectRootUI>,
    );

    const item = screen.getByRole("option", { name: "보관함" });
    expect(item.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(item);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
