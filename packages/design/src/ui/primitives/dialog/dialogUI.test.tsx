import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import { DialogUI } from "./dialogUI";
import type { DialogUIProps } from "./dialogUI.types";

afterEach(cleanupUITest);

const ExampleDialog = ({
  defaultOpen,
  disablePointerDismissal,
  onOpenChange,
  open,
}: Pick<DialogUIProps, "defaultOpen" | "disablePointerDismissal" | "onOpenChange" | "open">) => (
  <DialogUI
    defaultOpen={defaultOpen}
    disablePointerDismissal={disablePointerDismissal}
    onOpenChange={onOpenChange}
    open={open}
  >
    <DialogUI.Trigger>Open settings</DialogUI.Trigger>
    <DialogUI.Portal>
      <DialogUI.Backdrop data-testid="backdrop" />
      <DialogUI.Content>
        <DialogUI.Title>Settings</DialogUI.Title>
        <DialogUI.Description>Change your preferences.</DialogUI.Description>
        <input aria-label="Display name" />
        <DialogUI.Close>Done</DialogUI.Close>
      </DialogUI.Content>
    </DialogUI.Portal>
  </DialogUI>
);

describe("DialogUI", () => {
  it("접근 가능한 modal dialog 구조와 프로젝트 소유 reason을 제공한다", async () => {
    const onOpenChange = vi.fn();
    renderUITest(<ExampleDialog onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));

    const dialog = await screen.findByRole("dialog", { name: "Settings" });
    const title = screen.getByText("Settings");
    const description = screen.getByText("Change your preferences.");

    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toContain(title.id);
    expect(dialog.getAttribute("aria-describedby")).toContain(description.id);
    expect(onOpenChange).toHaveBeenLastCalledWith(true, { reason: "trigger-press" });
  });

  it("defaultOpen으로 uncontrolled modal을 연다", async () => {
    renderUITest(<ExampleDialog defaultOpen />);

    expect(await screen.findByRole("dialog", { name: "Settings" })).not.toBeNull();
  });

  it("controlled open과 dismiss policy를 프로젝트 API로 유지한다", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = renderUITest(
      <ExampleDialog disablePointerDismissal onOpenChange={onOpenChange} open />,
    );

    expect(await screen.findByRole("dialog", { name: "Settings" })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: "close-press" });
    expect(screen.getByRole("dialog", { name: "Settings" })).not.toBeNull();

    rerender(<ExampleDialog onOpenChange={onOpenChange} open={false} />);
    expect(screen.queryByRole("dialog", { name: "Settings" })).toBeNull();
  });

  it("trigger의 button 기본값, className, type과 ref 계약을 소유한다", () => {
    const triggerRef = createRef<HTMLButtonElement>();
    renderUITest(
      <DialogUI>
        <DialogUI.Trigger className="settings-trigger" ref={triggerRef} type="submit">
          Open settings
        </DialogUI.Trigger>
      </DialogUI>,
    );

    const trigger = screen.getByRole("button", { name: "Open settings" });
    expect(trigger).toBe(triggerRef.current);
    expect(trigger.className).toContain("wd-dialog-ui__trigger");
    expect(trigger.className).toContain("settings-trigger");
    expect(trigger.getAttribute("type")).toBe("submit");
  });
});
