import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { SelectRootUI } from "../selectRootUI";
import { SelectControlUI } from "./selectControlUI";
import { SelectTriggerUI } from "./selectTriggerUI";

afterEach(cleanupUITest);

const options = [{ label: "문서", value: "documents" }] as const;

describe("SelectControlUI", () => {
  it("div prop, className과 ref를 실제 비상호작용 control 요소에 전달한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <SelectRootUI items={options}>
        <SelectControlUI className="custom" data-testid="control" ref={ref}>
          <SelectTriggerUI aria-label="태그">선택</SelectTriggerUI>
        </SelectControlUI>
      </SelectRootUI>,
    );

    const control = screen.getByTestId("control");
    expect(control.tagName).toBe("DIV");
    expect(control.getAttribute("role")).toBeNull();
    expect(control.className).toContain("wd-select-ui__control");
    expect(control.className).toContain("custom");
    expect(ref.current).toBe(control);
  });
});
