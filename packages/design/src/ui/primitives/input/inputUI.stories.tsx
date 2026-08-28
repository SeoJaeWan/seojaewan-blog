import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

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
          "InputUI는 사용자가 자유로운 텍스트를 입력하는 native text-entry primitive입니다. 미리 정의된 선택지를 입력으로 필터링해 고르는 경우에는 ComboboxUI를, 텍스트 입력 없이 선택지만 고르는 경우에는 SelectUI를 사용합니다.",
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
