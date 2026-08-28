import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { MenuItemUI } from "../items/menuItemUI";
import { MenuContentUI } from "./menuContentUI";
import { MenuRootUI } from "./menuRootUI";
import { MenuTriggerUI } from "./menuTriggerUI";

afterEach(cleanupUITest);

describe("MenuTriggerUI", () => {
  it("기본 button 역할·이름·className·prop·ref를 제공한다", () => {
    const ref = createRef<HTMLButtonElement>();
    renderUITest(
      <MenuRootUI>
        <MenuTriggerUI className="custom-trigger" ref={ref} type="button">
          작업 열기
        </MenuTriggerUI>
        <MenuContentUI>
          <MenuItemUI>열기</MenuItemUI>
        </MenuContentUI>
      </MenuRootUI>,
    );

    const trigger = screen.getByRole("button", { name: "작업 열기" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.classList.contains("wd-menu-ui__trigger")).toBe(true);
    expect(trigger.classList.contains("custom-trigger")).toBe(true);
    expect(trigger.getAttribute("type")).toBe("button");
    expect(ref.current).toBe(trigger);
  });
});
