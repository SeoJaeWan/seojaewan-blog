import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { TaskbarStartButton } from "../src";
import {
  readShellStoryStorage,
  resetShellStoryStorage,
  seedShellStoryStorage,
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

const meta = {
  title: "Shell/Functional/Start panel",
  component: StartPanelStory,
  args: {
    itemStates: [],
    windowsItems: START_PANEL_ITEMS,
  },
  beforeEach: () => {
    resetShellStoryStorage();

    return resetShellStoryStorage;
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "Windows, TaskbarPanelHost와 실제 TaskbarStartButton connector를 하나의 shell로 조립한다. " +
          "같은 harness의 taskbar slot에 이후 Search, app list, hover와 context connector를 추가할 수 있다.",
      },
    },
  },
  tags: ["autodocs", "test"],
} satisfies Meta<typeof StartPanelStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const getStoryPage = () => within(document.body);

const openStartPanel = async () => {
  const page = getStoryPage();
  const startButton = await page.findByRole("button", { name: "시작" });

  await userEvent.click(startButton);

  const dialog = await page.findByRole("dialog", { name: "시작" });
  const panelContainer = dialog.closest(".wb-taskbar-panel-container");

  if (!(panelContainer instanceof HTMLDivElement)) {
    throw new Error("Start panel container를 찾을 수 없습니다.");
  }

  await waitFor(async () => {
    await expect(panelContainer).toHaveAttribute("data-state", "open");
  });

  return { dialog, page, panelContainer, startButton };
};

const getPinnedItem = (dialog: HTMLElement) => {
  const pinnedItem = dialog.querySelector(".wb-windows-panel__pinned-item");

  if (!(pinnedItem instanceof HTMLButtonElement)) {
    throw new Error("고정됨 화면의 item button을 찾을 수 없습니다.");
  }

  return pinnedItem;
};

const findPinnedItem = async (dialog: HTMLElement, name: string) => {
  await waitFor(async () => {
    await expect(getPinnedItem(dialog)).toHaveAccessibleName(name);
  });

  return getPinnedItem(dialog);
};

const searchReact = async () => {
  const page = getStoryPage();
  const searchInput = page.getByRole("textbox", { name: "앱 및 문서 검색" });

  await userEvent.type(searchInput, "react");

  return page;
};

export const Overview: Story = {
  name: "전체 기능 검토",
};

export const SearchAndOpen: Story = {
  name: "검색 후 열기",
  play: async ({ step }) => {
    const { startButton } = await openStartPanel();
    const page = await searchReact();

    await step("검색 결과를 실행한다", async () => {
      await userEvent.click(page.getByRole("button", { name: "React" }));
    });

    await step("패널 닫힘과 windowOpen event를 확인한다", async () => {
      await waitFor(async () => {
        await expect(startButton).toHaveAttribute("aria-expanded", "false");
      });
      await waitFor(async () => {
        await expect(page.getByTestId("shell-event-log")).toHaveTextContent("windowOpen");
      });
      await expect(page.getByTestId("shell-event-log")).toHaveTextContent('"source":"search"');
    });
  },
};

export const OpenLocation: Story = {
  name: "검색 항목 위치 열기",
  play: async ({ step }) => {
    const { startButton } = await openStartPanel();
    const page = await searchReact();

    await step("검색 항목의 상세 화면을 선택한다", async () => {
      await userEvent.click(page.getByRole("button", { name: "React 자세히" }));
    });

    await step("파일 위치 열기를 실행한다", async () => {
      await userEvent.click(page.getByRole("button", { name: "파일 위치 열기" }));
    });

    await step("패널 닫힘과 windowOpenLocation event를 확인한다", async () => {
      await waitFor(async () => {
        await expect(startButton).toHaveAttribute("aria-expanded", "false");
      });
      await waitFor(async () => {
        await expect(page.getByTestId("shell-event-log")).toHaveTextContent("windowOpenLocation");
      });
    });
  },
};

