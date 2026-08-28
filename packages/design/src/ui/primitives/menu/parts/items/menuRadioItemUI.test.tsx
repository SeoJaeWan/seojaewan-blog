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
  it("radio 역할·이름·선택 상태·variant·ref를 제공한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <MenuRootUI defaultOpen>
        <MenuTriggerUI>설정</MenuTriggerUI>
        <MenuContentUI>
          <MenuRadioGroupUI defaultValue="위험">
            <MenuRadioItemUI ref={ref} value="위험" variant="danger">
              위험
            </MenuRadioItemUI>
          </MenuRadioGroupUI>
        </MenuContentUI>
      </MenuRootUI>,
    );

    const item = screen.getByRole("menuitemradio", { name: "위험" });
    expect(item.getAttribute("aria-checked")).toBe("true");
    expect(item.getAttribute("data-variant")).toBe("danger");
    expect(ref.current).toBe(item);
  });
});
