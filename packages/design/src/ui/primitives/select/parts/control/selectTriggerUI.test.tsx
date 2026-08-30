import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { SelectRootUI } from "../selectRootUI";
import { SelectTriggerUI } from "./selectTriggerUI";

afterEach(cleanupUITest);

const options = [{ label: "문서", value: "documents" }] as const;

describe("SelectTriggerUI", () => {
  it("선택 목록을 여는 버튼으로 동작한다", () => {
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
    const icon = trigger.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(ref.current).toBe(trigger);
  });
});
