import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

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
    await expect(body.getByRole("menu", { name: "Context sharing actions" })).toBeVisible();
    await userEvent.keyboard("{Escape}");

    surface.focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    await expect(body.getByRole("menu", { name: "Context sharing actions" })).toBeVisible();
  },
};
export const Submenu: Story = { render: () => <SubmenuFixture /> };
export const NarrowViewport: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
