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
          "### 무엇이며 어디에 쓰나요?\nSelectUI는 글자를 입력하지 않고 미리 정한 목록에서 값 하나를 고르는 선택 도구입니다. Existing Window의 태그 필터처럼, 선택할 값이 짧고 이미 정해져 있을 때 사용합니다. 입력해서 후보를 줄여야 하면 ComboboxUI를 사용합니다.\n\n### 제품에서는 어떻게 보이나요?\n`제품 예시 — 기존 Window 태그 필터` Story는 제한된 태그 행 안에 고정 선택 control을 놓습니다. 원본의 320×36px 행 기록은 배치 맥락을 설명하는 문서 근거이며 공개 크기 token이나 screenshot 계약이 아닙니다.\n\n### 어떤 상태와 동작을 확인하나요?\nLabel, Trigger(Value), Clear와 Content(List·Item)를 조합합니다. 열림, 값 하나 선택, 키보드 이동, 비활성 후보, Escape 닫기와 지우기를 확인합니다.\n\n### 누가 무엇을 맡나요?\nSelectUI는 전달받은 local 목록의 열림과 단일 선택 동작을 맡습니다. Window 담당은 태그 후보 조회, 선택값을 결과에 적용하는 filter 정책, 여러 태그 선택, 검증과 저장을 맡습니다. SelectUI는 filter 정책을 결정하지 않습니다.",
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
    <div className="wd-story-stage">
      <article
        className="wd-story-reference"
        data-product-state="existing"
        data-product-surface="existing-window-tag-filter"
      >
        <p className="wd-story-reference__badge">제품 예시 · 기존 Window</p>
        <div className="wd-story-reference__layout">
          <section
            aria-labelledby="existing-window-tag-title"
            className="wd-story-reference__frame"
          >
            <h2 className="wd-story-reference__heading" id="existing-window-tag-title">
              태그 필터 행
            </h2>
            <SelectUI.Root
              items={windowTagFilters}
              onOpenChange={(nextOpen, details) => {
                if (!nextOpen && details.reason === "item-press") return;
                setOpen(nextOpen);
              }}
              onValueChange={setSelected}
              open={open}
              value={selected}
            >
              <div
                data-testid="window-tag-filter-row"
                style={{
                  alignItems: "center",
                  blockSize: "2.25rem",
                  display: "grid",
                  gap: "0.75rem",
                  gridTemplateColumns: "max-content minmax(0, 1fr)",
                  inlineSize: "min(100%, 20rem)",
                }}
              >
                <SelectUI.Label style={{ marginBlockEnd: 0 }}>태그</SelectUI.Label>
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    gap: "0.5rem",
                    minInlineSize: 0,
                  }}
                >
                  <SelectUI.Trigger
                    data-testid="window-tag-filter-control"
                    style={{ inlineSize: "min(100%, 11rem)" }}
                  >
                    <SelectUI.Value placeholder="Window 태그 선택" />
                  </SelectUI.Trigger>
                  <SelectUI.Clear aria-label="Window 태그 지우기" />
                </div>
              </div>
              <SelectUI.Content>
                <SelectUI.List>
                  {windowTagFilters.map((option) => (
                    <SelectUI.Item
                      disabled={option.disabled}
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </SelectUI.Item>
                  ))}
                </SelectUI.List>
              </SelectUI.Content>
            </SelectUI.Root>
            <dl className="wd-story-reference__probe">
              <dt>제품 상태</dt>
              <dd>기존</dd>
              <dt>선택 방식</dt>
              <dd>정해진 목록에서 값 하나 선택</dd>
              <dt>열림</dt>
              <dd>
                <output aria-label="Window 태그 필터 열림 상태">{open ? "열림" : "닫힘"}</output>
              </dd>
              <dt>값</dt>
              <dd>
                <output aria-label="Window 태그 필터 값">{selected ?? "없음"}</output>
              </dd>
            </dl>
          </section>
          <p className="wd-story-reference__note">
            원본 Window의 320×36px 태그 행은 이 배치를 이해하기 위한 문서 근거입니다. Window 담당이
            후보 조회·filter 정책·여러 태그 선택을 맡고, SelectUI는 고정 목록의 값 하나 선택만
            맡습니다. 이 제품 조합은 원본처럼 option 선택 뒤에도 목록을 열어 둡니다.
          </p>
        </div>
      </article>
    </div>
  );
};

export const ProductReference: Story = {
  name: "제품 예시 — 기존 Window 태그 필터",
  parameters: {
    docs: {
      description: {
        story:
          "기존 Window의 제한된 태그 행에서 정해진 목록의 값 하나를 고르는 상태입니다. 원본 조합처럼 option 선택 뒤에도 목록을 열어 두는 정책은 이 제품 예시가 locally 소유하며 generic SelectUI의 기본 close semantics는 바꾸지 않습니다. 320×36px 기록은 문서 근거일 뿐 공개 token이나 screenshot 계약이 아닙니다.",
      },
    },
  },
  render: () => <ExistingWindowTagFilterReference />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const canvas = within(canvasElement);
    const trigger = body.getByRole("combobox", { name: "태그" });
    const row = canvas.getByTestId("window-tag-filter-row");
    const control = canvas.getByTestId("window-tag-filter-control");
    const openProbe = canvas.getByRole("status", { name: "Window 태그 필터 열림 상태" });
    const valueProbe = canvas.getByRole("status", { name: "Window 태그 필터 값" });

    const controlStyle = getComputedStyle(control);
    const contractualMinHeight = Number.parseFloat(controlStyle.minHeight);
    await expect(control.getBoundingClientRect().height).toBeCloseTo(contractualMinHeight);
    await expect(control.getBoundingClientRect().width).toBeLessThan(
      row.getBoundingClientRect().width,
    );

    await expect(openProbe).toHaveTextContent("닫힘");
    await expect(valueProbe).toHaveTextContent("없음");
    await expect(
      canvas.queryByRole("button", { name: "Window 태그 지우기" }),
    ).not.toBeInTheDocument();
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(openProbe).toHaveTextContent("열림");
    await userEvent.keyboard("{Enter}");
    await expect(valueProbe).toHaveTextContent("design-system");
    await expect(openProbe).toHaveTextContent("열림");

    const clear = canvas.getByRole("button", { name: "Window 태그 지우기" });
    await expect(clear.querySelector("svg")).not.toBeNull();
    await expect(clear.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

    await userEvent.keyboard("{Escape}");
    await expect(openProbe).toHaveTextContent("닫힘");
    await expect(trigger).toHaveFocus();
    await userEvent.tab();
    await expect(clear).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(valueProbe).toHaveTextContent("없음");
    await expect(
      canvas.queryByRole("button", { name: "Window 태그 지우기" }),
    ).not.toBeInTheDocument();
  },
};
