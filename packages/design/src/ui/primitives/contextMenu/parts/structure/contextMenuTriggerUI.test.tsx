import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ContextMenuItemUI } from "../items/contextMenuItemUI";
import { ContextMenuContentUI } from "./contextMenuContentUI";
import { ContextMenuRootUI } from "./contextMenuRootUI";
import { ContextMenuTriggerUI } from "./contextMenuTriggerUI";

afterEach(cleanupUITest);

describe("ContextMenuTriggerUI", () => {
  it("오른쪽 클릭할 영역을 표시한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ContextMenuRootUI>
        <ContextMenuTriggerUI className="custom-trigger" data-testid="surface" ref={ref}>
          문서 surface
        </ContextMenuTriggerUI>
        <ContextMenuContentUI>
          <ContextMenuItemUI>열기</ContextMenuItemUI>
        </ContextMenuContentUI>
      </ContextMenuRootUI>,
    );

    const trigger = screen.getByText("문서 surface");
    expect(trigger.tagName).toBe("DIV");
    expect(trigger).toBe(screen.getByTestId("surface"));
    expect(trigger.classList.contains("wd-context-menu-ui__trigger")).toBe(true);
    expect(trigger.classList.contains("custom-trigger")).toBe(true);
    expect(ref.current).toBe(trigger);
  });
});
