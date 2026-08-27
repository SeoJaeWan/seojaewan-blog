import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import { IconButtonUI } from "./index";

import "../../tokens/index.css";

afterEach(() => {
  cleanupUITest();
});

const isJSDOM = navigator.userAgent.includes("jsdom");

describe.skipIf(isJSDOM)("IconButtonUI in Chromium", () => {
  it("exposes its project label and supports visible keyboard activation", async () => {
    const { page, userEvent } = await import("vitest/browser");
    const onClick = vi.fn();
    renderUITest(<IconButtonUI icon="+" label="Add item" onClick={onClick} />);
    const button = page.getByRole("button", { name: "Add item" });

    await expect.element(button).toHaveAccessibleName("Add item");
    await userEvent.tab();
    await expect.element(button).toHaveFocus();
    expect(document.activeElement?.matches(":focus-visible")).toBe(true);
    expect(getComputedStyle(document.activeElement as Element).outlineStyle).toBe("solid");

    await userEvent.keyboard("{Enter}");

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not invoke a disabled icon action", () => {
    const onClick = vi.fn();
    const view = renderUITest(
      <IconButtonUI disabled icon="-" label="Remove item" onClick={onClick} />,
    );
    const button = view.getByRole("button", { name: "Remove item" });

    button.click();

    expect(button.hasAttribute("disabled")).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });
});
