import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ComboboxRootUI } from "../comboboxRootUI";
import { ComboboxInputUI } from "./comboboxInputUI";
import { ComboboxLabelUI } from "./comboboxLabelUI";

afterEach(cleanupUITest);

const options = [{ label: "바탕 화면", value: "desktop" }] as const;

describe("ComboboxLabelUI", () => {
  it("입력과 이름을 연결하고 label prop, className과 ref를 전달한다", () => {
    const ref = createRef<HTMLLabelElement>();
    renderUITest(
      <ComboboxRootUI items={options}>
        <ComboboxLabelUI className="custom" data-testid="label" ref={ref}>
          경로
        </ComboboxLabelUI>
        <ComboboxInputUI />
      </ComboboxRootUI>,
    );

    const label = screen.getByTestId("label");
    expect(label.tagName).toBe("LABEL");
    expect(label.className).toContain("wd-combobox-ui__label");
    expect(label.className).toContain("custom");
    expect(label.getAttribute("for")).toBe(screen.getByRole("combobox", { name: "경로" }).id);
    expect(ref.current).toBe(label);
  });
});
