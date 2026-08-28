import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { ComboboxUI } from "./index";

const options = [
  { label: "Desktop", value: "desktop" },
  { label: "Documents", value: "documents" },
  { disabled: true, label: "Archive", value: "archive" },
] as const;

interface ComboboxFixtureProps {
  initialInputValue: string;
  initialOpen: boolean;
  initialSelected: string | null;
}

const ComboboxFixture = ({
  initialInputValue,
  initialOpen,
  initialSelected,
}: ComboboxFixtureProps) => {
  const [selected, setSelected] = useState<string | null>(initialSelected);

  return (
    <div style={{ minHeight: 280, padding: 24, width: 320 }}>
      <ComboboxUI.Root
        defaultInputValue={initialInputValue}
        defaultOpen={initialOpen}
        items={options}
        onValueChange={setSelected}
        value={selected}
      >
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
  tags: ["autodocs"],
  args: {
    initialInputValue: "",
    initialOpen: false,
    initialSelected: null,
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "ComboboxUI는 text input으로 미리 정의된 선택지를 필터링하고 하나를 고르는 selection primitive입니다. 자유로운 text entry를 저장하는 InputUI와 다르며, 필터 입력이 필요 없는 선택에는 SelectUI를 사용합니다.",
      },
    },
  },
} satisfies Meta<typeof ComboboxFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FilteringAndKeyboardSelection: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "선택값이 없는 상태에서 ‘desk’를 입력해 Desktop만 필터링합니다. ArrowDown과 Enter로 그 option을 선택하면 Canvas의 Selected route가 ‘desktop’으로 바뀝니다.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const input = body.getByRole("combobox", { name: "Route" });

    await userEvent.type(input, "desk");
    await waitFor(() => expect(body.getByRole("option", { name: "Desktop" })).toBeVisible());
    await expect(body.queryByRole("option", { name: "Documents" })).not.toBeInTheDocument();

    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(body.getByRole("status", { name: "Selected route" })).toHaveTextContent("desktop");
  },
};

export const EmptyAndDismissal: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "선택값이 없는 상태에서 일치하지 않는 검색어를 입력해 빈 결과를 확인합니다. 이어 ‘doc’ 결과가 열린 상태에서 Escape를 누르면 선택 없이 options surface가 닫힙니다.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const input = body.getByRole("combobox", { name: "Route" });

    await userEvent.type(input, "missing");
    await expect(body.getByText("No routes found")).toBeVisible();

    await userEvent.clear(input);
    await userEvent.type(input, "doc");
    await userEvent.keyboard("{Escape}");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(body.getByRole("status", { name: "Selected route" })).toHaveTextContent("none");
  },
};

export const ClearSelection: Story = {
  args: {
    initialInputValue: "Documents",
    initialSelected: "documents",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Documents가 선택된 독립 초기 상태입니다. Clear route를 누르면 입력과 controlled selection이 지워지고 Canvas의 Selected route가 ‘none’으로 바뀝니다.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const input = body.getByRole("combobox", { name: "Route" });

    await expect(body.getByRole("status", { name: "Selected route" })).toHaveTextContent(
      "documents",
    );
    await userEvent.click(body.getByRole("button", { name: "Clear route" }));
    await expect(body.getByRole("status", { name: "Selected route" })).toHaveTextContent("none");
    await expect(input).toHaveValue("");
  },
};
