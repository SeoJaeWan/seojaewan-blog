import { useRef, useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";

import {
  ContextMenuUI,
  FolderFrameUI,
  FolderViewerUI,
  TaskbarItemUI,
  TaskbarRootUI,
  WindowControlsUI,
  WindowFrameUI,
  WindowTitleBarUI,
} from "../../index";

const WindowRecipeFixture = () => {
  const targetRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState("none");

  return (
    <div style={{ height: 380, position: "relative", width: 680 }}>
      <WindowFrameUI
        aria-label="Window context menu recipe"
        bounds={{ blockSize: 320, inlineSize: 600, insetBlockStart: 24, insetInlineStart: 24 }}
        titleBar={
          <WindowTitleBarUI
            controls={<WindowControlsUI />}
            leading="□"
            titleContent="Window recipe"
          />
        }
      >
        <ContextMenuUI.Root>
          <ContextMenuUI.Trigger
            aria-label="Window recipe target"
            className="wd-story-target"
            ref={targetRef}
            tabIndex={0}
          >
            Window content target
          </ContextMenuUI.Trigger>
          <ContextMenuUI.Content aria-label="Window recipe actions" finalFocus={targetRef}>
            <ContextMenuUI.Item onClick={() => setResult("first")}>First action</ContextMenuUI.Item>
            <ContextMenuUI.Item onClick={() => setResult("second")}>
              Second action
            </ContextMenuUI.Item>
            <ContextMenuUI.Separator />
            <ContextMenuUI.Item disabled>Unavailable action</ContextMenuUI.Item>
          </ContextMenuUI.Content>
        </ContextMenuUI.Root>
        <output aria-label="Window recipe result">{result}</output>
      </WindowFrameUI>
    </div>
  );
};

const TaskbarRecipeFixture = () => {
  const targetRef = useRef<HTMLButtonElement>(null);
  const [result, setResult] = useState("none");

  return (
    <div className="wd-story-stack">
      <TaskbarRootUI aria-label="Taskbar context menu recipe">
        <ContextMenuUI.Root>
          <ContextMenuUI.Trigger
            render={
              <TaskbarItemUI
                icon="▣"
                label="Taskbar recipe target"
                ref={targetRef}
                state="running"
              />
            }
          />
          <ContextMenuUI.Content
            aria-label="Taskbar recipe actions"
            finalFocus={targetRef}
            side="top"
          >
            <ContextMenuUI.Item onClick={() => setResult("primary")}>
              Primary action
            </ContextMenuUI.Item>
            <ContextMenuUI.Item onClick={() => setResult("secondary")}>
              Secondary action
            </ContextMenuUI.Item>
          </ContextMenuUI.Content>
        </ContextMenuUI.Root>
      </TaskbarRootUI>
      <output aria-label="Taskbar recipe result">{result}</output>
    </div>
  );
};

const FolderRecipeFixture = () => {
  const targetRef = useRef<HTMLDivElement>(null);

  return (
    <div className="wd-story-stack" style={{ width: 760 }}>
      <FolderFrameUI
        aria-label="Folder context menu recipe"
        bounds={{ blockSize: 360, inlineSize: 720 }}
        controls={<WindowControlsUI />}
        leading="▤"
        titleContent="Folder recipe"
      >
        <FolderViewerUI
          aria-label="Folder recipe viewer"
          contentSlot={
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, 1fr)" }}>
              <ContextMenuUI.Root>
                <ContextMenuUI.Trigger
                  aria-label="Folder recipe target"
                  className="wd-story-target"
                  ref={targetRef}
                  tabIndex={0}
                >
                  Folder content target
                </ContextMenuUI.Trigger>
                <ContextMenuUI.Content aria-label="Folder recipe actions" finalFocus={targetRef}>
                  <ContextMenuUI.Item>First folder action</ContextMenuUI.Item>
                  <ContextMenuUI.Item>Second folder action</ContextMenuUI.Item>
                </ContextMenuUI.Content>
              </ContextMenuUI.Root>
              <div className="wd-story-target">Deterministic companion tile</div>
            </div>
          }
          sidebar={<nav aria-label="Recipe sections">Section fixture</nav>}
          sidebarLabel="Folder recipe sidebar"
        />
      </FolderFrameUI>
      <button type="button">Outside dismissal target</button>
    </div>
  );
};

const meta = {
  title: "UI/Patterns/Context Menu Recipes",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Window, Taskbar, Folder public components가 기존 ContextMenuUI parts를 직접 조합하는 Story-only recipe입니다. 항목·section·action dispatch·single-active·focus lifecycle의 실제 제품 구성은 Shell이 소유하며, 이 fixture는 결정적 UI 예시만 제공합니다.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const WindowComposition: Story = {
  name: "recipe — Window",
  render: () => <WindowRecipeFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const target = canvas.getByLabelText("Window recipe target");

    target.focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    await fireEvent.contextMenu(target);

    const menu = await page.findByRole("menu", { name: "Window recipe actions" });
    const first = within(menu).getByRole("menuitem", { name: "First action" });
    const second = within(menu).getByRole("menuitem", { name: "Second action" });

    first.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(second).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(page.queryByRole("menu", { name: "Window recipe actions" })).not.toBeInTheDocument(),
    );
    await expect(target).toHaveFocus();
  },
};

export const TaskbarComposition: Story = {
  name: "recipe — Taskbar",
  render: () => <TaskbarRecipeFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const target = canvas.getByRole("button", { name: "Taskbar recipe target" });
    const result = canvas.getByRole("status", { name: "Taskbar recipe result" });

    target.focus();
    await userEvent.pointer({ keys: "[MouseRight]", target });

    const menu = await page.findByRole("menu", { name: "Taskbar recipe actions" });
    const primary = within(menu).getByRole("menuitem", { name: "Primary action" });

    primary.focus();
    await userEvent.keyboard("{Enter}");
    await expect(result).toHaveTextContent("primary");
    await waitFor(() =>
      expect(page.queryByRole("menu", { name: "Taskbar recipe actions" })).not.toBeInTheDocument(),
    );
    await expect(target).toHaveFocus();
  },
};

export const FolderComposition: Story = {
  name: "recipe — Folder",
  render: () => <FolderRecipeFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const target = canvas.getByLabelText("Folder recipe target");
    const outside = canvas.getByRole("button", { name: "Outside dismissal target" });

    await userEvent.pointer({ keys: "[MouseRight]", target });
    await waitFor(() =>
      expect(page.getByRole("menu", { name: "Folder recipe actions" })).toBeVisible(),
    );

    await userEvent.click(outside);
    await waitFor(() =>
      expect(page.queryByRole("menu", { name: "Folder recipe actions" })).not.toBeInTheDocument(),
    );
    await expect(target).toHaveFocus();
  },
};
