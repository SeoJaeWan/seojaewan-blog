import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { MenuContentUI } from "../structure/menuContentUI";
import { MenuRootUI } from "../structure/menuRootUI";
import { MenuTriggerUI } from "../structure/menuTriggerUI";
import { MenuRadioGroupUI } from "./menuRadioGroupUI";
import { MenuRadioItemUI } from "./menuRadioItemUI";

afterEach(cleanupUITest);

describe("MenuRadioGroupUI", () => {
  it("기본값·className·ref와 프로젝트 변경 callback을 제공한다", () => {
    const ref = createRef<HTMLDivElement>();
    const onValueChange = vi.fn();
    renderUITest(
      <MenuRootUI defaultOpen>
        <MenuTriggerUI>설정</MenuTriggerUI>
        <MenuContentUI>
          <MenuRadioGroupUI defaultValue="편안함" onValueChange={onValueChange} ref={ref}>
            <MenuRadioItemUI value="조밀함">조밀함</MenuRadioItemUI>
            <MenuRadioItemUI value="편안함">편안함</MenuRadioItemUI>
          </MenuRadioGroupUI>
        </MenuContentUI>
      </MenuRootUI>,
    );

    expect(ref.current?.classList.contains("wd-menu-ui__radio-group")).toBe(true);
    expect(screen.getByRole("menuitemradio", { name: "편안함" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "조밀함" }));
    expect(onValueChange).toHaveBeenCalledWith("조밀함", { reason: "item-press" });
  });

  it("선택한 값을 다시 누르면 같은 값의 재선택을 보고한다", () => {
    const onValueChange = vi.fn();
    renderUITest(
      <MenuRootUI defaultOpen>
        <MenuTriggerUI>설정</MenuTriggerUI>
        <MenuContentUI>
          <MenuRadioGroupUI defaultValue="현재" onValueChange={onValueChange}>
            <MenuRadioItemUI closeOnSelect={false} value="현재">
              현재
            </MenuRadioItemUI>
          </MenuRadioGroupUI>
        </MenuContentUI>
      </MenuRootUI>,
    );

    fireEvent.click(screen.getByRole("menuitemradio", { name: "현재" }));
    expect(onValueChange).toHaveBeenCalledWith("현재", { reason: "item-press" });
  });
});
