import { useState } from "react";

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, getActiveHTMLElement, renderUITest } from "../testing";
import { SheetUI } from "./sheet-ui";

import "../../tokens/index.css";

afterEach(cleanupUITest);

const SwipeSheet = ({ onComplete }: { onComplete: (open: boolean) => void }) => {
  const [open, setOpen] = useState(false);

  return (
    <SheetUI onOpenChange={setOpen} onOpenChangeComplete={onComplete} open={open}>
      <SheetUI.Trigger>Open swipe sheet</SheetUI.Trigger>
      <SheetUI.Portal>
        <SheetUI.Backdrop />
        <SheetUI.Viewport data-testid="sheet-viewport">
          <SheetUI.Content style={{ minHeight: 240 }}>
            <SheetUI.Handle data-testid="sheet-handle" />
            <SheetUI.Title>Swipe sheet</SheetUI.Title>
            <SheetUI.Description>Swipe down to dismiss.</SheetUI.Description>
            <button type="button">Sheet action</button>
            <SheetUI.Close>Close sheet</SheetUI.Close>
          </SheetUI.Content>
        </SheetUI.Viewport>
      </SheetUI.Portal>
    </SheetUI>
  );
};

describe("SheetUI in Chromium", () => {
  it("is bottom-placed and dismisses with a downward swipe", async () => {
    if (!("__vitest_browser__" in window)) {
      return;
    }

    const onComplete = vi.fn();
    renderUITest(<SwipeSheet onComplete={onComplete} />);
    const trigger = screen.getByRole("button", { name: "Open swipe sheet" });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Swipe sheet" });
    await waitFor(() =>
      expect(onComplete.mock.calls.filter(([open]) => open === true)).toHaveLength(1),
    );
    const bounds = dialog.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const startY = bounds.top + 20;
    const viewport = screen.getByTestId("sheet-viewport");
    expect(Math.round(bounds.bottom)).toBe(window.innerHeight);
    expect(dialog.contains(document.elementFromPoint(x, startY))).toBe(true);

    fireEvent.pointerDown(viewport, {
      button: 0,
      buttons: 1,
      clientX: x,
      clientY: startY,
      pointerId: 1,
      pointerType: "mouse",
    });
    expect(dialog.hasAttribute("data-swiping")).toBe(true);
    fireEvent.pointerMove(viewport, {
      buttons: 1,
      clientX: x,
      clientY: startY + 5,
      movementY: 5,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(viewport, {
      buttons: 1,
      clientX: x,
      clientY: startY + 150,
      movementY: 145,
      pointerId: 1,
      pointerType: "mouse",
    });
    expect(dialog.style.transform).not.toBe("");
    fireEvent.pointerUp(viewport, {
      button: 0,
      buttons: 0,
      clientX: x,
      clientY: startY + 150,
      pointerId: 1,
      pointerType: "mouse",
    });

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Swipe sheet" })).toBeNull());
    expect(getActiveHTMLElement()).toBe(trigger);
    expect(onComplete.mock.calls.filter(([open]) => open === false)).toHaveLength(1);
  });
});
