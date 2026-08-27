import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { ComboboxUI } from "./index";

const options = [
  { label: "Desktop", value: "desktop" },
  { label: "Documents", value: "documents" },
  { disabled: true, label: "Archive", value: "archive" },
] as const;

const ComboboxFixture = () => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ minHeight: 280, padding: 24, width: 320 }}>
      <ComboboxUI.Root items={options} onValueChange={setSelected} value={selected}>
        <ComboboxUI.Label>Route</ComboboxUI.Label>
        <ComboboxUI.InputGroup>
          <ComboboxUI.Input placeholder="Find a route" />
          <ComboboxUI.Clear aria-label="Clear route" keepMounted />
          <ComboboxUI.Trigger aria-label="Show routes" />
        </ComboboxUI.InputGroup>
        <ComboboxUI.Content>
          <ComboboxUI.List />
          <ComboboxUI.Empty>No routes found</ComboboxUI.Empty>
        </ComboboxUI.Content>
      </ComboboxUI.Root>
      <output aria-label="Selected route">{selected ?? "none"}</output>
    </div>
  );
};

const meta = {
  title: "UI/Primitives/ComboboxUI",
  component: ComboboxFixture,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof ComboboxFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FilteringNavigationSelectionEmptyClearAndEscape: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const input = body.getByRole("combobox", { name: "Route" });

    await userEvent.type(input, "desk");
    await waitFor(() => expect(body.getByRole("option", { name: "Desktop" })).toBeVisible());
    await expect(body.queryByRole("option", { name: "Documents" })).not.toBeInTheDocument();

    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(body.getByRole("status", { name: "Selected route" })).toHaveTextContent("desktop");

    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, "missing");
    await expect(body.getByText("No routes found")).toBeVisible();

    await userEvent.clear(input);
    await userEvent.type(input, "doc");
    await userEvent.keyboard("{Escape}");
    await expect(input).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(body.getByRole("button", { name: "Clear route", hidden: true }));
    await expect(body.getByRole("status", { name: "Selected route" })).toHaveTextContent("none");
  },
};
