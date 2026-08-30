import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ContextMenuItemUI } from "../items/contextMenuItemUI";
import { ContextMenuContentUI } from "../structure/contextMenuContentUI";
import { ContextMenuRootUI } from "../structure/contextMenuRootUI";
import { ContextMenuTriggerUI } from "../structure/contextMenuTriggerUI";
import { ContextMenuSubmenuContentUI } from "./contextMenuSubmenuContentUI";
import { ContextMenuSubmenuRootUI } from "./contextMenuSubmenuRootUI";
import { ContextMenuSubmenuTriggerUI } from "./contextMenuSubmenuTriggerUI";

afterEach(cleanupUITest);

describe("ContextMenuSubmenuTriggerUI", () => {
  it("menuitem 역할·이름·닫힌 상태·className·ref를 제공한다", async () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ContextMenuRootUI>
        <ContextMenuTriggerUI>작업 surface</ContextMenuTriggerUI>
        <ContextMenuContentUI>
          <ContextMenuSubmenuRootUI>
            <ContextMenuSubmenuTriggerUI className="custom-submenu" ref={ref}>
              공유
            </ContextMenuSubmenuTriggerUI>
            <ContextMenuSubmenuContentUI>
              <ContextMenuItemUI>메일</ContextMenuItemUI>
            </ContextMenuSubmenuContentUI>
          </ContextMenuSubmenuRootUI>
        </ContextMenuContentUI>
      </ContextMenuRootUI>,
    );
    fireEvent.contextMenu(screen.getByText("작업 surface"));

    const trigger = await screen.findByRole("menuitem", { name: "공유" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.classList.contains("wd-context-menu-ui__item")).toBe(true);
    expect(trigger.querySelector('svg[width="12"]')).not.toBeNull();
    expect(trigger.classList.contains("custom-submenu")).toBe(true);
    expect(ref.current).toBe(trigger);
  });
});
