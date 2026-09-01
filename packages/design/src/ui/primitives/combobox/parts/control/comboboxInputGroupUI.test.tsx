import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ComboboxRootUI } from "../comboboxRootUI";
import { ComboboxInputGroupUI } from "./comboboxInputGroupUI";
import { ComboboxInputUI } from "./comboboxInputUI";

afterEach(cleanupUITest);

const options = [{ label: "바탕 화면", value: "desktop" }] as const;

describe("ComboboxInputGroupUI", () => {
  it("div prop, className과 ref를 실제 그룹 요소에 전달한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ComboboxRootUI items={options}>
        <ComboboxInputGroupUI className="custom" data-testid="group" ref={ref}>
          <ComboboxInputUI aria-label="경로" />
        </ComboboxInputGroupUI>
      </ComboboxRootUI>,
    );

    const group = screen.getByTestId("group");
    expect(group.tagName).toBe("DIV");
    expect(group.className).toContain("wd-combobox-ui__input-group");
    expect(group.className).toContain("custom");
    expect(ref.current).toBe(group);
  });
});
