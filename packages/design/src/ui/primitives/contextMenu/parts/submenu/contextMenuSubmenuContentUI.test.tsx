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

describe("ContextMenuSubmenuContentUI", () => {
  it("중첩 menu 역할·이름·className·ref를 제공한다", async () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ContextMenuRootUI>
        <ContextMenuTriggerUI>작업 surface</ContextMenuTriggerUI>
        <ContextMenuContentUI>
          <ContextMenuSubmenuRootUI defaultOpen>
            <ContextMenuSubmenuTriggerUI>공유</ContextMenuSubmenuTriggerUI>
            <ContextMenuSubmenuContentUI
              aria-label="명명된 공유 메뉴"
              className="custom-submenu-content"
              ref={ref}
            >
              <ContextMenuItemUI>메일</ContextMenuItemUI>
            </ContextMenuSubmenuContentUI>
          </ContextMenuSubmenuRootUI>
        </ContextMenuContentUI>
      </ContextMenuRootUI>,
    );
    fireEvent.contextMenu(screen.getByText("작업 surface"));

    const content = await screen.findByRole("menu", { name: "명명된 공유 메뉴" });
    expect(content.classList.contains("custom-submenu-content")).toBe(true);
    expect(ref.current).toBe(content);
  });
});
