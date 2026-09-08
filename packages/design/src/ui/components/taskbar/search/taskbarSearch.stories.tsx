import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { TaskbarSearch } from "./taskbarSearch.js";

/**
 * 실제 검색어와 진입 요청을 Canvas에서 보여준다.
 *
 * 결과 panel을 모사하지 않고 입력값과 focus 진입의 관찰만 제공한다.
 */
const SearchExample = () => {
  const [value, setValue] = useState("");
  const [count, setCount] = useState(0);
  return (
    <div>
      <TaskbarSearch
        value={value}
        onValueChange={setValue}
        onAction={() => setCount((current) => current + 1)}
      />
      <p>
        입력값: <output aria-label="현재 검색어">{value || "(비어 있음)"}</output>
      </p>
      <p>
        검색 진입: <output aria-label="Search Action 횟수">{count}</output>
      </p>
    </div>
  );
};

const meta = {
  title: "Design/Components/Taskbar/Search",
  component: TaskbarSearch,
  tags: ["autodocs"],
  decorators: [
    (Story, context) => (
      <div>
        <p>
          {
            (context.parameters.docs as { description?: { story?: string } } | undefined)
              ?.description?.story
          }
        </p>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "작업 표시줄에서 직접 검색어를 입력하는 창이다. 클릭하거나 Tab으로 이동해 입력한다. 입력값과 진입 요청을 전달하며 결과 panel·추천·recent는 후속 Search 기능에서 연결한다.",
      },
    },
  },
} satisfies Meta<typeof TaskbarSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "직접 입력해 보기",
  parameters: {
    docs: {
      description: {
        story:
          "검색창을 클릭하거나 Tab으로 이동한 뒤 입력해 보세요. 한글·공백을 입력하고 선택·삭제할 수 있습니다. 아래에서 현재 입력값과 검색 진입 횟수를 확인할 수 있습니다.",
      },
    },
  },
  render: () => <SearchExample />,
};

export const Selected: Story = {
  name: "선택 상태",
  args: { selected: true },
  parameters: {
    docs: {
      description: {
        story:
          "외부에서 selected를 전달한 상태입니다. 배경과 아이콘이 강조됩니다. 마우스를 누르는 순간이나 input focus와는 별개의 지속적인 표현이며, 이 예제에는 결과 panel이 없습니다.",
      },
    },
  },
};

export const Hover: Story = {
  name: "마우스를 올린 상태",
  parameters: {
    docs: {
      description: {
        story:
          "검색창에 마우스를 올리면 배경이 밝아집니다. 밖으로 옮기면 원래 배경으로 돌아갑니다. 입력하려면 클릭하세요.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole("textbox", { name: "검색" }));
  },
};

export const Focus: Story = {
  name: "키보드 포커스",
  parameters: {
    docs: {
      description: {
        story:
          "Tab으로 검색창에 진입한 상태입니다. 테두리와 입력 커서로 현재 입력 대상을 확인합니다. 글자를 입력하거나 다시 클릭해도 입력을 이어갈 수 있고, Tab으로 다음 대상으로 이동합니다.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole("textbox", { name: "검색" })).toHaveFocus();
  },
};

export const Disabled: Story = {
  name: "사용 불가",
  args: { disabled: true },
  parameters: {
    docs: {
      description: {
        story:
          "검색을 사용할 수 없어 흐리게 표시됩니다. 클릭하거나 Tab으로 입력할 수 없고 검색 진입 요청도 보내지 않습니다.",
      },
    },
  },
};

export const Interaction: Story = {
  name: "입력 흐름 자동 확인",
  parameters: {
    docs: {
      description: {
        story:
          "자동으로 Tab 진입 → 입력 → 재클릭 → 내용 교체 → 삭제를 확인합니다. 검색 진입은 focus를 얻을 때 한 번 발생하며, 글자나 공백마다 열기 요청을 보내지 않습니다. 직접 조작은 ‘직접 입력해 보기’에서 시작하세요.",
      },
    },
  },
  render: () => <SearchExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "검색" });
    const count = canvas.getByRole("status", { name: "Search Action 횟수" });
    await userEvent.tab();
    await expect(input).toHaveFocus();
    await userEvent.type(input, "hello world");
    await expect(input).toHaveValue("hello world");
    await expect(count).toHaveTextContent("1");
    await userEvent.click(input);
    await expect(input).toHaveFocus();
    await expect(count).toHaveTextContent("1");
    await userEvent.clear(input);
    await userEvent.type(input, "검색어");
    await expect(input).toHaveValue("검색어");
    await expect(canvas.getByRole("status", { name: "현재 검색어" })).toHaveTextContent("검색어");
    await userEvent.clear(input);
    await expect(input).toHaveValue("");
  },
};
