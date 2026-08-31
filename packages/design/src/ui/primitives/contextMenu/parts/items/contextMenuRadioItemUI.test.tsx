import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ContextMenuContentUI } from "../structure/contextMenuContentUI";
import { ContextMenuRootUI } from "../structure/contextMenuRootUI";
import { ContextMenuTriggerUI } from "../structure/contextMenuTriggerUI";
import { ContextMenuRadioGroupUI } from "./contextMenuRadioGroupUI";
import { ContextMenuRadioItemUI } from "./contextMenuRadioItemUI";

afterEach(cleanupUITest);

describe("ContextMenuRadioItemUI", () => {
  it("선택된 항목으로 표시한다", async () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ContextMenuRootUI>
        <ContextMenuTriggerUI>설정 surface</ContextMenuTriggerUI>
        <ContextMenuContentUI>
          <ContextMenuRadioGroupUI defaultValue="위험">
            <ContextMenuRadioItemUI
              icon={<span data-testid="radio-icon">장식 아이콘</span>}
              ref={ref}
              trailing={<kbd data-testid="radio-trailing">R</kbd>}
              value="위험"
              variant="danger"
            >
              위험
            </ContextMenuRadioItemUI>
          </ContextMenuRadioGroupUI>
        </ContextMenuContentUI>
      </ContextMenuRootUI>,
    );
    fireEvent.contextMenu(screen.getByText("설정 surface"));

    const item = await screen.findByRole("menuitemradio", { name: "위험" });
    expect(item.getAttribute("aria-checked")).toBe("true");
    expect(item.getAttribute("data-variant")).toBe("danger");
    expect(item.classList.contains("wd-context-menu-ui__item")).toBe(true);
    expect(item.querySelector('svg[width="16"]')).not.toBeNull();
    expect(item.querySelector(".wd-context-menu-ui__item-indicator")).not.toBeNull();
    expect(screen.getByTestId("radio-icon").parentElement?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(screen.getByTestId("radio-trailing").parentElement?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(ref.current).toBe(item);
  });
});
