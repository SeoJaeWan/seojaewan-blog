import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import { TooltipUI } from "./tooltip-ui";

afterEach(cleanupUITest);

const BrowserTooltip = () => (
  <TooltipUI delay={0}>
    <TooltipUI.Trigger aria-label="Settings">⚙</TooltipUI.Trigger>
    <TooltipUI.Content>Open settings</TooltipUI.Content>
  </TooltipUI>
);

describe("TooltipUI in Chromium", () => {
  it("opens on hover and closes when hover leaves", async () => {
    renderUITest(<BrowserTooltip />);
    const trigger = screen.getByRole("button", { name: "Settings" });

    fireEvent.mouseEnter(trigger);
    expect(await screen.findByRole("tooltip")).not.toBeNull();

    fireEvent.mouseLeave(trigger);
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("opens on focus, preserves the accessible name, and closes on blur", async () => {
    renderUITest(
      <div>
        <BrowserTooltip />
        <button type="button">Next</button>
      </div>,
    );
    const trigger = screen.getByRole("button", { name: "Settings" });

    trigger.focus();
    const tooltip = await screen.findByRole("tooltip");
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-label")).toBe("Settings");
    expect(trigger.getAttribute("aria-describedby")).toContain(tooltip.id);

    screen.getByRole("button", { name: "Next" }).focus();
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("closes on Escape without changing focus", async () => {
    renderUITest(<BrowserTooltip />);
    const trigger = screen.getByRole("button", { name: "Settings" });

    trigger.focus();
    await screen.findByRole("tooltip");
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("reaches the same closed final state with reduced motion", async () => {
    if (!("__vitest_browser__" in window)) {
      return;
    }

    const { cdp } = await import("vitest/browser");
    const session = cdp();
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });

    try {
      renderUITest(<BrowserTooltip />);
      const trigger = screen.getByRole("button", { name: "Settings" });
      trigger.focus();
      const tooltip = await screen.findByRole("tooltip");
      expect(getComputedStyle(tooltip).transitionDuration).toBe("0s");

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
      expect(document.activeElement).toBe(trigger);
    } finally {
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
    }
  });
});
