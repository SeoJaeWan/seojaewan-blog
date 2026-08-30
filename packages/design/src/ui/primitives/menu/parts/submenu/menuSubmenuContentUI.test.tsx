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

describe("MenuSubmenuContentUI", () => {
  it("이름 있는 하위 메뉴로 표시한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <MenuRootUI defaultOpen>
        <MenuTriggerUI>작업</MenuTriggerUI>
        <MenuContentUI>
          <MenuSubmenuRootUI defaultOpen>
            <MenuSubmenuTriggerUI>공유</MenuSubmenuTriggerUI>
            <MenuSubmenuContentUI
              aria-label="명명된 공유 메뉴"
              className="custom-submenu-content"
              ref={ref}
            >
              <MenuItemUI>메일</MenuItemUI>
            </MenuSubmenuContentUI>
          </MenuSubmenuRootUI>
        </MenuContentUI>
      </MenuRootUI>,
    );

    const content = screen.getByRole("menu", { name: "명명된 공유 메뉴" });
    expect(content.classList.contains("custom-submenu-content")).toBe(true);
    expect(ref.current).toBe(content);
  });
});
