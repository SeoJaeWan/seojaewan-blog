import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import { TooltipUI } from "./tooltip-ui";

afterEach(cleanupUITest);

const ExampleTooltip = ({ onOpenChange }: { onOpenChange?: () => void }) => (
  <TooltipUI delay={0} onOpenChange={onOpenChange}>
    <TooltipUI.Trigger aria-label="Settings">⚙</TooltipUI.Trigger>
    <TooltipUI.Content>Open settings</TooltipUI.Content>
  </TooltipUI>
);

describe("TooltipUI", () => {
  it("renders standalone without an external provider", () => {
    expect(() => renderUITest(<ExampleTooltip />)).not.toThrow();
    expect(screen.getByRole("button", { name: "Settings" })).not.toBeNull();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("supplements the trigger accessible name with a described-by hint", async () => {
    renderUITest(<ExampleTooltip />);
    const trigger = screen.getByRole("button", { name: "Settings" });

    fireEvent.focus(trigger);

    const tooltip = await screen.findByRole("tooltip");
    expect(trigger.getAttribute("aria-label")).toBe("Settings");
    expect(trigger.getAttribute("aria-describedby")).toContain(tooltip.id);
    expect(tooltip.textContent).toBe("Open settings");
  });

  it("reports project-owned focus and escape reasons", async () => {
    const onOpenChange = vi.fn();
    renderUITest(<ExampleTooltip onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole("button", { name: "Settings" });

    fireEvent.focus(trigger);
    await screen.findByRole("tooltip");
    expect(onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.objectContaining({ reason: "trigger-focus" }),
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.objectContaining({ reason: "escape-key" }),
    );
  });
});
