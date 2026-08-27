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
  it("외부 provider 없이 독립적으로 렌더링된다", () => {
    expect(() => renderUITest(<ExampleTooltip />)).not.toThrow();
    expect(screen.getByRole("button", { name: "Settings" })).not.toBeNull();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("described-by hint로 trigger의 접근 가능한 이름을 보충한다", async () => {
    renderUITest(<ExampleTooltip />);
    const trigger = screen.getByRole("button", { name: "Settings" });

    fireEvent.focus(trigger);

    const tooltip = await screen.findByRole("tooltip");
    expect(trigger.getAttribute("aria-label")).toBe("Settings");
    expect(trigger.getAttribute("aria-describedby")).toContain(tooltip.id);
    expect(tooltip.textContent).toBe("Open settings");
  });

  it("프로젝트가 소유한 focus와 escape reason을 보고한다", async () => {
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
