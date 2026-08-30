import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { ComboboxUI } from "./index";

const options = [
  { label: "Desktop", value: "desktop" },
  { label: "Documents", value: "documents" },
  { disabled: true, label: "Archive", value: "archive" },
] as const;

const windowRouteSuggestions = [
  { label: "Settings", value: "/settings" },
  { label: "Documents", value: "/documents" },
  { disabled: true, label: "Archive", value: "/archive" },
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
          "### What is it?\nComboboxUI는 text input으로 미리 정의된 선택지를 필터링하고 하나를 고르는 단일-selection Primitive입니다.\n\n### Where is the product reference?\n제품 기준은 **Existing Window의 route suggestion**입니다. `Product Reference — Existing Window Route Suggestions` Story가 작은 local-data fixture와 **Existing state**를 보여 줍니다.\n\n### When should I use it?\nWindow 안에서 이름 일부를 입력해 알려진 route 후보를 줄이고 하나를 선택할 때 사용합니다.\n\n### When should I choose something else?\n필터 입력 없이 목록에서 하나를 고르면 SelectUI를, 자유 입력을 저장하면 InputUI를 사용합니다. 고정된 짧은 command 목록은 MenuUI가 더 적합합니다.\n\n### What states and interaction contract matter?\nRoot에 Label과 InputGroup(Input·Clear·Trigger), Content(List·Item·Empty)를 조합합니다. input/open/value, keyboard 탐색, disabled option, empty 결과, Escape dismissal, clear와 label/combobox/listbox 접근성 관계를 보존합니다.\n\n### Who owns what?\nPrimitive는 local items의 filtering, open state와 단일 selection 계약을 소유합니다. Consumer는 route suggestion 조회와 변환, 선택 결과의 실제 routing, validation과 영속화를 소유합니다. ComboboxUI는 route 이동을 실행하지 않습니다.",
      },
    },
  },
} satisfies Meta<typeof ComboboxUI.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FilteringAndKeyboardSelection: Story = {
  name: "Contract — Filtering and Keyboard Selection",
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
  name: "Contract — Empty and Dismissal",
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
  name: "Contract — Clear Selection",
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

const ExistingWindowRouteSuggestionReference = () => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div
      className="wd-story-stage"
      data-product-state="existing"
      data-product-surface="existing-window-route-suggestion"
      data-testid="window-route-suggestion-stage"
    >
      <ComboboxUI.Root
        items={windowRouteSuggestions}
        onOpenChange={setOpen}
        onValueChange={setSelected}
        open={open}
        value={selected}
      >
        <ComboboxUI.Label>Open Window route</ComboboxUI.Label>
        <ComboboxUI.InputGroup data-testid="window-route-suggestion-control">
          <ComboboxUI.Input placeholder="Find a Window route" />
          <ComboboxUI.Clear aria-label="Clear Window route" keepMounted />
          <ComboboxUI.Trigger aria-label="Show Window routes" />
        </ComboboxUI.InputGroup>
        <ComboboxUI.Content>
          <ComboboxUI.List />
          <ComboboxUI.Empty>No Window routes found</ComboboxUI.Empty>
        </ComboboxUI.Content>
      </ComboboxUI.Root>
      <dl className="wd-story-probe">
        <dt>Reference</dt>
        <dd>Existing Window · Existing state</dd>
        <dt>Open</dt>
        <dd>
          <output aria-label="Window route suggestion open state">
            {open ? "open" : "closed"}
          </output>
        </dd>
        <dt>Value</dt>
        <dd>
          <output aria-label="Window route suggestion value">{selected ?? "none"}</output>
        </dd>
      </dl>
    </div>
  );
};

export const ProductReference: Story = {
  name: "Product Reference — Existing Window Route Suggestions",
  parameters: {
    docs: {
      description: {
        story:
          "Surface: Existing Window route suggestion. Reference state: Existing. Local fixture는 filtering, open state와 선택 value만 재현합니다. suggestion lookup과 label 변환, 선택된 route로의 실제 이동은 Window의 higher layer가 소유합니다.",
      },
    },
  },
  render: () => <ExistingWindowRouteSuggestionReference />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const canvas = within(canvasElement);
    const input = body.getByRole("combobox", { name: "Open Window route" });
    const stage = canvas.getByTestId("window-route-suggestion-stage");
    const control = canvas.getByTestId("window-route-suggestion-control");
    const openProbe = canvas.getByRole("status", {
      name: "Window route suggestion open state",
    });
    const valueProbe = canvas.getByRole("status", { name: "Window route suggestion value" });

    const controlStyle = getComputedStyle(control);
    const contractualControlSize = Number.parseFloat(
      controlStyle.getPropertyValue("--wd-combobox-control-size"),
    );
    const contractualBoxHeight =
      contractualControlSize +
      Number.parseFloat(controlStyle.borderTopWidth) +
      Number.parseFloat(controlStyle.borderBottomWidth);
    await expect(control.getBoundingClientRect().height).toBeCloseTo(contractualBoxHeight);
    await expect(control.getBoundingClientRect().width).toBeLessThan(
      stage.getBoundingClientRect().width,
    );

    await expect(openProbe).toHaveTextContent("closed");
    await expect(valueProbe).toHaveTextContent("none");
    await userEvent.type(input, "set");
    await waitFor(() => expect(body.getByRole("option", { name: "Settings" })).toBeVisible());
    await expect(openProbe).toHaveTextContent("open");

    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(valueProbe).toHaveTextContent("/settings");
    await expect(openProbe).toHaveTextContent("closed");
  },
};
