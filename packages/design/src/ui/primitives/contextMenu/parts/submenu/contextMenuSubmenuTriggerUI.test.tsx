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
  it("닫힌 하위 메뉴를 여는 항목으로 표시한다", async () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ContextMenuRootUI>
        <ContextMenuTriggerUI>작업 surface</ContextMenuTriggerUI>
        <ContextMenuContentUI>
          <ContextMenuSubmenuRootUI>
            <ContextMenuSubmenuTriggerUI
              className="custom-submenu"
              icon={<span data-testid="submenu-icon">장식 아이콘</span>}
              ref={ref}
              trailing={<kbd data-testid="submenu-trailing">S</kbd>}
            >
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
    expect(
      trigger
        .querySelector(".wd-context-menu-ui__submenu-trigger-arrow")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(screen.getByTestId("submenu-icon").parentElement?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(screen.getByTestId("submenu-trailing").parentElement?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(trigger.classList.contains("custom-submenu")).toBe(true);
    expect(ref.current).toBe(trigger);
  });
});
