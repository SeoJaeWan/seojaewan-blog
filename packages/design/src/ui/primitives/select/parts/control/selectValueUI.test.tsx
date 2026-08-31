import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { SelectRootUI } from "../selectRootUI";
import { SelectTriggerUI } from "./selectTriggerUI";
import { SelectValueUI } from "./selectValueUI";

afterEach(cleanupUITest);

const options = [{ label: "문서", value: "documents" }] as const;

describe("SelectValueUI", () => {
  it("선택 label과 placeholder, span prop, className과 ref를 제공한다", () => {
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
    expect(value.className).toContain("wd-select-ui__value");
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
});
