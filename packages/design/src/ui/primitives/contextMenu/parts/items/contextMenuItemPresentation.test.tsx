import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest } from "../../../../testing";
import { ContextMenuItemPresentation } from "./contextMenuItemPresentation";

afterEach(cleanupUITest);

describe("ContextMenuItemPresentation", () => {
  it("Item, CheckboxItem, RadioItem과 Submenu.Trigger의 nullish slot은 layout wrapper를 만들지 않는다", () => {
    const { rerender } = render(
      <ContextMenuItemPresentation icon={null} trailing={null}>
        작업
      </ContextMenuItemPresentation>,
    );

    expect(document.querySelector(".wd-context-menu-ui__item-icon")).toBeNull();
    expect(document.querySelector(".wd-context-menu-ui__item-trailing")).toBeNull();

    rerender(<ContextMenuItemPresentation>작업</ContextMenuItemPresentation>);

    expect(document.querySelector(".wd-context-menu-ui__item-icon")).toBeNull();
    expect(document.querySelector(".wd-context-menu-ui__item-trailing")).toBeNull();
  });

  it("0, 문자열과 element slot은 renderable value로 유지한다", () => {
    const { rerender } = render(
      <ContextMenuItemPresentation icon={0} trailing="Ctrl+0">
        작업
      </ContextMenuItemPresentation>,
    );

    expect(document.querySelector(".wd-context-menu-ui__item-icon")?.textContent).toBe("0");
    expect(document.querySelector(".wd-context-menu-ui__item-trailing")?.textContent).toBe(
      "Ctrl+0",
    );

    rerender(
      <ContextMenuItemPresentation
        icon={<span data-testid="icon-slot" />}
        trailing={<kbd data-testid="trailing-slot">Enter</kbd>}
      >
        작업
      </ContextMenuItemPresentation>,
    );

    expect(screen.getByTestId("icon-slot").parentElement?.classList).toContain(
      "wd-context-menu-ui__item-icon",
    );
    expect(screen.getByTestId("trailing-slot").parentElement?.classList).toContain(
      "wd-context-menu-ui__item-trailing",
    );
  });
});
