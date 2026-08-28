import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ComboboxRootUI } from "../comboboxRootUI";
import { ComboboxInputUI } from "../control/comboboxInputUI";
import { ComboboxContentUI } from "./comboboxContentUI";
import { ComboboxListUI } from "./comboboxListUI";

afterEach(cleanupUITest);

const options = [{ label: "바탕 화면", value: "desktop" }] as const;

describe("ComboboxContentUI", () => {
  it("기본 위치의 popup을 지정 portal에 렌더링하고 prop, className과 ref를 전달한다", () => {
    const portal = document.createElement("section");
    document.body.append(portal);
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ComboboxRootUI defaultOpen items={options}>
        <ComboboxInputUI aria-label="경로" />
        <ComboboxContentUI
          className="custom"
          data-testid="content"
          portalContainer={portal}
          ref={ref}
        >
          <ComboboxListUI />
        </ComboboxContentUI>
      </ComboboxRootUI>,
    );

    const content = screen.getByTestId("content");
    expect(portal.contains(content)).toBe(true);
    expect(content.className).toContain("wd-combobox-ui__content");
    expect(content.className).toContain("custom");
    expect(ref.current).toBe(content);
  });
});
