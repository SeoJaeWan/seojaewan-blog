import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  createResourceRef,
  type StartScreenAction,
  type StartScreenAllGroup,
} from "../../../../../headless/index.js";
import { TaskbarStartAll } from "./index.js";

const labels = [
  ["A", "Alpha", "content"],
  [
    "B",
    "Browser bookmarks with an intentionally long label that stays on one line",
    "external-shortcut",
  ],
  ["C", "CSS layout notes", "content"],
  ["D", "Design tokens", "content"],
  ["E", "External reference", "external-shortcut"],
  ["ㄱ", "가나다", "content"],
  ["ㅁ", "모두 보기", "content"],
  ["7", "7zip", "external-shortcut"],
  ["#", "_Tool", "external-shortcut"],
] as const;

const storyGroups = Object.freeze(
  labels.map(([key, label, kind], index) =>
    Object.freeze({
      key,
      items: Object.freeze([
        Object.freeze({
          label,
          resource: createResourceRef(
            kind,
            `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          ),
        }),
      ]),
    }),
  ),
) satisfies readonly StartScreenAllGroup[];

/** Story에서 controlled index state와 관찰 가능한 item intent를 연결한다. */
const InteractiveAll = ({ groups = storyGroups }: { groups?: readonly StartScreenAllGroup[] }) => {
  const [indexOpen, setIndexOpen] = useState(false);
  const [selected, setSelected] = useState("없음");
  const [view, setView] = useState("all");
  const handleAction = (action: StartScreenAction) => {
    if (action.type === "set-index-open") setIndexOpen(action.open);
    if (action.type === "set-view") setView(action.view);
  };

  return (
    <div
      lang="ko-KR"
      style={{
        background: "var(--wd-color-surface-panel)",
        color: "var(--wd-color-text-primary)",
        fontFamily: "var(--wd-font-family-sans)",
        height: 520,
        padding: "0 20px",
        width: 432,
      }}
    >
      <TaskbarStartAll
        groups={groups}
        indexOpen={indexOpen}
        onItemSelect={(item) => setSelected(`${item.resource.kind}:${item.label}`)}
        onScreenAction={handleAction}
      />
      <output aria-label="선택한 항목" style={{ position: "fixed", right: 16, top: 16 }}>
        {selected}
      </output>
      <output aria-label="Start view" style={{ position: "fixed", right: 16, top: 40 }}>
        {view}
      </output>
    </div>
  );
};

const meta = {
  title: "Design/Components/Taskbar/Start/All",
  component: TaskbarStartAll,
  tags: ["autodocs"],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "Content와 ExternalShortcut section, 실제 scroll heading, 4열 category index와 focus lifecycle을 소유하는 Start 제품 Component다.",
      },
      story: { iframeHeight: 600, inline: false },
    },
    layout: "centered",
  },
  args: {
    groups: storyGroups,
    indexOpen: false,
    onItemSelect: () => undefined,
    onScreenAction: () => undefined,
  },
} satisfies Meta<typeof TaskbarStartAll>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "Content와 외부 바로가기",
  render: () => <InteractiveAll />,
};

export const Empty: Story = {
  name: "빈 목록",
  render: () => <InteractiveAll groups={[]} />,
};
