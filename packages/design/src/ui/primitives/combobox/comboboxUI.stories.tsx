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
          "### 무엇이며 어디에 쓰나요?\nComboboxUI는 글자를 입력해 미리 정한 후보를 줄이고 값 하나를 고르는 선택 도구입니다. Existing Window의 경로 제안처럼, 경로 이름 일부를 입력해서 찾을 때 사용합니다. 입력 없이 정해진 목록에서만 고르면 SelectUI를 사용합니다.\n\n### 제품에서는 어떻게 보이나요?\n`제품 예시 — 기존 Window 경로 제안` Story는 제한된 경로 행 안에 검색 입력을 놓습니다. 원본의 480×36px 행 기록은 배치 맥락을 설명하는 문서 근거이며 공개 크기 token이나 screenshot 계약이 아닙니다.\n\n### 어떤 상태와 동작을 확인하나요?\nLabel과 InputGroup(Input·Clear·Trigger), Content(List·Item·Empty)를 조합합니다. 입력에 따른 후보 줄이기, 열림, 값 하나 선택, 키보드 이동, 비활성 후보, 빈 결과, Escape 닫기와 지우기를 확인합니다.\n\n### 누가 무엇을 맡나요?\nComboboxUI는 전달받은 local 후보의 입력 필터, 열림과 단일 선택 동작을 맡습니다. Window 담당은 경로 후보 조회와 이름 변환, 선택 결과의 실제 이동, 검증과 저장을 맡습니다. ComboboxUI는 routing을 실행하지 않습니다.",
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
    <div className="wd-story-stage">
      <article
        className="wd-story-reference"
        data-product-state="existing"
        data-product-surface="existing-window-route-suggestion"
      >
        <p className="wd-story-reference__badge">제품 예시 · 기존 Window</p>
        <div className="wd-story-reference__layout">
          <section
            aria-labelledby="existing-window-route-title"
            className="wd-story-reference__frame"
          >
            <h2 className="wd-story-reference__heading" id="existing-window-route-title">
              경로 제안 행
            </h2>
            <ComboboxUI.Root
              items={windowRouteSuggestions}
              onOpenChange={setOpen}
              onValueChange={setSelected}
              open={open}
              value={selected}
            >
              <div
                data-testid="window-route-suggestion-row"
                style={{
                  alignItems: "center",
                  blockSize: "2.25rem",
                  display: "grid",
                  gap: "0.75rem",
                  gridTemplateColumns: "max-content minmax(0, 1fr)",
                  inlineSize: "min(100%, 30rem)",
                }}
              >
                <ComboboxUI.Label style={{ marginBlockEnd: 0 }}>경로</ComboboxUI.Label>
                <ComboboxUI.InputGroup
                  data-testid="window-route-suggestion-control"
                  style={{ inlineSize: "min(100%, 18rem)", justifySelf: "start" }}
                >
                  <ComboboxUI.Input placeholder="Window 경로 찾기" />
                  <ComboboxUI.Clear aria-label="Window 경로 지우기" keepMounted />
                  <ComboboxUI.Trigger aria-label="Window 경로 보기" />
                </ComboboxUI.InputGroup>
              </div>
              <ComboboxUI.Content>
                <ComboboxUI.List />
                <ComboboxUI.Empty>일치하는 Window 경로가 없습니다</ComboboxUI.Empty>
              </ComboboxUI.Content>
            </ComboboxUI.Root>
            <dl className="wd-story-reference__probe">
              <dt>제품 상태</dt>
              <dd>기존</dd>
              <dt>선택 방식</dt>
              <dd>입력으로 후보를 줄인 뒤 하나 선택</dd>
              <dt>열림</dt>
              <dd>
                <output aria-label="Window 경로 제안 열림 상태">{open ? "열림" : "닫힘"}</output>
              </dd>
              <dt>값</dt>
              <dd>
                <output aria-label="Window 경로 제안 값">{selected ?? "없음"}</output>
              </dd>
            </dl>
          </section>
          <p className="wd-story-reference__note">
            원본 Window의 480×36px 경로 행은 이 배치를 이해하기 위한 문서 근거입니다. Window 담당이
            후보 조회와 실제 이동을 맡고, ComboboxUI는 입력 필터와 값 하나 선택만 맡습니다.
          </p>
        </div>
      </article>
    </div>
  );
};

export const ProductReference: Story = {
  name: "제품 예시 — 기존 Window 경로 제안",
  parameters: {
    docs: {
      description: {
        story:
          "기존 Window의 제한된 경로 행에서 입력으로 후보를 줄이고 값 하나를 고르는 상태입니다. 480×36px 기록은 문서 근거일 뿐 공개 token이나 screenshot 계약이 아닙니다. Window 담당은 후보 조회·이름 변환·routing을, ComboboxUI는 local 입력 필터·열림·단일 선택을 맡습니다.",
      },
    },
  },
  render: () => <ExistingWindowRouteSuggestionReference />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const canvas = within(canvasElement);
    const input = body.getByRole("combobox", { name: "경로" });
    const row = canvas.getByTestId("window-route-suggestion-row");
    const control = canvas.getByTestId("window-route-suggestion-control");
    const openProbe = canvas.getByRole("status", {
      name: "Window 경로 제안 열림 상태",
    });
    const valueProbe = canvas.getByRole("status", { name: "Window 경로 제안 값" });

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
      row.getBoundingClientRect().width,
    );

    await expect(openProbe).toHaveTextContent("닫힘");
    await expect(valueProbe).toHaveTextContent("없음");
    await userEvent.type(input, "set");
    await waitFor(() => expect(body.getByRole("option", { name: "Settings" })).toBeVisible());
    await expect(openProbe).toHaveTextContent("열림");

    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(valueProbe).toHaveTextContent("/settings");
    await expect(openProbe).toHaveTextContent("닫힘");
    await userEvent.click(body.getByRole("button", { name: "Window 경로 지우기" }));
    await expect(valueProbe).toHaveTextContent("없음");
    await expect(input).toHaveValue("");
  },
};
