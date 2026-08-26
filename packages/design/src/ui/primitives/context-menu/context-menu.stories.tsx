import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { ContextMenu } from "./context-menu";
import type { ContextMenuItem } from "./types";

const ITEMS: readonly ContextMenuItem[] = [
  { id: "open", kind: "action", label: "열기" },
  { checked: true, id: "pinned", kind: "checkbox", label: "작업 표시줄에 고정" },
  { id: "separator-primary", kind: "separator" },
  {
    id: "sort",
    items: [
      { checked: true, groupId: "sort-order", id: "sort-name", kind: "radio", label: "이름" },
      {
        checked: false,
        groupId: "sort-order",
        id: "sort-updated",
        kind: "radio",
        label: "수정한 날짜",
      },
    ],
    kind: "submenu",
    label: "정렬 기준",
  },
  { disabled: true, id: "unavailable", kind: "action", label: "사용할 수 없음" },
];

const ContextMenuStory = () => {
  const [lastAction, setLastAction] = useState("없음");

  return (
    <div style={{ minHeight: "18rem", padding: "4rem" }}>
      <p>오른쪽 클릭 또는 키보드 Context Menu 키로 메뉴를 여세요.</p>
      <p>마지막 작업: {lastAction}</p>
      <ContextMenu items={ITEMS} onAction={setLastAction} triggerLabel="창 작업 대상" />
    </div>
  );
};

const meta = {
  component: ContextMenuStory,
  parameters: {
    layout: "fullscreen",
  },
  title: "Primitives/Context Menu",
} satisfies Meta<typeof ContextMenuStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
