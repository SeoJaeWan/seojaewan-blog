import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import { DialogUI } from "./dialog-ui";
import type { DialogUIProps } from "./dialog-ui.types";

afterEach(cleanupUITest);

const ExampleDialog = ({ onOpenChange }: { onOpenChange?: DialogUIProps["onOpenChange"] }) => (
  <DialogUI onOpenChange={onOpenChange}>
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
  it("접근 가능한 modal dialog 구조와 change details를 소유한다", async () => {
    const onOpenChange = vi.fn();
    renderUITest(<ExampleDialog onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));

    const dialog = await screen.findByRole("dialog", { name: "Settings" });
    const title = screen.getByText("Settings");
    const description = screen.getByText("Change your preferences.");

    expect(dialog.getAttribute("aria-labelledby")).toContain(title.id);
    expect(dialog.getAttribute("aria-describedby")).toContain(description.id);
    expect(onOpenChange).toHaveBeenLastCalledWith(true, { reason: "trigger-press" });
  });

  it("프로젝트가 소유한 close part를 통해 닫힌다", async () => {
    const onOpenChange = vi.fn();
    renderUITest(<ExampleDialog onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    await screen.findByRole("dialog", { name: "Settings" });

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: "close-press" });
  });
});
