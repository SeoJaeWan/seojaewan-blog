import type { Meta, StoryObj } from "@storybook/react-vite";

import { TaskbarStartButton } from "../src";
import {
  resetShellStoryStorage,
  START_PANEL_ITEMS,
  START_PANEL_ITEMS_WITHOUT_REACT,
  UPDATED_START_PANEL_ITEMS,
} from "./shellFixtures";
import type { ShellHarnessProps } from "./shellHarness";
import { ShellHarness } from "./shellHarness";

type StartPanelStoryProps = Omit<ShellHarnessProps, "taskbarItems">;

const StartPanelStory = (props: StartPanelStoryProps) => (
  <ShellHarness {...props} taskbarItems={<TaskbarStartButton />} />
);

const START_PANEL_STATE_PRESETS = [
  {
    label: "기본 상태",
    storageSeed: {},
    windowsItems: START_PANEL_ITEMS,
  },
  {
    label: "저장된 React 고정",
    storageSeed: { windowsPinnedIds: ["react"] },
    windowsItems: START_PANEL_ITEMS,
  },
] satisfies NonNullable<ShellHarnessProps["statePresets"]>;

const START_PANEL_ITEM_STATES = [
  { label: "React 데이터 갱신", windowsItems: UPDATED_START_PANEL_ITEMS },
  { label: "React 항목 제거", windowsItems: START_PANEL_ITEMS_WITHOUT_REACT },
] satisfies NonNullable<ShellHarnessProps["itemStates"]>;

const meta = {
  title: "Shell/Taskbar/Start panel",
  component: StartPanelStory,
  args: {
    itemStates: START_PANEL_ITEM_STATES,
    statePresets: START_PANEL_STATE_PRESETS,
    storageSeed: {},
    windowsItems: START_PANEL_ITEMS,
  },
  beforeEach: () => {
    resetShellStoryStorage();

    return resetShellStoryStorage;
  },
  parameters: {
    controls: { disable: true },
  },
} satisfies Meta<typeof StartPanelStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Behavior: Story = {
  name: "동작 확인",
};
