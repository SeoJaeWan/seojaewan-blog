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
  it("radio 역할·이름·선택 상태·variant·ref를 제공한다", async () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ContextMenuRootUI>
        <ContextMenuTriggerUI>설정 surface</ContextMenuTriggerUI>
        <ContextMenuContentUI>
          <ContextMenuRadioGroupUI defaultValue="위험">
            <ContextMenuRadioItemUI ref={ref} value="위험" variant="danger">
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
    expect(ref.current).toBe(item);
  });
});
