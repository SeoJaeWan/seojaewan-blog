import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { SelectUI, type SelectUIOption } from "./index";

const options: readonly SelectUIOption[] = [
  { label: "Desktop", value: "desktop" },
  { label: "Documents", value: "documents" },
  { disabled: true, label: "Archive", value: "archive" },
];

const windowTagFilters: readonly SelectUIOption[] = [
  { label: "Design system", value: "design-system" },
  { label: "Storybook", value: "storybook" },
  { disabled: true, label: "Archived", value: "archived" },
];

interface SelectFixtureProps {
  initialOpen: boolean;
  initialSelected: string | null;
}

const SelectFixture = ({ initialOpen, initialSelected }: SelectFixtureProps) => {
  const [selected, setSelected] = useState<string | null>(initialSelected);

  return (
    <div className="wd-story-stage">
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
  component: SelectUI.Root,
  subcomponents: {
    Label: SelectUI.Label,
    Trigger: SelectUI.Trigger,
    Value: SelectUI.Value,
    Clear: SelectUI.Clear,
    Content: SelectUI.Content,
    List: SelectUI.List,
    Item: SelectUI.Item,
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
          "### What is it?\nSelectUI는 text input 없이 미리 정의된 선택지에서 값 하나를 고르는 단일-selection Primitive입니다.\n\n### Where is the product reference?\n제품 기준은 **Existing Window의 tag filter**입니다. `Product Reference — Existing Window Tag Filter` Story가 작은 local-data fixture와 **Existing state**를 보여 줍니다.\n\n### When should I use it?\nWindow의 결과 목록에 적용할 알려진 tag filter 하나를 고를 때 사용합니다.\n\n### When should I choose something else?\n선택지를 입력으로 필터링하면 ComboboxUI를, 자유 텍스트를 입력하면 InputUI를 사용합니다. 여러 tag를 동시에 편집하는 정책은 별도 multi-select product pattern이 맡아야 합니다.\n\n### What states and interaction contract matter?\nRoot에 Label, Trigger(Value), Clear와 Content(List·Item)를 조합합니다. open/value, keyboard 탐색, disabled option, Escape dismissal, clear와 label/combobox/listbox 접근성 관계를 보존합니다.\n\n### Who owns what?\nPrimitive는 local items의 open state와 단일 choice 계약을 소유합니다. Consumer는 tag option 조회, 선택 value를 실제 결과 filter로 적용하는 정책, 복수 선택, validation과 영속화를 소유합니다.",
      },
    },
  },
} satisfies Meta<typeof SelectUI.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const KeyboardSelection: Story = {
  name: "Contract — Keyboard Selection",
  parameters: {
    docs: {
      description: {
        story:
          "선택값이 없는 상태에서 trigger에 focus한 뒤 ArrowDown과 Enter로 첫 option을 고릅니다. Canvas의 Selected tag가 ‘desktop’으로 바뀌어 keyboard selection 결과를 보여 줍니다.",
      },
    },
  },
  render: () => <SelectFixture initialOpen={false} initialSelected={null} />,
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
  name: "Contract — Disabled Option",
  parameters: {
    docs: {
      description: {
        story:
          "Desktop이 선택되고 options surface가 열린 독립 초기 상태에서 비활성 Archive option을 누릅니다. 선택은 ‘desktop’으로 유지되며 Escape로 surface를 닫을 수 있습니다.",
      },
    },
  },
  render: () => <SelectFixture initialOpen initialSelected="desktop" />,
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
  name: "Contract — Clear Selection",
  parameters: {
    docs: {
      description: {
        story:
          "Documents가 선택된 독립 초기 상태입니다. Clear tag를 누르면 controlled selection이 지워지고 Canvas의 Selected tag가 ‘none’으로 바뀝니다.",
      },
    },
  },
  render: () => <SelectFixture initialOpen={false} initialSelected="documents" />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const status = body.getByRole("status", { name: "Selected tag" });

    await expect(status).toHaveTextContent("documents");
    await userEvent.click(body.getByRole("button", { name: "Clear tag" }));
    await expect(status).toHaveTextContent("none");
  },
};

const ExistingWindowTagFilterReference = () => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div
      className="wd-story-stage"
      data-product-state="existing"
      data-product-surface="existing-window-tag-filter"
      data-testid="window-tag-filter-stage"
    >
      <SelectUI.Root
        items={windowTagFilters}
        onOpenChange={setOpen}
        onValueChange={setSelected}
        open={open}
        value={selected}
      >
        <SelectUI.Label>Filter Window by tag</SelectUI.Label>
        <SelectUI.Trigger data-testid="window-tag-filter-control">
          <SelectUI.Value placeholder="Choose a Window tag" />
        </SelectUI.Trigger>
        <SelectUI.Clear aria-label="Clear Window tag" />
        <SelectUI.Content>
          <SelectUI.List>
            {windowTagFilters.map((option) => (
              <SelectUI.Item disabled={option.disabled} key={option.value} value={option.value}>
                {option.label}
              </SelectUI.Item>
            ))}
          </SelectUI.List>
        </SelectUI.Content>
      </SelectUI.Root>
      <dl className="wd-story-probe">
        <dt>Reference</dt>
        <dd>Existing Window · Existing state</dd>
        <dt>Open</dt>
        <dd>
          <output aria-label="Window tag filter open state">{open ? "open" : "closed"}</output>
        </dd>
        <dt>Value</dt>
        <dd>
          <output aria-label="Window tag filter value">{selected ?? "none"}</output>
        </dd>
      </dl>
    </div>
  );
};

export const ProductReference: Story = {
  name: "Product Reference — Existing Window Tag Filter",
  parameters: {
    docs: {
      description: {
        story:
          "Surface: Existing Window tag filter. Reference state: Existing. Local fixture는 open state와 single choice value만 재현합니다. tag option lookup, 선택 value를 실제 결과 filter로 적용하는 정책과 multi-select 편집은 Window의 higher layer가 소유합니다.",
      },
    },
  },
  render: () => <ExistingWindowTagFilterReference />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const canvas = within(canvasElement);
    const trigger = body.getByRole("combobox", { name: "Filter Window by tag" });
    const stage = canvas.getByTestId("window-tag-filter-stage");
    const control = canvas.getByTestId("window-tag-filter-control");
    const openProbe = canvas.getByRole("status", { name: "Window tag filter open state" });
    const valueProbe = canvas.getByRole("status", { name: "Window tag filter value" });

    const controlStyle = getComputedStyle(control);
    const contractualMinHeight = Number.parseFloat(controlStyle.minHeight);
    await expect(control.getBoundingClientRect().height).toBeCloseTo(contractualMinHeight);
    await expect(control.getBoundingClientRect().width).toBeLessThan(
      stage.getBoundingClientRect().width,
    );

    await expect(openProbe).toHaveTextContent("closed");
    await expect(valueProbe).toHaveTextContent("none");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(openProbe).toHaveTextContent("open");
    await userEvent.keyboard("{Enter}");
    await expect(valueProbe).toHaveTextContent("design-system");
    await expect(openProbe).toHaveTextContent("closed");
  },
};
