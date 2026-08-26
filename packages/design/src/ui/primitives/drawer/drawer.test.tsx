import { useState } from "react";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PresenceState } from "../context-menu/types";
import { Drawer } from "./drawer";
import type { DrawerOpenChange } from "./types";

afterEach(cleanup);

describe("Drawer", () => {
  it("keeps a controlled dialog mounted through exit, contains focus, and restores the trigger", async () => {
    const originalGetAnimations = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "getAnimations",
    );
    let finishExit: (() => void) | undefined;
    const exitFinished = new Promise<void>((resolve) => {
      finishExit = resolve;
    });

    Object.defineProperty(Element.prototype, "getAnimations", {
      configurable: true,
      value: () => [{ finished: exitFinished }] as unknown as Animation[],
    });

    try {
      const changes: DrawerOpenChange[] = [];
      const presence: PresenceState[] = [];
      const restored = vi.fn();

      const Harness = () => {
        const [open, setOpen] = useState(false);

        return (
          <Drawer
            description="Drawer description"
            focusRestoration="trigger"
            onOpenChange={(change) => {
              changes.push(change);
              setOpen(change.open);
            }}
            onPresenceChange={(state) => presence.push(state)}
            onRestoreFocus={restored}
            open={open}
            placement="right"
            title="Drawer title"
            triggerLabel="Open drawer"
          >
            <button type="button">Drawer action</button>
          </Drawer>
        );
      };

      render(<Harness />);
      const trigger = screen.getByRole("button", { name: "Open drawer" });
      fireEvent.click(trigger);

      const dialog = await screen.findByRole("dialog", { name: "Drawer title" });
      await waitFor(() =>
        expect(dialog === document.activeElement || dialog.contains(document.activeElement)).toBe(
          true,
        ),
      );
      expect(changes).toContainEqual({ open: true, reason: "trigger" });

      fireEvent.click(screen.getByRole("button", { name: "닫기" }));
      expect(document.body.contains(dialog)).toBe(true);
      expect(presence).toContain("exiting");

      finishExit?.();
      await waitFor(() =>
        expect(screen.queryByRole("dialog", { name: "Drawer title" })).toBeNull(),
      );
      expect(changes).toContainEqual({ open: false, reason: "action" });
      expect(presence).toContain("unmounted");
      expect(restored).toHaveBeenCalled();
      expect(document.activeElement).toBe(trigger);
    } finally {
      if (originalGetAnimations) {
        Object.defineProperty(Element.prototype, "getAnimations", originalGetAnimations);
      } else {
        Reflect.deleteProperty(Element.prototype, "getAnimations");
      }
    }
  });
});
