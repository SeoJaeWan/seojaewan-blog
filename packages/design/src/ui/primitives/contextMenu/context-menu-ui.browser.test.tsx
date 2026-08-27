import { useRef, useState } from "react";

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, getActiveHTMLElement, renderUITest } from "../testing";
import { ContextMenuUI } from "./context-menu-ui";

afterEach(cleanupUITest);

const browserTest = /Chrome/u.test(navigator.userAgent) ? it : it.skip;

function ControlledReplacementFixture() {
  const [activeMenu, setActiveMenu] = useState<"f1" | "f2" | null>(null);
  const restoreFocusRef = useRef<HTMLButtonElement>(null);

  const setMenuOpen = (menu: "f1" | "f2", open: boolean) => {
    setActiveMenu((current) => (open ? menu : current === menu ? null : current));
  };

  return (
    <div>
      <button ref={restoreFocusRef} type="button">
        Pre-replacement focus
      </button>
      <ContextMenuUI.Root
        onOpenChange={(open) => setMenuOpen("f1", open)}
        open={activeMenu === "f1"}
      >
        <ContextMenuUI.Trigger data-testid="f1">F1 surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content aria-label="F1 actions" finalFocus={restoreFocusRef}>
          <ContextMenuUI.Item>F1 action</ContextMenuUI.Item>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>
      <ContextMenuUI.Root
        onOpenChange={(open) => setMenuOpen("f2", open)}
        open={activeMenu === "f2"}
      >
        <ContextMenuUI.Trigger data-testid="f2">F2 surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content aria-label="F2 actions" finalFocus={restoreFocusRef}>
          <ContextMenuUI.Item>F2 action</ContextMenuUI.Item>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>
    </div>
  );
}

describe("ContextMenuUI (Chromium)", () => {
  browserTest("제어된 F1에서 F2로의 교체를 지원하고 교체 전 focus를 복원한다", async () => {
    renderUITest(<ControlledReplacementFixture />);

    const restoreFocus = screen.getByRole("button", { name: "Pre-replacement focus" });
    restoreFocus.focus();

    fireEvent.contextMenu(screen.getByTestId("f1"), { clientX: 20, clientY: 30 });
    expect(await screen.findByRole("menu", { name: "F1 actions" })).toBeTruthy();

    fireEvent.contextMenu(screen.getByTestId("f2"), { clientX: 80, clientY: 90 });
    expect(await screen.findByRole("menu", { name: "F2 actions" })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("menu", { name: "F1 actions" })).toBeNull());

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("menu", { name: "F2 actions" })).toBeNull());
    await waitFor(() => expect(getActiveHTMLElement()).toBe(restoreFocus));
  });

  browserTest("touch long press로 열린다", async () => {
    renderUITest(
      <ContextMenuUI.Root>
        <ContextMenuUI.Trigger>Touch surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content aria-label="Touch actions">
          <ContextMenuUI.Item>Touch action</ContextMenuUI.Item>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>,
    );

    const surface = screen.getByText("Touch surface");
    const touchStart = new Event("touchstart", { bubbles: true, cancelable: true });
    Object.defineProperty(touchStart, "touches", {
      value: [{ clientX: 32, clientY: 32, identifier: 1, target: surface }],
    });
    fireEvent(surface, touchStart);

    expect(
      await screen.findByRole("menu", { name: "Touch actions" }, { timeout: 1200 }),
    ).toBeTruthy();
    fireEvent(surface, new Event("touchend", { bubbles: true, cancelable: true }));
  });
});
