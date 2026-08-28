import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ComboboxRootUI } from "../comboboxRootUI";
import { ComboboxInputUI } from "../control/comboboxInputUI";
import { ComboboxContentUI } from "./comboboxContentUI";
import { ComboboxEmptyUI } from "./comboboxEmptyUI";
import { ComboboxListUI } from "./comboboxListUI";

afterEach(cleanupUITest);

const options = [{ label: "바탕 화면", value: "desktop" }] as const;

describe("ComboboxEmptyUI", () => {
  it("결과가 없을 때 메시지, prop, className과 ref를 렌더링한다", async () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ComboboxRootUI defaultOpen defaultInputValue="없음" items={options}>
        <ComboboxInputUI aria-label="경로" />
        <ComboboxContentUI>
          <ComboboxListUI />
          <ComboboxEmptyUI className="custom" data-testid="empty" ref={ref}>
            결과 없음
          </ComboboxEmptyUI>
        </ComboboxContentUI>
      </ComboboxRootUI>,
    );

    const empty = await screen.findByText("결과 없음");
    expect(empty).toBe(screen.getByTestId("empty"));
    expect(empty.className).toContain("wd-combobox-ui__empty");
    expect(empty.className).toContain("custom");
    expect(ref.current).toBe(empty);
  });
});
