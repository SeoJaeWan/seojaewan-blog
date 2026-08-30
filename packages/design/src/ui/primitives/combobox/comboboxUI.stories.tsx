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
    <div className="wd-story-stage">
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
  component: ComboboxUI.Root,
  subcomponents: {
    Label: ComboboxUI.Label,
    InputGroup: ComboboxUI.InputGroup,
    Input: ComboboxUI.Input,
    Trigger: ComboboxUI.Trigger,
    Clear: ComboboxUI.Clear,
    Content: ComboboxUI.Content,
    List: ComboboxUI.List,
    Item: ComboboxUI.Item,
    Empty: ComboboxUI.Empty,
  },
  tags: ["autodocs"],
  args: {
    items: options,
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "ComboboxUI는 text input으로 미리 정의된 선택지를 필터링하고 하나를 고르는 selection에 사용합니다. 자유 입력을 저장하면 InputUI를, 필터 입력 없이 목록에서 고르면 SelectUI를 선택합니다. public Root에 Label과 InputGroup(Input·Clear·Trigger), Content(List·Item·Empty)를 조합하며 Root가 input/open/value 상태를 연결합니다. keyboard 탐색, disabled option, Escape dismissal, clear와 label/combobox/listbox 접근성 관계를 family가 제공합니다. consumer는 items, controlled value와 결과 callback을 제공해야 하고, ComboboxUI는 원격 조회, 경로 이동, validation이나 선택값 영속화를 소유하지 않습니다.",
      },
    },
  },
} satisfies Meta<typeof ComboboxUI.Root>;

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
  render: () => <ComboboxFixture initialInputValue="" initialOpen={false} initialSelected={null} />,
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
  render: () => <ComboboxFixture initialInputValue="" initialOpen={false} initialSelected={null} />,
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
  parameters: {
    docs: {
      description: {
        story:
          "Documents가 선택된 독립 초기 상태입니다. Clear route를 누르면 입력과 controlled selection이 지워지고 Canvas의 Selected route가 ‘none’으로 바뀝니다.",
      },
    },
  },
  render: () => (
    <ComboboxFixture
      initialInputValue="Documents"
      initialOpen={false}
      initialSelected="documents"
    />
  ),
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
