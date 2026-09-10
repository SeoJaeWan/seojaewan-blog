import { useMemo, useRef, useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  createResourceRef,
  type OperationId,
  type StartAction,
  type StartControllerActions,
  type StartOperationHandle,
} from "../../../../../headless/index.js";
import { withTaskbarDescription } from "../../taskbarStoryPreview.js";
import { type StartPinnedItemViewModel,TaskbarStartPinned } from "./index.js";

const sourceItems = [
  {
    resource: createResourceRef("folder", "40000000-0000-4000-8000-000000000001"),
    label: "프로젝트 폴더",
  },
  {
    resource: createResourceRef("content", "40000000-0000-4000-8000-000000000002"),
    label: "디자인 시스템을 오래 유지하기 위한 아주 긴 문서 제목",
  },
  {
    resource: createResourceRef(
      "external-shortcut",
      "40000000-0000-4000-8000-000000000003",
    ),
    label: "OpenAI",
  },
  {
    resource: createResourceRef("content", "40000000-0000-4000-8000-000000000004"),
    label: "React",
  },
  {
    resource: createResourceRef("folder", "40000000-0000-4000-8000-000000000005"),
    label: "사진",
  },
  {
    resource: createResourceRef(
      "external-shortcut",
      "40000000-0000-4000-8000-000000000006",
    ),
    label: "GitHub",
  },
  {
    resource: createResourceRef("content", "40000000-0000-4000-8000-000000000007"),
    label: "키보드 탐색",
  },
  {
    resource: createResourceRef("folder", "40000000-0000-4000-8000-000000000008"),
    label: "마지막 폴더",
  },
] as const;

type StoryItem = (typeof sourceItems)[number];

/** 표시 위치로 future Context Menu가 소비할 실제 reorder capability를 만든다. */
const withCapabilities = (items: readonly StoryItem[]): readonly StartPinnedItemViewModel[] =>
  items.map((item, index) => ({
    ...item,
    reorderActions:
      index === 0
        ? (["right"] as const)
        : index === items.length - 1
          ? (["first", "left"] as const)
          : (["first", "left", "right"] as const),
  }));

/** Story에서 Start Action을 실제 controlled item 순서와 transition 결과에 연결한다. */
const PinnedStory = () => {
  const [items, setItems] = useState<readonly StoryItem[]>(sourceItems);
  const [lastAction, setLastAction] = useState("없음");
  const [lastOpened, setLastOpened] = useState("없음");
  const pendingActionRef = useRef<StartAction | null>(null);
  const sequenceRef = useRef(0);
  const actions = useMemo<StartControllerActions>(
    () => ({
      abortTransition: (_operationId, phase, reason) => {
        setLastAction(`중단: ${phase} (${reason})`);
        return true;
      },
      completeTransition: (_operationId, phase) => {
        if (phase === "start-reorder-measure-before") {
          const action = pendingActionRef.current;
          if (action?.type === "reorder" && typeof action.intent === "object") {
            const destination = action.intent.index;
            setItems((current) => {
              const from = current.findIndex(
                ({ resource }) =>
                  resource.kind === action.resource.kind && resource.id === action.resource.id,
              );
              if (from < 0) return current;
              const next = [...current];
              const [moved] = next.splice(from, 1);
              if (moved === undefined) return current;
              next.splice(destination, 0, moved);
              return next;
            });
          }
        }
        return true;
      },
      execute: (action) => {
        pendingActionRef.current = action;
        sequenceRef.current += 1;
        const operationId = `story-start-operation-${sequenceRef.current}` as OperationId;
        if (action.type === "reorder" && typeof action.intent === "object") {
          setLastAction(`${action.resource.kind} → ${action.intent.index + 1}번째`);
        }
        return {
          operationId,
          committed: Promise.resolve({
            status: "committed",
            value: { pinnedItems: [] },
          }),
          presented: new Promise(() => undefined),
          settled: new Promise(() => undefined),
        };
      },
      failTransition: (_operationId, phase) => {
        setLastAction(`실패: ${phase}`);
        return true;
      },
    }),
    [],
  );

  return (
    <div
      lang="ko-KR"
      style={{
        background: "rgb(243 246 250 / 94%)",
        borderRadius: 8,
        boxShadow: "0 12px 36px rgb(0 0 0 / 18%)",
        boxSizing: "border-box",
        margin: 24,
        minHeight: 330,
        width: 540,
      }}
    >
      <TaskbarStartPinned
        actions={actions}
        items={withCapabilities(items)}
        onItemOpen={(item) => setLastOpened(`${item.resource.kind}: ${item.label}`)}
        onShowAll={() => setLastAction("모두 보기")}
      />
      <div aria-live="polite" style={{ fontSize: 12, padding: "12px 24px" }}>
        <p>
          마지막 Action: <output aria-label="마지막 Start Action">{lastAction}</output>
        </p>
        <p>
          마지막 open: <output aria-label="마지막 Resource open">{lastOpened}</output>
        </p>
      </div>
    </div>
  );
};

const meta = {
  title: "Design/Components/Taskbar/Start/Pinned",
  component: TaskbarStartPinned,
  decorators: [withTaskbarDescription],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "Folder, Content와 ExternalShortcut을 6열로 표시하고 keyboard focus, pointer reorder와 150ms FLIP movement를 public Start Action에 연결한다.",
      },
    },
    layout: "centered",
    taskbarDescription:
      "첫·중간·마지막 위치 capability, 긴 두 줄 label, 6열 keyboard 이동과 실제 pointer reorder를 확인할 수 있다.",
  },
  args: {
    actions: {} as StartControllerActions,
    items: [],
  },
} satisfies Meta<typeof TaskbarStartPinned>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <PinnedStory />,
};

export const Empty: Story = {
  args: {
    actions: {
      abortTransition: () => false,
      completeTransition: () => false,
      execute: () => ({}) as StartOperationHandle,
      failTransition: () => false,
    },
    items: [],
  },
  render: (args) => (
    <div style={{ background: "rgb(243 246 250 / 94%)", minHeight: 180, width: 540 }}>
      <TaskbarStartPinned {...args} />
    </div>
  ),
};
