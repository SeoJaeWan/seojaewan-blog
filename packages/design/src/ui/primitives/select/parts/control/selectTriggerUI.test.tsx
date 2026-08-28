import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { SelectRootUI } from "../selectRootUI";
import { SelectTriggerUI } from "./selectTriggerUI";

afterEach(cleanupUITest);

const options = [{ label: "문서", value: "documents" }] as const;

describe("SelectTriggerUI", () => {
  it("기본 button, combobox role, 장식 icon, prop, className과 ref를 제공한다", () => {
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
    expect(trigger.className).toContain("wd-select-ui__trigger");
    expect(trigger.className).toContain("custom");
    expect(trigger.querySelector('[aria-hidden="true"]')?.textContent).toBe("▾");
    expect(ref.current).toBe(trigger);
  });
});
