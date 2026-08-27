import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import typesSource from "./icon-button-ui.types.ts?raw";
import { IconButtonUI } from "./index";
import indexSource from "./index.ts?raw";

afterEach(() => {
  cleanupUITest();
});

describe("IconButtonUI", () => {
  it("uses its required project label as the native button name", () => {
    const view = renderUITest(<IconButtonUI icon={<span>decorative</span>} label="Add item" />);
    const button = view.getByRole("button", { name: "Add item" });

    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-label")).toBe("Add item");
    expect(button.textContent).toBe("decorative");
    expect(button.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("uses intrinsic keyboard activation and remains inert when disabled", async () => {
    const enabledAction = vi.fn();
    const disabledAction = vi.fn();
    const user = userEvent.setup();
    const view = renderUITest(
      <>
        <IconButtonUI icon="+" label="Add" onClick={enabledAction} />
        <IconButtonUI disabled icon="-" label="Remove" onClick={disabledAction} />
      </>,
    );

    await user.tab();
    await user.keyboard("{Enter}");
    await user.click(view.getByRole("button", { name: "Remove" }));

    expect(enabledAction).toHaveBeenCalledOnce();
    expect(disabledAction).not.toHaveBeenCalled();
  });

  it("keeps Base UI types out of its project-owned public boundary", () => {
    expect(indexSource).not.toContain("@base-ui/react");
    expect(typesSource).not.toContain("@base-ui/react");
  });
});
