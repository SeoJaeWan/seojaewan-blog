import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { MenuContentUI } from "../structure/menuContentUI";
import { MenuRootUI } from "../structure/menuRootUI";
import { MenuTriggerUI } from "../structure/menuTriggerUI";
import { MenuSeparatorUI } from "./menuSeparatorUI";

afterEach(cleanupUITest);

describe("MenuSeparatorUI", () => {
  it("기본 horizontal 의미·className·ref를 제공한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <MenuRootUI defaultOpen>
        <MenuTriggerUI>설정</MenuTriggerUI>
        <MenuContentUI>
          <MenuSeparatorUI className="custom-separator" ref={ref} />
        </MenuContentUI>
      </MenuRootUI>,
    );

    const separator = screen.getByRole("separator");
    expect(separator.getAttribute("aria-orientation")).toBe("horizontal");
    expect(separator.classList.contains("custom-separator")).toBe(true);
    expect(ref.current).toBe(separator);
  });
});
