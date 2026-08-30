import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { MenuItemUI } from "../items/menuItemUI";
import { MenuContentUI } from "./menuContentUI";
import { MenuRootUI } from "./menuRootUI";
import { MenuTriggerUI } from "./menuTriggerUI";

afterEach(cleanupUITest);

describe("MenuContentUI", () => {
  it("이름 있는 메뉴로 표시한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <MenuRootUI defaultOpen>
        <MenuTriggerUI>작업</MenuTriggerUI>
        <MenuContentUI
          aria-label="명명된 작업"
          className="custom-content"
          data-testid="content"
          ref={ref}
        >
          <MenuItemUI>열기</MenuItemUI>
        </MenuContentUI>
      </MenuRootUI>,
    );

    const content = screen.getByRole("menu", { name: "명명된 작업" });
    expect(content).toBe(screen.getByTestId("content"));
    expect(content.classList.contains("wd-menu-ui__content")).toBe(true);
    expect(content.classList.contains("custom-content")).toBe(true);
    expect(ref.current).toBe(content);
  });
});
