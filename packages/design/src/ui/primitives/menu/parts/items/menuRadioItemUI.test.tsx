import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { MenuContentUI } from "../structure/menuContentUI";
import { MenuRootUI } from "../structure/menuRootUI";
import { MenuTriggerUI } from "../structure/menuTriggerUI";
import { MenuRadioGroupUI } from "./menuRadioGroupUI";
import { MenuRadioItemUI } from "./menuRadioItemUI";

afterEach(cleanupUITest);

describe("MenuRadioItemUI", () => {
  it("선택된 항목으로 표시한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <MenuRootUI defaultOpen>
        <MenuTriggerUI>설정</MenuTriggerUI>
        <MenuContentUI>
          <MenuRadioGroupUI defaultValue="위험">
            <MenuRadioItemUI
              icon={<span data-testid="radio-icon">장식 아이콘</span>}
              ref={ref}
              trailing={<kbd data-testid="radio-trailing">R</kbd>}
              value="위험"
              variant="danger"
            >
              위험
            </MenuRadioItemUI>
          </MenuRadioGroupUI>
        </MenuContentUI>
      </MenuRootUI>,
    );

    const item = screen.getByRole("menuitemradio", { name: "위험" });
    expect(item.getAttribute("aria-checked")).toBe("true");
    expect(item.getAttribute("data-variant")).toBe("danger");
    expect(item.querySelector('svg[width="16"]')).not.toBeNull();
    expect(item.querySelector(".wd-menu-ui__item-indicator")).not.toBeNull();
    expect(screen.getByTestId("radio-icon").parentElement?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(screen.getByTestId("radio-trailing").parentElement?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(ref.current).toBe(item);
  });
});
