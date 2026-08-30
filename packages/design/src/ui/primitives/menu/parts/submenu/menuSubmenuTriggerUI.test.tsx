import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { MenuItemUI } from "../items/menuItemUI";
import { MenuContentUI } from "../structure/menuContentUI";
import { MenuRootUI } from "../structure/menuRootUI";
import { MenuTriggerUI } from "../structure/menuTriggerUI";
import { MenuSubmenuContentUI } from "./menuSubmenuContentUI";
import { MenuSubmenuRootUI } from "./menuSubmenuRootUI";
import { MenuSubmenuTriggerUI } from "./menuSubmenuTriggerUI";

afterEach(cleanupUITest);

describe("MenuSubmenuTriggerUI", () => {
  it("menuitem 역할·이름·닫힌 상태·className·ref를 제공한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <MenuRootUI defaultOpen>
        <MenuTriggerUI>작업</MenuTriggerUI>
        <MenuContentUI>
          <MenuSubmenuRootUI>
            <MenuSubmenuTriggerUI
              className="custom-submenu"
              icon={<span data-testid="submenu-icon">장식 아이콘</span>}
              ref={ref}
              trailing={<kbd data-testid="submenu-trailing">S</kbd>}
            >
              공유
            </MenuSubmenuTriggerUI>
            <MenuSubmenuContentUI>
              <MenuItemUI>메일</MenuItemUI>
            </MenuSubmenuContentUI>
          </MenuSubmenuRootUI>
        </MenuContentUI>
      </MenuRootUI>,
    );

    const trigger = screen.getByRole("menuitem", { name: "공유" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.querySelector('svg[width="12"]')).not.toBeNull();
    expect(
      trigger.querySelector(".wd-menu-ui__submenu-trigger-arrow")?.getAttribute("aria-hidden"),
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
