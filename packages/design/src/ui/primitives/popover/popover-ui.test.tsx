import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import { PopoverUI } from "./popover-ui";

afterEach(cleanupUITest);

const ExamplePopover = ({ onOpenChange }: { onOpenChange?: () => void }) => (
  <PopoverUI onOpenChange={onOpenChange}>
    <PopoverUI.Trigger>Account</PopoverUI.Trigger>
    <PopoverUI.Content>
      <PopoverUI.Title>Account details</PopoverUI.Title>
      <PopoverUI.Description>Manage the signed-in account.</PopoverUI.Description>
      <PopoverUI.Close>Done</PopoverUI.Close>
    </PopoverUI.Content>
  </PopoverUI>
);

describe("PopoverUI", () => {
  it("기본적으로 닫힌 non-modal 상태이며 프로젝트 open reason을 보고한다", async () => {
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

  it("content에 title과 description을 연결하고 소유한 close를 통해 닫힌다", async () => {
    renderUITest(<ExamplePopover />);
    fireEvent.click(screen.getByRole("button", { name: "Account" }));

    const dialog = await screen.findByRole("dialog");
    const title = screen.getByText("Account details");
    const description = screen.getByText("Manage the signed-in account.");

    expect(dialog.getAttribute("aria-labelledby")).toContain(title.id);
    expect(dialog.getAttribute("aria-describedby")).toContain(description.id);

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
