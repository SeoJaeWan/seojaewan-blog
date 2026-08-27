import { useRef, useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { MenuUI } from "../menu";
import { ContextMenuUI } from "./contextMenuUI";

type ActionParts = Pick<typeof MenuUI, "Item" | "Separator">;

const SharedVisibleActionPath = ({ parts }: { parts: ActionParts }) => (
  <>
    <parts.Item>Open</parts.Item>
    <parts.Item disabled>Unavailable</parts.Item>
    <parts.Separator />
    <parts.Item variant="danger">Delete</parts.Item>
  </>
);

const VisibleEntryPointsFixture = () => (
  <main style={{ display: "grid", gap: 24, minHeight: 320, padding: 24 }}>
    <section>
      <h2>Visible Menu button</h2>
      <MenuUI.Root>
        <MenuUI.Trigger>Actions</MenuUI.Trigger>
        <MenuUI.Content aria-label="Visible menu actions">
          <SharedVisibleActionPath parts={MenuUI} />
        </MenuUI.Content>
      </MenuUI.Root>
    </section>
    <ContextMenuUI.Root>
      <ContextMenuUI.Trigger
        style={{
          alignItems: "center",
          border: "1px dashed currentcolor",
          display: "flex",
          minHeight: 120,
          padding: 16,
        }}
      >
        Right-click or long-press this Context Menu surface. It uses the same visible action-path
        fixture as the Menu button.
      </ContextMenuUI.Trigger>
      <ContextMenuUI.Content aria-label="Context actions">
        <SharedVisibleActionPath parts={ContextMenuUI} />
      </ContextMenuUI.Content>
    </ContextMenuUI.Root>
  </main>
);

const SubmenuFixture = () => (
  <ContextMenuUI.Root>
    <ContextMenuUI.Trigger style={{ minHeight: 240, padding: 24 }}>
      Right-click for sharing actions
    </ContextMenuUI.Trigger>
    <ContextMenuUI.Content aria-label="Context sharing actions">
      <ContextMenuUI.Item>Copy link</ContextMenuUI.Item>
      <ContextMenuUI.Submenu.Root>
        <ContextMenuUI.Submenu.Trigger>Send to</ContextMenuUI.Submenu.Trigger>
        <ContextMenuUI.Submenu.Content aria-label="Context send submenu">
          <ContextMenuUI.Item>Email</ContextMenuUI.Item>
          <ContextMenuUI.Item>Messages</ContextMenuUI.Item>
        </ContextMenuUI.Submenu.Content>
      </ContextMenuUI.Submenu.Root>
    </ContextMenuUI.Content>
  </ContextMenuUI.Root>
);

const ControlledReplacementFixture = () => {
  const [activeMenu, setActiveMenu] = useState<"first" | "second" | null>(null);
  const restoreFocusRef = useRef<HTMLButtonElement>(null);

  const setMenuOpen = (menu: "first" | "second", open: boolean) => {
    setActiveMenu((current) => (open ? menu : current === menu ? null : current));
  };

  return (
    <div style={{ display: "grid", gap: 16, minHeight: 280, padding: 24 }}>
      <button ref={restoreFocusRef} type="button">
        Pre-replacement focus
      </button>
      <ContextMenuUI.Root
        onOpenChange={(open) => setMenuOpen("first", open)}
        open={activeMenu === "first"}
      >
        <ContextMenuUI.Trigger>First surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content aria-label="First actions" finalFocus={restoreFocusRef}>
          <ContextMenuUI.Item>First action</ContextMenuUI.Item>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>
      <ContextMenuUI.Root
        onOpenChange={(open) => setMenuOpen("second", open)}
        open={activeMenu === "second"}
      >
        <ContextMenuUI.Trigger>Second surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content aria-label="Second actions" finalFocus={restoreFocusRef}>
          <ContextMenuUI.Item>Second action</ContextMenuUI.Item>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>
    </div>
  );
};

const meta = {
  title: "UI/Primitives/ContextMenuUI",
  component: VisibleEntryPointsFixture,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof VisibleEntryPointsFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

export const VisibleMenuAndContextEntryPoints: Story = {};
export const PointerAndKeyboardInvocation: Story = {
  render: () => <SubmenuFixture />,
  play: async ({ canvasElement }) => {
    const surface = within(canvasElement).getByText("Right-click for sharing actions");
    const body = within(document.body);

    await userEvent.pointer({ keys: "[MouseRight]", target: surface });
    await waitFor(() =>
      expect(body.getByRole("menu", { name: "Context sharing actions" })).toBeVisible(),
    );
    await userEvent.keyboard("{Escape}");

    surface.focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    await waitFor(() =>
      expect(body.getByRole("menu", { name: "Context sharing actions" })).toBeVisible(),
    );
  },
};
export const Submenu: Story = { render: () => <SubmenuFixture /> };
export const ControlledReplacement: Story = {
  render: () => <ControlledReplacementFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const restoreFocus = canvas.getByRole("button", { name: "Pre-replacement focus" });

    restoreFocus.focus();
    await userEvent.pointer({
      keys: "[MouseRight]",
      target: canvas.getByText("First surface"),
    });
    await waitFor(() => expect(page.getByRole("menu", { name: "First actions" })).toBeVisible());

    await userEvent.pointer({
      keys: "[MouseRight]",
      target: canvas.getByText("Second surface"),
    });
    await waitFor(() => expect(page.getByRole("menu", { name: "Second actions" })).toBeVisible());
    await waitFor(() =>
      expect(page.queryByRole("menu", { name: "First actions" })).not.toBeInTheDocument(),
    );

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(page.queryByRole("menu", { name: "Second actions" })).not.toBeInTheDocument(),
    );
    await expect(restoreFocus).toHaveFocus();
  },
};
export const TouchLongPress: Story = {
  render: () => <SubmenuFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const surface = canvas.getByText("Right-click for sharing actions");

    const touchStart = new Event("touchstart", { bubbles: true, cancelable: true });
    Object.defineProperty(touchStart, "touches", {
      value: [{ clientX: 32, clientY: 32, identifier: 1, target: surface }],
    });
    surface.dispatchEvent(touchStart);

    await waitFor(
      () => expect(page.getByRole("menu", { name: "Context sharing actions" })).toBeVisible(),
      { timeout: 1200 },
    );
    surface.dispatchEvent(new Event("touchend", { bubbles: true, cancelable: true }));
  },
};
export const NarrowViewport: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
