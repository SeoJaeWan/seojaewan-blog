import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import typesSource from "./collapsibleUI.types.ts?raw";
import { CollapsibleUI } from "./index";
import indexSource from "./index.ts?raw";

afterEach(cleanupUITest);

const ExampleCollapsible = ({
  defaultOpen,
  disabled,
  onOpenChange,
  open,
}: {
  defaultOpen?: boolean;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}) => (
  <CollapsibleUI.Root
    defaultOpen={defaultOpen}
    disabled={disabled}
    onOpenChange={onOpenChange}
    open={open}
  >
    <CollapsibleUI.Trigger>Documents</CollapsibleUI.Trigger>
    <CollapsibleUI.Panel>Project files</CollapsibleUI.Panel>
  </CollapsibleUI.Root>
);

describe("CollapsibleUI", () => {
  it("uncontrolled disclosure와 trigger-panel ARIA를 연결한다", () => {
    renderUITest(<ExampleCollapsible />);
    const trigger = screen.getByRole("button", { name: "Documents" });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.hasAttribute("aria-controls")).toBe(false);
    expect(screen.queryByText("Project files")).toBe(null);

    fireEvent.click(trigger);

    const panel = screen.getByText("Project files");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
  });

  it("controlled open state와 change callback을 소비자에게 위임한다", () => {
    const onOpenChange = vi.fn();
    const view = renderUITest(<ExampleCollapsible onOpenChange={onOpenChange} open={false} />);
    const trigger = screen.getByRole("button", { name: "Documents" });

    fireEvent.click(trigger);

    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Project files")).toBe(null);

    view.rerender(<ExampleCollapsible onOpenChange={onOpenChange} open />);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Project files")).not.toBe(null);
  });

  it("disabled root에서는 disclosure action을 실행하지 않는다", () => {
    const onOpenChange = vi.fn();
    renderUITest(<ExampleCollapsible disabled onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole("button", { name: "Documents" });

    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.hasAttribute("data-disabled")).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.queryByText("Project files")).toBe(null);
  });

  it("프로젝트 공개 경계에서 Base UI 타입을 노출하지 않는다", () => {
    expect(indexSource).not.toContain("@base-ui/react");
    expect(typesSource).not.toContain("@base-ui/react");
  });
});
