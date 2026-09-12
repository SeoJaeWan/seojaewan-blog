import { Code24Regular } from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { createResourceRef } from "../../../../../headless/index.js";
import chromeIconSrc from "../../../../assets/taskbar/applications/chrome.png";
import { withTaskbarDescription } from "../../taskbarStoryPreview.js";
import { TaskbarStartIcon, type TaskbarStartIconProps } from "./index.js";

const resources = [
  {
    label: "Folder fallback",
    resource: createResourceRef("folder", "20000000-0000-4000-8000-000000000001"),
  },
  {
    label: "Content fallback",
    resource: createResourceRef("content", "20000000-0000-4000-8000-000000000002"),
  },
  {
    label: "ExternalShortcut fallback",
    resource: createResourceRef("external-shortcut", "20000000-0000-4000-8000-000000000003"),
  },
] as const;

/**
 * Start icon의 fallback, Application 주입과 두 layout variant를 같은 배경에서 비교한다.
 */
const IconCatalog = () => (
  <div
    style={{
      background: "var(--wd-color-surface-panel)",
      color: "var(--wd-color-text-primary)",
      display: "grid",
      fontFamily: "var(--wd-font-family-sans)",
      gap: 20,
      gridTemplateColumns: "max-content repeat(2, 80px)",
      padding: 24,
    }}
  >
    <strong>Resource</strong>
    <strong>All</strong>
    <strong>Pinned</strong>
    {resources.map(({ label, resource }) => (
      <div key={resource.id} style={{ display: "contents" }}>
        <span>{label}</span>
        <TaskbarStartIcon resource={resource} variant="all" />
        <TaskbarStartIcon resource={resource} variant="pinned" />
      </div>
    ))}
    <span>Application resolver</span>
    <TaskbarStartIcon
      resource={resources[1].resource}
      resolveIcon={() => <img alt="" src={chromeIconSrc} />}
      variant="all"
    />
    <TaskbarStartIcon
      resource={resources[2].resource}
      resolveIcon={() => <Code24Regular aria-hidden="true" />}
      variant="pinned"
    />
  </div>
);

const meta = {
  title: "Design/Components/Taskbar/Start/Icon",
  component: TaskbarStartIcon,
  decorators: [withTaskbarDescription],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "Application이 Resource별 icon을 주입하고, 누락된 Folder·Content·ExternalShortcut은 Start의 기본 icon으로 표시한다.",
      },
    },
    layout: "centered",
    taskbarDescription:
      "All 25px과 Pinned 34px slot에서 Resource별 fallback과 Application 주입 결과를 비교한다.",
  },
  args: {
    resource: resources[0].resource,
    variant: "all",
  },
} satisfies Meta<TaskbarStartIconProps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Catalog: Story = {
  render: () => <IconCatalog />,
};
