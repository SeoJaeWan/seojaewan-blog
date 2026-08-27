import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { SelectUI, type SelectUIOption } from "./index";

const options: readonly SelectUIOption[] = [
  { label: "Desktop", value: "desktop" },
  { label: "Documents", value: "documents" },
  { disabled: true, label: "Archive", value: "archive" },
];

const SelectFixture = () => {
  const [selected, setSelected] = useState<string | null>("documents");

  return (
    <div style={{ minHeight: 280, padding: 24 }}>
      <SelectUI.Root items={options} onValueChange={setSelected} value={selected}>
        <SelectUI.Label>Tag</SelectUI.Label>
        <SelectUI.Trigger>
          <SelectUI.Value placeholder="Choose a tag" />
        </SelectUI.Trigger>
        <SelectUI.Clear aria-label="Clear tag" />
        <SelectUI.Content>
          <SelectUI.List>
            {options.map((option) => (
              <SelectUI.Item disabled={option.disabled} key={option.value} value={option.value}>
                {option.label}
              </SelectUI.Item>
            ))}
          </SelectUI.List>
        </SelectUI.Content>
      </SelectUI.Root>
      <output aria-label="Selected tag">{selected ?? "none"}</output>
    </div>
  );
};

const meta = {
  title: "UI/Primitives/SelectUI",
  component: SelectFixture,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof SelectFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

export const KeyboardDisabledAndClear: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const trigger = body.getByRole("combobox", { name: "Tag" });
    const status = body.getByRole("status", { name: "Selected tag" });

    await userEvent.click(body.getByRole("button", { name: "Clear tag" }));
    await expect(status).toHaveTextContent("none");

    trigger.focus();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(status).toHaveTextContent("desktop");

    await userEvent.click(trigger);
    await userEvent.click(body.getByRole("option", { name: "Archive" }));
    await expect(status).toHaveTextContent("desktop");

    await userEvent.keyboard("{Escape}");
    await userEvent.click(body.getByRole("button", { name: "Clear tag" }));
    await expect(status).toHaveTextContent("none");
  },
};
