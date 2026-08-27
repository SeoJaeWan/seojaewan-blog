import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, getActiveHTMLElement, nextBrowserFrame, renderUITest } from "../testing";
import { PopoverUI } from "./popover-ui";

afterEach(cleanupUITest);

const BrowserPopover = () => (
  <div>
    <button type="button">Outside</button>
    <PopoverUI>
      <PopoverUI.Trigger>Account</PopoverUI.Trigger>
      <PopoverUI.Content>
        <PopoverUI.Title>Account details</PopoverUI.Title>
        <PopoverUI.Description>Manage the signed-in account.</PopoverUI.Description>
        <input aria-label="Display name" />
        <PopoverUI.Close>Done</PopoverUI.Close>
      </PopoverUI.Content>
    </PopoverUI>
  </div>
);

describe("PopoverUI (Chromium)", () => {
  it("anchor에 연결된 non-modal surface로 열리고 외부 pointer로 닫힌다", async () => {
    renderUITest(<BrowserPopover />);

    const trigger = screen.getByRole("button", { name: "Account" });
    const outside = screen.getByRole("button", { name: "Outside" });
    fireEvent.click(trigger);

    expect(await screen.findByRole("dialog")).not.toBeNull();
    expect(getActiveHTMLElement()).toBe(screen.getByRole("textbox", { name: "Display name" }));

    fireEvent.pointerDown(outside);
    outside.focus();
    fireEvent.click(outside);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(getActiveHTMLElement()).toBe(outside);
  });

  it("Escape로 닫고 trigger focus를 복원한다", async () => {
    renderUITest(<BrowserPopover />);

    const trigger = screen.getByRole("button", { name: "Account" });
    fireEvent.click(trigger);
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });
    await nextBrowserFrame();

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(getActiveHTMLElement()).toBe(trigger);
  });

  it("reduced motion에서도 동일한 닫힘 상태에 도달한다", async () => {
    if (!("__vitest_browser__" in window)) {
      return;
    }

    const { cdp } = await import("vitest/browser");
    const session = cdp();
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });

    try {
      renderUITest(<BrowserPopover />);
      const trigger = screen.getByRole("button", { name: "Account" });
      fireEvent.click(trigger);
      const dialog = await screen.findByRole("dialog");
      expect(getComputedStyle(dialog).transitionDuration).toBe("0s");

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(getActiveHTMLElement()).toBe(trigger);
    } finally {
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
    }
  });
});
