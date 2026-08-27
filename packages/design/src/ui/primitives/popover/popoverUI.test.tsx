import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import { PopoverUI } from "./popoverUI";
import type { PopoverUIProps } from "./popoverUI.types";

afterEach(cleanupUITest);

const ExamplePopover = ({
  defaultOpen,
  onOpenChange,
  open,
}: Pick<PopoverUIProps, "defaultOpen" | "onOpenChange" | "open">) => (
  <PopoverUI defaultOpen={defaultOpen} onOpenChange={onOpenChange} open={open}>
    <PopoverUI.Trigger>Account</PopoverUI.Trigger>
    <PopoverUI.Content>
      <PopoverUI.Title>Account details</PopoverUI.Title>
      <PopoverUI.Description>Manage the signed-in account.</PopoverUI.Description>
      <PopoverUI.Close>Done</PopoverUI.Close>
    </PopoverUI.Content>
  </PopoverUI>
);

describe("PopoverUI", () => {
  it("기본적으로 닫힌 non-modal 상태이며 프로젝트 소유 reason을 보고한다", async () => {
    const onOpenChange = vi.fn();
    renderUITest(<ExamplePopover onOpenChange={onOpenChange} />);

    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Account" }));

    expect(await screen.findByRole("dialog")).not.toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.objectContaining({ reason: "trigger-press" }),
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("defaultOpen content에 title과 description을 연결한다", async () => {
    renderUITest(<ExamplePopover defaultOpen />);

    const dialog = await screen.findByRole("dialog");
    const title = screen.getByText("Account details");
    const description = screen.getByText("Manage the signed-in account.");

    expect(dialog.getAttribute("aria-labelledby")).toContain(title.id);
    expect(dialog.getAttribute("aria-describedby")).toContain(description.id);
  });

  it("controlled open 상태와 close reason 계약을 유지한다", async () => {
    const onOpenChange = vi.fn<NonNullable<PopoverUIProps["onOpenChange"]>>();
    const { rerender } = renderUITest(<ExamplePopover onOpenChange={onOpenChange} open />);

    expect(await screen.findByRole("dialog")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: "close-press" });
    expect(screen.getByRole("dialog")).not.toBeNull();

    rerender(<ExamplePopover onOpenChange={onOpenChange} open={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("trigger의 button 기본값, className, type과 ref 계약을 소유한다", () => {
    const triggerRef = createRef<HTMLButtonElement>();
    renderUITest(
      <PopoverUI>
        <PopoverUI.Trigger className="account-trigger" ref={triggerRef} type="submit">
          Account
        </PopoverUI.Trigger>
      </PopoverUI>,
    );

    const trigger = screen.getByRole("button", { name: "Account" });
    expect(trigger).toBe(triggerRef.current);
    expect(trigger.className).toContain("wd-popover-ui__trigger");
    expect(trigger.className).toContain("account-trigger");
    expect(trigger.getAttribute("type")).toBe("submit");
  });
});
