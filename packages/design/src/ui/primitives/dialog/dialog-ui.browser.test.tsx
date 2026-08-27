import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, getActiveHTMLElement, renderUITest } from "../testing";
import { DialogUI } from "./dialog-ui";
import type { DialogUIProps } from "./dialog-ui.types";

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

describe("DialogUI (Chromium)", () => {
  it("focus를 가두고 Escape로 닫은 뒤 trigger focus를 복원한다", async () => {
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

  it("외부 pointer press로 닫힌다", async () => {
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
