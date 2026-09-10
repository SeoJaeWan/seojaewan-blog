import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { TaskbarPreview, withTaskbarDescription } from "../../taskbarStoryPreview.js";
import { TaskbarSearch } from "./index.js";

/** 실제 검색어와 진입 요청을 Canvas에서 보여준다. */
const SearchExample = () => {
  const [value, setValue] = useState("");
  const [count, setCount] = useState(0);

  return (
    <TaskbarPreview
      results={
        <>
          <p>
            입력값: <output aria-label="현재 검색어">{value || "(비어 있음)"}</output>
          </p>
          <p>
            검색 진입: <output aria-label="검색 진입 횟수">{count}</output>
          </p>
        </>
      }
    >
      <TaskbarSearch
        value={value}
        onValueChange={setValue}
        onAction={() => setCount((current) => current + 1)}
      />
    </TaskbarPreview>
  );
};

const meta = {
  title: "Design/Components/Taskbar/Search Input",
  component: TaskbarSearch,
  tags: ["autodocs"],
  render: (args) => (
    <TaskbarPreview>
      <TaskbarSearch {...args} />
    </TaskbarPreview>
  ),
  decorators: [withTaskbarDescription],
  parameters: {
    docs: {
      description: {
        component:
          "작업 표시줄의 검색창입니다. 클릭하거나 Tab으로 이동해 검색어를 입력할 수 있습니다. 검색 패널에서도 작업 표시줄의 같은 검색창을 사용합니다.",
      },
    },
  },
} satisfies Meta<typeof TaskbarSearch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "직접 입력해 보기",
  parameters: {
    taskbarDescription:
      "검색창을 클릭하거나 Tab으로 이동한 뒤 입력해 보세요. 한글·공백을 입력하고 선택·삭제할 수 있습니다. 아래에서 현재 입력값과 검색 진입 횟수를 확인할 수 있습니다.",
  },
  render: () => <SearchExample />,
};

export const Selected: Story = {
  name: "선택 상태",
  args: { selected: true },
  parameters: {
    taskbarDescription:
      "선택된 검색창의 배경과 푸른 돋보기를 보여 줍니다. 실제 입력창에 포커스가 생겨도 돋보기가 푸른색으로 바뀝니다.",
  },
};

export const Hover: Story = {
  name: "마우스를 올린 상태",
  parameters: {
    pseudo: { hover: ".taskbar-search" },
    taskbarDescription:
      "검색창에 마우스를 올렸을 때의 밝은 배경을 고정해 보여 줍니다. 입력하려면 클릭하세요.",
  },
};

export const Focus: Story = {
  name: "키보드 포커스",
  parameters: {
    pseudo: { focus: ".taskbar-search", focusVisible: ".taskbar-search" },
    taskbarDescription:
      "포커스 테두리와 중앙에 정렬된 푸른 돋보기를 보여 줍니다. 포커스 중에는 ‘검색’ 안내 문구가 숨겨집니다.",
  },
};

export const Disabled: Story = {
  name: "사용 불가",
  args: { disabled: true },
  parameters: {
    taskbarDescription:
      "검색을 사용할 수 없어 흐리게 표시됩니다. 클릭하거나 Tab으로 입력할 수 없고 검색 진입 요청도 보내지 않습니다.",
  },
};

export const Pressed: Story = {
  name: "누르고 있는 상태",
  parameters: {
    pseudo: { active: ".taskbar-search-surface", focus: ".taskbar-search" },
    taskbarDescription:
      "검색창을 누른 모습을 고정해 보여 줍니다. 돋보기는 원래 크기를 유지하고, 입력 포커스에 따라 푸른색으로 표시됩니다.",
  },
};
