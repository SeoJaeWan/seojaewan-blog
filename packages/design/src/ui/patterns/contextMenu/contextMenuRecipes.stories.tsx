import { useRef, useState } from "react";

import { Document20Regular, Folder20Regular } from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";

import {
  ContextMenuUI,
  FolderCategoryItemUI,
  FolderFileCardUI,
  FolderFileGridUI,
  FolderFrameUI,
  FolderSidebarUI,
  FolderViewerUI,
  TaskbarItemUI,
  TaskbarRootUI,
  WindowControlsUI,
  WindowFrameUI,
  WindowTabUI,
  WindowTitleBarUI,
} from "../../index";

import "./contextMenuRecipes.stories.css";

const WindowRecipeFixture = () => {
  const targetRef = useRef<HTMLElement>(null);
  const [result, setResult] = useState("none");

  return (
    <div className="wd-context-menu-recipe wd-context-menu-recipe--window">
      <ContextMenuUI.Root>
        <WindowFrameUI
          aria-label="Window context menu recipe"
          bounds={{ blockSize: 320, inlineSize: 600, insetBlockStart: 24, insetInlineStart: 24 }}
          titleBar={
            <ContextMenuUI.Trigger
              render={
                <WindowTitleBarUI
                  aria-label="Window recipe title bar"
                  controls={<WindowControlsUI />}
                  ref={targetRef}
                  tabIndex={0}
                >
                  <WindowTabUI
                    icon={<Folder20Regular aria-hidden="true" />}
                    titleContent="Window recipe"
                  />
                </WindowTitleBarUI>
              }
            />
          }
        >
          <p className="wd-context-menu-recipe__window-copy">
            Title bar에서 키보드나 보조 포인터로 창 작업 메뉴를 엽니다.
          </p>
          <output aria-label="Window recipe result">{result}</output>
        </WindowFrameUI>
        <ContextMenuUI.Content aria-label="Window recipe actions" finalFocus={targetRef}>
          <ContextMenuUI.Item onClick={() => setResult("restore")}>복원</ContextMenuUI.Item>
          <ContextMenuUI.Item onClick={() => setResult("minimize")}>최소화</ContextMenuUI.Item>
          <ContextMenuUI.Separator />
          <ContextMenuUI.Item disabled>이동</ContextMenuUI.Item>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>
    </div>
  );
};

const TaskbarRecipeFixture = () => {
  const targetRef = useRef<HTMLButtonElement>(null);
  const [result, setResult] = useState("none");

  return (
    <div className="wd-context-menu-recipe wd-context-menu-recipe--stack">
      <TaskbarRootUI aria-label="Taskbar context menu recipe">
        <ContextMenuUI.Root>
          <ContextMenuUI.Trigger
            render={
              <TaskbarItemUI
                icon={<Folder20Regular aria-hidden="true" />}
                label="파일 탐색기"
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
            <ContextMenuUI.Item onClick={() => setResult("open")}>창 열기</ContextMenuUI.Item>
            <ContextMenuUI.Item onClick={() => setResult("unpin")}>
              작업 표시줄에서 제거
            </ContextMenuUI.Item>
          </ContextMenuUI.Content>
        </ContextMenuUI.Root>
      </TaskbarRootUI>
      <output aria-label="Taskbar recipe result">{result}</output>
    </div>
  );
};

const FolderRecipeFixture = () => {
  const targetRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="wd-context-menu-recipe wd-context-menu-recipe--folder">
      <FolderFrameUI
        aria-label="Folder context menu recipe"
        bounds={{ blockSize: 360, inlineSize: 720 }}
        controls={<WindowControlsUI />}
        leading={<Folder20Regular aria-hidden="true" />}
        titleContent="문서"
      >
        <FolderViewerUI
          aria-label="Folder recipe viewer"
          sidebar={
            <FolderSidebarUI aria-label="Recipe sections">
              <FolderCategoryItemUI
                icon={<Folder20Regular aria-hidden="true" />}
                label="문서"
                selected
              />
            </FolderSidebarUI>
          }
          sidebarLabel="Folder recipe sidebar"
        >
          <FolderFileGridUI aria-label="Recipe files" cardSize="medium">
            <ContextMenuUI.Root>
              <ContextMenuUI.Trigger
                render={
                  <FolderFileCardUI
                    cover={<Document20Regular aria-hidden="true" />}
                    ref={targetRef}
                    selected
                    title="Component contract.md"
                  />
                }
              />
              <ContextMenuUI.Content aria-label="Folder recipe actions" finalFocus={targetRef}>
                <ContextMenuUI.Item>열기</ContextMenuUI.Item>
                <ContextMenuUI.Item>이름 바꾸기</ContextMenuUI.Item>
              </ContextMenuUI.Content>
            </ContextMenuUI.Root>
            <FolderFileCardUI
              cover={<Document20Regular aria-hidden="true" />}
              title="Product reference.md"
            />
          </FolderFileGridUI>
        </FolderViewerUI>
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
          "WindowTitleBarUI, TaskbarItemUI, FolderFileCardUI가 기존 ContextMenuUI parts를 직접 조합하는 Story-only product recipe입니다. 항목·section·action dispatch·single-active·focus lifecycle의 실제 제품 구성은 Shell이 소유하며, 이 fixture는 결정적 UI 예시만 제공합니다.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const WindowComposition: Story = {
  name: "Product Reference — Window title bar Context Menu",
  render: () => <WindowRecipeFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const target = canvas.getByRole("banner", { name: "Window recipe title bar" });

    target.focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    await fireEvent.contextMenu(target);

    const menu = await page.findByRole("menu", { name: "Window recipe actions" });
    const first = within(menu).getByRole("menuitem", { name: "복원" });
    const second = within(menu).getByRole("menuitem", { name: "최소화" });

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
  name: "Product Reference — Taskbar item Context Menu",
  render: () => <TaskbarRecipeFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const target = canvas.getByRole("button", { name: "파일 탐색기" });
    const result = canvas.getByRole("status", { name: "Taskbar recipe result" });

    target.focus();
    await userEvent.pointer({ keys: "[MouseRight]", target });

    const menu = await page.findByRole("menu", { name: "Taskbar recipe actions" });
    const primary = within(menu).getByRole("menuitem", { name: "창 열기" });

    primary.focus();
    await userEvent.keyboard("{Enter}");
    await expect(result).toHaveTextContent("open");
    await waitFor(() =>
      expect(page.queryByRole("menu", { name: "Taskbar recipe actions" })).not.toBeInTheDocument(),
    );
    await expect(target).toHaveFocus();
  },
};

export const FolderComposition: Story = {
  name: "Product Reference — Folder file Context Menu",
  render: () => <FolderRecipeFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const target = canvas.getByRole("button", { name: "Component contract.md" });
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
