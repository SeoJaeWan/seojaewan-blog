import { useState } from "react";

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, getActiveHTMLElement, renderUITest } from "../testing";
import { DrawerUI } from "./drawer-ui";

import "../../tokens/index.css";

afterEach(cleanupUITest);

const ControlledDrawer = ({
  durationZero = false,
  onComplete,
}: {
  durationZero?: boolean;
  onComplete: (open: boolean) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <DrawerUI onOpenChange={setOpen} onOpenChangeComplete={onComplete} open={open}>
      <DrawerUI.Trigger>Open controlled drawer</DrawerUI.Trigger>
      <DrawerUI.Portal>
        <DrawerUI.Backdrop />
        <DrawerUI.Viewport>
          <DrawerUI.Content style={durationZero ? { transitionDuration: "0ms" } : undefined}>
            <DrawerUI.Title>Controlled drawer</DrawerUI.Title>
            <DrawerUI.Description>Remains present for its exit.</DrawerUI.Description>
            <input aria-label="Drawer field" />
            <DrawerUI.Close>Close controlled drawer</DrawerUI.Close>
          </DrawerUI.Content>
        </DrawerUI.Viewport>
      </DrawerUI.Portal>
    </DrawerUI>
  );
};

const exerciseControlledExit = async (durationZero = false) => {
  const onComplete = vi.fn();
  renderUITest(<ControlledDrawer durationZero={durationZero} onComplete={onComplete} />);
  const trigger = screen.getByRole("button", { name: "Open controlled drawer" });
  fireEvent.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "Controlled drawer" });
  await waitFor(() => expect(dialog.contains(getActiveHTMLElement())).toBe(true));

  fireEvent.click(screen.getByRole("button", { name: "Close controlled drawer" }));
  expect(dialog.isConnected).toBe(true);

  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: "Controlled drawer" })).toBeNull(),
  );
  expect(getActiveHTMLElement()).toBe(trigger);
  expect(onComplete.mock.calls.filter(([open]) => open === false)).toHaveLength(1);
};

describe("DrawerUI in Chromium", () => {
  it("preserves a controlled exit, completes once, and restores focus", async () => {
    if (!("__vitest_browser__" in window)) {
      return;
    }

    await exerciseControlledExit();
  });

  it("reaches the same final state when duration is zero", async () => {
    if (!("__vitest_browser__" in window)) {
      return;
    }

    await exerciseControlledExit(true);
  });

  it("reaches the same final state with reduced motion", async () => {
    if (!("__vitest_browser__" in window)) {
      return;
    }

    const { cdp } = await import("vitest/browser");
    const session = cdp();
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });

    try {
      await exerciseControlledExit();
    } finally {
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
    }
  });
});
