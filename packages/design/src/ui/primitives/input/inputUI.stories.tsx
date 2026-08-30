import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { InputUI } from "./index";

const meta = {
  title: "UI/Primitives/InputUI",
  component: InputUI,
  tags: ["autodocs"],
  args: {
    "aria-label": "파일 검색",
    placeholder: "검색",
  },
  parameters: {
    docs: {
      description: {
        component:
          "### What is it?\nInputUI는 사용자가 자유로운 텍스트를 입력하고 편집하는 native text-entry Primitive입니다.\n\n### Where is the product reference?\n제품 기준은 **Existing Taskbar의 free-text search**입니다. `Product Reference — Existing Taskbar Search` Story가 Existing state와 consumer가 소유한 local query를 보여 주며 검색 결과는 만들지 않습니다.\n\n### When should I use it?\nTaskbar 검색어처럼 사용자가 정해지지 않은 문자열을 직접 입력하고 수정해야 할 때 사용합니다.\n\n### When should I choose something else?\n미리 정의된 선택지를 입력으로 필터링해 고르면 ComboboxUI를, 텍스트 입력 없이 선택지만 고르면 SelectUI를 사용합니다. 검색 icon, submit action, suggestion/result panel과 전체 Taskbar layout은 higher layer가 조합합니다.\n\n### What states and interaction contract matter?\nDefault, value, placeholder, focus-visible, disabled와 native text editing을 보존하며 controlled와 uncontrolled value 정책을 모두 consumer에게 전달합니다. visible label 또는 다른 accessible naming 관계를 consumer가 제공해야 합니다.\n\n### Who owns what?\nPrimitive는 단일 text input의 semantic element, visual/focus/disabled 상태와 native props/ref 전달을 소유합니다. Consumer는 label, validation, controlled value와 query 변경 정책을 제공합니다. 검색 실행, 값 저장, suggestion 조회, 결과 선택과 결과 panel은 higher layer가 소유합니다.",
      },
    },
  },
} satisfies Meta<typeof InputUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "아직 텍스트를 입력하지 않은 기본 상태입니다. 사용자는 검색 placeholder가 보이는 활성 입력에 자유로운 텍스트를 입력할 수 있습니다.",
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: "검색할 수 없음",
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "기존 텍스트를 표시하지만 편집할 수 없는 비활성 상태입니다. 사용자의 입력 행동은 값을 바꾸지 않으며 Canvas에는 ‘검색할 수 없음’이 유지됩니다.",
      },
    },
  },
};

const ExistingTaskbarSearchProductReference = () => {
  const [query, setQuery] = useState("");

  return (
    <div className="wd-story-stage">
      <section
        className="wd-story-stack"
        data-product-state="existing"
        data-product-surface="existing-taskbar-search"
      >
        <span>Existing Taskbar search · Existing state</span>
        <label htmlFor="existing-taskbar-search-query">Windows 검색</label>
        <InputUI
          aria-describedby="existing-taskbar-search-query-status"
          id="existing-taskbar-search-query"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="검색"
          value={query}
        />
        <output aria-label="Existing Taskbar 검색 query" id="existing-taskbar-search-query-status">
          현재 query: {query || "비어 있음"}
        </output>
      </section>
    </div>
  );
};

export const ProductReference: Story = {
  name: "Product Reference — Existing Taskbar Search",
  parameters: {
    docs: {
      description: {
        story:
          "Surface: Existing Taskbar free-text search. Reference state: Existing. Consumer-owned local query와 visible probe만 두며 Primitive는 입력·편집과 accessible naming 관계를 보존합니다. 검색 실행, suggestion/result 조회와 결과 panel은 higher layer가 소유합니다.",
      },
    },
  },
  render: () => <ExistingTaskbarSearchProductReference />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "Windows 검색" });
    const status = canvas.getByRole("status", { name: "Existing Taskbar 검색 query" });

    await expect(status).toHaveTextContent("현재 query: 비어 있음");
    await userEvent.type(input, "window");
    await expect(input).toHaveValue("window");
    await expect(status).toHaveTextContent("현재 query: window");
  },
};

export const TextEntry: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "빈 text entry에 ‘documents’를 입력하는 사용자 흐름입니다. 입력 후 Canvas의 native 값이 ‘documents’로 바뀌며 play가 그 결과를 검증합니다.",
      },
    },
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "파일 검색" });

    await userEvent.type(input, "documents");

    await expect(input).toHaveValue("documents");
  },
};
