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

describe("SelectContentUI", () => {
  it("기본 위치의 popup을 지정 portal에 렌더링하고 prop, className과 ref를 전달한다", () => {
    const portal = document.createElement("section");
    document.body.append(portal);
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <SelectRootUI defaultOpen items={options}>
        <SelectTriggerUI aria-label="태그" />
        <SelectContentUI
          className="custom"
          data-testid="content"
          portalContainer={portal}
          ref={ref}
        >
          <SelectListUI>
            <SelectItemUI value="documents">문서</SelectItemUI>
          </SelectListUI>
        </SelectContentUI>
      </SelectRootUI>,
    );

    const content = screen.getByTestId("content");
    expect(portal.contains(content)).toBe(true);
    expect(content.className).toContain("wd-select-ui__content");
    expect(content.className).toContain("custom");
    expect(ref.current).toBe(content);
  });
});
