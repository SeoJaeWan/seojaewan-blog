import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { SelectUI, type SelectUIOption } from "./index";

const options: readonly SelectUIOption[] = [
  { label: "Desktop", value: "desktop" },
  { label: "Documents", value: "documents" },
  { disabled: true, label: "Archive", value: "archive" },
];

interface SelectFixtureProps {
  initialOpen: boolean;
  initialSelected: string | null;
}

const SelectFixture = ({ initialOpen, initialSelected }: SelectFixtureProps) => {
  const [selected, setSelected] = useState<string | null>(initialSelected);

  return (
    <div style={{ minHeight: 280, padding: 24 }}>
      <SelectUI.Root
        defaultOpen={initialOpen}
        items={options}
        onValueChange={setSelected}
        value={selected}
      >
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
  tags: ["autodocs"],
  args: {
    initialOpen: false,
    initialSelected: null,
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "SelectUI는 text input 없이 미리 정의된 선택지에서 값 하나를 고르는 selection primitive입니다. 선택지를 입력으로 필터링해야 하면 ComboboxUI를, 자유로운 텍스트를 입력해야 하면 InputUI를 사용합니다.",
      },
    },
  },
} satisfies Meta<typeof SelectFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

export const KeyboardSelection: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "선택값이 없는 상태에서 trigger에 focus한 뒤 ArrowDown과 Enter로 첫 option을 고릅니다. Canvas의 Selected tag가 ‘desktop’으로 바뀌어 keyboard selection 결과를 보여 줍니다.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const trigger = body.getByRole("combobox", { name: "Tag" });
    const status = body.getByRole("status", { name: "Selected tag" });

    trigger.focus();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(status).toHaveTextContent("desktop");
  },
};

export const DisabledOption: Story = {
  args: {
    initialOpen: true,
    initialSelected: "desktop",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Desktop이 선택되고 options surface가 열린 독립 초기 상태에서 비활성 Archive option을 누릅니다. 선택은 ‘desktop’으로 유지되며 Escape로 surface를 닫을 수 있습니다.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const trigger = body.getByRole("combobox", { name: "Tag" });
    const status = body.getByRole("status", { name: "Selected tag" });

    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(await body.findByRole("option", { name: "Archive" }));
    await expect(status).toHaveTextContent("desktop");

    await userEvent.keyboard("{Escape}");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  },
};

export const ClearSelection: Story = {
  args: {
    initialSelected: "documents",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Documents가 선택된 독립 초기 상태입니다. Clear tag를 누르면 controlled selection이 지워지고 Canvas의 Selected tag가 ‘none’으로 바뀝니다.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const status = body.getByRole("status", { name: "Selected tag" });

    await expect(status).toHaveTextContent("documents");
    await userEvent.click(body.getByRole("button", { name: "Clear tag" }));
    await expect(status).toHaveTextContent("none");
  },
};
