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

describe("TooltipUI (Chromium)", () => {
  it("hover하면 열리고 hover가 벗어나면 닫힌다", async () => {
    renderUITest(<BrowserTooltip />);
    const trigger = screen.getByRole("button", { name: "Settings" });

    fireEvent.mouseEnter(trigger);
    expect(await screen.findByRole("tooltip")).not.toBeNull();

    fireEvent.mouseLeave(trigger);
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("focus하면 열리고 접근 가능한 이름을 유지하며 blur 시 닫힌다", async () => {
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

  it("focus를 바꾸지 않고 Escape로 닫힌다", async () => {
    renderUITest(<BrowserTooltip />);
    const trigger = screen.getByRole("button", { name: "Settings" });

    trigger.focus();
    await screen.findByRole("tooltip");
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
    expect(document.activeElement).toBe(trigger);
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
