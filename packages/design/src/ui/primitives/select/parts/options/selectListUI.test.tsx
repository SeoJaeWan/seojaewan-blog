import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { SelectTriggerUI } from "../control/selectTriggerUI";
import { SelectRootUI } from "../selectRootUI";
import { SelectContentUI } from "./selectContentUI";
import { SelectItemUI } from "./selectItemUI";
import { SelectListUI } from "./selectListUI";

afterEach(cleanupUITest);

const options = [{ label: "문서", value: "documents" }] as const;

describe("SelectListUI", () => {
  it("단일 선택 listbox role, prop, className과 ref를 실제 목록에 전달한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <SelectRootUI defaultOpen items={options}>
        <SelectTriggerUI aria-label="태그" />
        <SelectContentUI>
          <SelectListUI className="custom" data-testid="list" ref={ref}>
            <SelectItemUI value="documents">문서</SelectItemUI>
          </SelectListUI>
        </SelectContentUI>
      </SelectRootUI>,
    );

    const list = screen.getByRole("listbox");
    expect(list).toBe(screen.getByTestId("list"));
    expect(list.getAttribute("aria-multiselectable")).not.toBe("true");
    expect(list.className).toContain("wd-select-ui__list");
    expect(list.className).toContain("custom");
    expect(ref.current).toBe(list);
  });
});
