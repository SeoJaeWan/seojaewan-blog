import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import { ButtonUI } from "./index";

import "../../tokens/index.css";

afterEach(() => {
  cleanupUITest();
});

const isJSDOM = navigator.userAgent.includes("jsdom");

describe.skipIf(isJSDOM)("ButtonUI in Chromium", () => {
  it("is keyboard-focusable, visibly focused, and intrinsically activated", async () => {
    const { page, userEvent } = await import("vitest/browser");
    const onClick = vi.fn();
    renderUITest(<ButtonUI onClick={onClick}>Open settings</ButtonUI>);
    const button = page.getByRole("button", { name: "Open settings" });

    await userEvent.tab();

    await expect.element(button).toHaveFocus();
    expect(document.activeElement?.matches(":focus-visible")).toBe(true);
    expect(getComputedStyle(document.activeElement as Element).outlineStyle).toBe("solid");

    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("keeps a disabled button inert", () => {
    const onClick = vi.fn();
    const view = renderUITest(
      <ButtonUI disabled onClick={onClick}>
        Remove
      </ButtonUI>,
    );
    const button = view.getByRole("button", { name: "Remove" });

    button.click();

    expect(button.hasAttribute("disabled")).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });
});
