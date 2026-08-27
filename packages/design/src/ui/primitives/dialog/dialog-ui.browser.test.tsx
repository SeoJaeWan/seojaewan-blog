import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, getActiveHTMLElement, renderUITest } from "../testing";
import { DialogUI, type DialogUIProps } from "./dialog-ui";

import "../../tokens/index.css";

afterEach(cleanupUITest);

const BrowserDialog = ({ onOpenChange }: { onOpenChange?: DialogUIProps["onOpenChange"] }) => (
  <div>
    <button type="button">Outside</button>
    <DialogUI onOpenChange={onOpenChange}>
      <DialogUI.Trigger>Open dialog</DialogUI.Trigger>
      <DialogUI.Portal>
        <DialogUI.Backdrop data-testid="dialog-backdrop" />
        <DialogUI.Content>
          <DialogUI.Title>Dialog title</DialogUI.Title>
          <DialogUI.Description>Dialog description</DialogUI.Description>
          <input aria-label="First field" />
          <button type="button">Last action</button>
          <DialogUI.Close>Close dialog</DialogUI.Close>
        </DialogUI.Content>
      </DialogUI.Portal>
    </DialogUI>
  </div>
);

describe("DialogUI in Chromium", () => {
  it("traps focus, dismisses with Escape, and restores the trigger", async () => {
    if (!("__vitest_browser__" in window)) {
      return;
    }

    const onOpenChange = vi.fn();
    renderUITest(<BrowserDialog onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", { name: "Dialog title" });
    await waitFor(() => expect(dialog.contains(getActiveHTMLElement())).toBe(true));

    screen.getByRole("button", { name: "Close dialog" }).focus();
    const { userEvent } = await import("vitest/browser");
    await userEvent.tab();
    expect(dialog.contains(getActiveHTMLElement())).toBe(true);
    expect(getActiveHTMLElement()).toBe(screen.getByRole("textbox", { name: "First field" }));

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Dialog title" })).toBeNull());

    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: "escape-key" });
    expect(getActiveHTMLElement()).toBe(trigger);
  });

  it("dismisses on an outside pointer press", async () => {
    if (!("__vitest_browser__" in window)) {
      return;
    }

    const onOpenChange = vi.fn();
    renderUITest(<BrowserDialog onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    await screen.findByRole("dialog", { name: "Dialog title" });

    fireEvent.pointerDown(screen.getByTestId("dialog-backdrop"));
    fireEvent.click(screen.getByTestId("dialog-backdrop"));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Dialog title" })).toBeNull());
    expect(onOpenChange).toHaveBeenLastCalledWith(false, { reason: "outside-press" });
  });
});
