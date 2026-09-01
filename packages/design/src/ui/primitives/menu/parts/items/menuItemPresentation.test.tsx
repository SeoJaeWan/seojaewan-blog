import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest } from "../../../../testing";
import { MenuItemPresentation } from "./menuItemPresentation";

afterEach(cleanupUITest);

describe("MenuItemPresentation", () => {
  it("Item, CheckboxItem, RadioItem과 Submenu.Trigger의 nullish slot은 layout wrapper를 만들지 않는다", () => {
    const { rerender } = render(
      <MenuItemPresentation icon={null} trailing={null}>
        작업
      </MenuItemPresentation>,
    );

    expect(document.querySelector(".wd-menu-ui__item-icon")).toBeNull();
    expect(document.querySelector(".wd-menu-ui__item-trailing")).toBeNull();

    rerender(<MenuItemPresentation>작업</MenuItemPresentation>);

    expect(document.querySelector(".wd-menu-ui__item-icon")).toBeNull();
    expect(document.querySelector(".wd-menu-ui__item-trailing")).toBeNull();
  });

  it("0, 문자열과 element slot은 renderable value로 유지한다", () => {
    const { rerender } = render(
      <MenuItemPresentation icon={0} trailing="Ctrl+0">
        작업
      </MenuItemPresentation>,
    );

    expect(document.querySelector(".wd-menu-ui__item-icon")?.textContent).toBe("0");
    expect(document.querySelector(".wd-menu-ui__item-trailing")?.textContent).toBe("Ctrl+0");

    rerender(
      <MenuItemPresentation
        icon={<span data-testid="icon-slot" />}
        trailing={<kbd data-testid="trailing-slot">Enter</kbd>}
      >
        작업
      </MenuItemPresentation>,
    );

    expect(screen.getByTestId("icon-slot").parentElement?.classList).toContain(
      "wd-menu-ui__item-icon",
    );
    expect(screen.getByTestId("trailing-slot").parentElement?.classList).toContain(
      "wd-menu-ui__item-trailing",
    );
  });
});