export const PinLifecycle: Story = {
  name: "시작 화면과 작업 표시줄 고정",
  play: async ({ step }) => {
    await openStartPanel();
    const page = await searchReact();

    await userEvent.click(page.getByRole("button", { name: "React 자세히" }));

    await step("두 surface에 항목을 고정한다", async () => {
      await userEvent.click(page.getByRole("button", { name: "시작 화면에 고정" }));
      await userEvent.click(page.getByRole("button", { name: "작업 표시줄에 고정" }));

      await waitFor(async () => {
        await expect(page.getByRole("button", { name: "시작 화면에서 제거" })).toBeEnabled();
        await expect(page.getByRole("button", { name: "작업 표시줄에서 제거" })).toBeEnabled();
      });
      await expect(readShellStoryStorage()).toEqual({
        taskbarPinnedIds: JSON.stringify(["react"]),
        windowsPinnedIds: JSON.stringify(["react"]),
      });
    });

    await step("두 surface에서 항목을 제거한다", async () => {
      await userEvent.click(page.getByRole("button", { name: "시작 화면에서 제거" }));
      await userEvent.click(page.getByRole("button", { name: "작업 표시줄에서 제거" }));

      await waitFor(async () => {
        await expect(page.getByRole("button", { name: "시작 화면에 고정" })).toBeEnabled();
        await expect(page.getByRole("button", { name: "작업 표시줄에 고정" })).toBeEnabled();
      });
      await expect(readShellStoryStorage()).toEqual({
        taskbarPinnedIds: JSON.stringify([]),
        windowsPinnedIds: JSON.stringify([]),
      });
    });
  },
};

export const PersistedPins: Story = {
  name: "저장된 시작 화면 고정 복원",
  beforeEach: () => {
    seedShellStoryStorage({ windowsPinnedIds: ["react"] });

    return resetShellStoryStorage;
  },
  play: async ({ step }) => {
    const { dialog, page } = await openStartPanel();

    await step("저장된 항목이 고정됨 화면에 복원된다", async () => {
      await expect(await findPinnedItem(dialog, "React")).toBeVisible();
      await expect(page.getByRole("heading", { name: "고정됨" })).toBeVisible();
    });
  },
};

export const ContextRequest: Story = {
  name: "검색 항목 Context 요청",
  play: async ({ step }) => {
    const { startButton } = await openStartPanel();
    const page = await searchReact();
    const searchResult = page.getByRole("button", { name: "React" });

    await step("검색 항목에서 native contextmenu를 요청한다", async () => {
      await userEvent.pointer({ keys: "[MouseRight]", target: searchResult });
    });

    await step("현재 panel은 유지하고 context event를 전달한다", async () => {
      await expect(startButton).toHaveAttribute("aria-expanded", "true");
      await waitFor(async () => {
        await expect(page.getByTestId("shell-event-log")).toHaveTextContent(
          "windowContextMenuRequested",
        );
      });
    });
  },
};

export const DynamicItems: Story = {
  name: "동적 항목 갱신과 stale 고정 정리",
  args: {
    itemStates: [
      { label: "React 항목 갱신", windowsItems: UPDATED_START_PANEL_ITEMS },
      { label: "React 항목 제거", windowsItems: START_PANEL_ITEMS_WITHOUT_REACT },
    ],
  },
  beforeEach: () => {
    seedShellStoryStorage({ windowsPinnedIds: ["react"] });

    return resetShellStoryStorage;
  },
  play: async ({ step }) => {
    const { dialog, page } = await openStartPanel();

    await expect(await findPinnedItem(dialog, "React")).toBeVisible();

    await step("동일 ID의 최신 항목을 반영한다", async () => {
      await userEvent.click(page.getByRole("button", { name: "React 항목 갱신" }));
      await expect(await findPinnedItem(dialog, "React 업데이트")).toBeVisible();
    });

    await step("사라진 pinned item의 exit lifecycle을 완료한다", async () => {
      await userEvent.click(page.getByRole("button", { name: "React 항목 제거" }));
      await waitFor(
        async () => {
          await expect(dialog.querySelector(".wb-windows-panel__pinned-item")).toBeNull();
        },
        { timeout: 2_000 },
      );
      await expect(readShellStoryStorage().windowsPinnedIds).toBe(JSON.stringify([]));
    });
  },
};

export const PanelDismissal: Story = {
  name: "바깥 클릭과 Escape로 닫기",
  play: async ({ step }) => {
    const firstOpen = await openStartPanel();

    await step("panel 바깥을 클릭하면 닫힌다", async () => {
      await userEvent.click(firstOpen.page.getByTestId("shell-story-surface"));
      await waitFor(async () => {
        await expect(firstOpen.startButton).toHaveAttribute("aria-expanded", "false");
      });
      await waitFor(async () => {
        await expect(firstOpen.panelContainer.isConnected).toBe(false);
      });
    });

    const secondOpen = await openStartPanel();

    await step("Escape를 누르면 닫힌다", async () => {
      await userEvent.keyboard("{Escape}");
      await waitFor(async () => {
        await expect(secondOpen.startButton).toHaveAttribute("aria-expanded", "false");
      });
    });
  },
};
