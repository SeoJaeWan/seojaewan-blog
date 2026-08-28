import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { MenuItemUI } from "../items/menuItemUI";
import { MenuContentUI } from "../structure/menuContentUI";
import { MenuRootUI } from "../structure/menuRootUI";
import { MenuTriggerUI } from "../structure/menuTriggerUI";
import { MenuSubmenuContentUI } from "./menuSubmenuContentUI";
import { MenuSubmenuRootUI } from "./menuSubmenuRootUI";
import { MenuSubmenuTriggerUI } from "./menuSubmenuTriggerUI";

afterEach(cleanupUITest);

describe("MenuSubmenuRootUI", () => {
  it("독립 기본 열림 상태와 변경 callback을 제공한다", () => {
    const onOpenChange = vi.fn();
    renderUITest(
      <MenuRootUI defaultOpen>
        <MenuTriggerUI>작업</MenuTriggerUI>
        <MenuContentUI>
          <MenuSubmenuRootUI defaultOpen onOpenChange={onOpenChange}>
            <MenuSubmenuTriggerUI>공유</MenuSubmenuTriggerUI>
            <MenuSubmenuContentUI aria-label="공유 메뉴">
              <MenuItemUI>메일</MenuItemUI>
            </MenuSubmenuContentUI>
          </MenuSubmenuRootUI>
        </MenuContentUI>
      </MenuRootUI>,
    );

    expect(screen.getByRole("menu", { name: "공유 메뉴" })).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: "메일" }));
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: "item-press" });
  });
});
