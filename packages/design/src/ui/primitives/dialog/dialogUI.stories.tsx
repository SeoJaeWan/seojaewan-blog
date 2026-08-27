import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { DialogUI } from "./dialogUI";

const DialogExample = ({
  disablePointerDismissal = false,
}: {
  disablePointerDismissal?: boolean;
}) => (
  <div style={{ minHeight: 240 }}>
    <button type="button">Outside action</button>
    <DialogUI disablePointerDismissal={disablePointerDismissal}>
      <DialogUI.Trigger>Open settings</DialogUI.Trigger>
      <DialogUI.Portal>
        <DialogUI.Backdrop data-testid="dialog-backdrop" />
        <DialogUI.Content>
          <DialogUI.Title>Settings</DialogUI.Title>
          <DialogUI.Description>Change your preferences.</DialogUI.Description>
          <label>
            Display name
            <input aria-label="Display name" defaultValue="Seo Jae-wan" />
          </label>
          <button type="button">Save preview</button>
          <DialogUI.Close>Done</DialogUI.Close>
        </DialogUI.Content>
      </DialogUI.Portal>
    </DialogUI>
  </div>
);

const meta = {
  component: DialogExample,
  parameters: { layout: "centered" },
  title: "UI/Primitives/DialogUI",
} satisfies Meta<typeof DialogExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FocusTrapAndDismissal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Open settings" });

    await userEvent.click(trigger);

    const dialog = await page.findByRole("dialog", { name: "Settings" });
    const firstField = page.getByRole("textbox", { name: "Display name" });
    const close = page.getByRole("button", { name: "Done" });
    await expect(firstField).toHaveFocus();

    close.focus();
    await userEvent.tab();
    await expect(firstField).toHaveFocus();
    await expect(dialog.contains(canvasElement.ownerDocument.activeElement)).toBe(true);

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument(),
    );
    await expect(trigger).toHaveFocus();

    await userEvent.click(trigger);
    await page.findByRole("dialog", { name: "Settings" });
    await userEvent.click(page.getByTestId("dialog-backdrop"));
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument(),
    );
    await expect(trigger).toHaveFocus();
  },
};

export const ProtectedPointerDismissal: Story = {
  args: { disablePointerDismissal: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Open settings" });

    await userEvent.click(trigger);
    const dialog = await page.findByRole("dialog", { name: "Settings" });
    await userEvent.click(page.getByTestId("dialog-backdrop"));
    await expect(dialog).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument(),
    );
    await expect(trigger).toHaveFocus();
  },
};
