import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { SelectRootUI } from "../selectRootUI";
import { SelectLabelUI } from "./selectLabelUI";
import { SelectTriggerUI } from "./selectTriggerUI";
import { SelectValueUI } from "./selectValueUI";

afterEach(cleanupUITest);

const options = [{ label: "문서", value: "documents" }] as const;

describe("SelectLabelUI", () => {
  it("trigger 이름을 제공하고 div prop, className과 ref를 전달한다", () => {
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
});
