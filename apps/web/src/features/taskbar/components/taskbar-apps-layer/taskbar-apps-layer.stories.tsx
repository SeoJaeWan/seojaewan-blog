import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { StoryStage } from '@seojaewan/design-system/story';

import {
  dragStoryPointer,
  pressStoryPointer,
  storyPointerInit,
} from '@/features/window/story-pointer';
import { getWorkArea } from '@/shared/hooks/use-work-area/use-work-area';
import { openStoryWindows, resetStoryStores } from '@/shared/stores/store-reset/story-stores';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import {
  hydrateWorkspaceStore,
  useWorkspaceStore,
} from '@/shared/stores/workspace-store/workspace-store';
import { getStoryWindowTitle, renderStoryWindow } from '@/shared/utils/window-rules/story-window';
import {
  CHROME_LATEST_POST_COUNT,
  getLatestPosts,
} from '@/shared/utils/workspace-rules/workspace-rules';

import {
  HOVER_PREVIEW_CLOSE_DELAY,
  HOVER_PREVIEW_OPEN_DELAY,
} from './hooks/use-hover-preview/use-hover-preview';
import { installStoryClock } from './story-clock';
import { taskbarStoryPosts } from './story-data';
import { TaskbarAppsLayer } from './taskbar-apps-layer';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 실제 창 저장소에 이은 작업 표시줄 앱 버튼을 그린다. 버튼을 누르면 창을 열고, 최소화·복원하고,
// 창이 여럿이면 창 미리보기 목록을 연다. 창 화면은 다른 기능이라 그리지 않는다.
const meta = {
  title: 'Features/Taskbar/TaskbarAppsLayer',
  component: TaskbarAppsLayer,
  parameters: { layout: 'fullscreen' },
  beforeEach: resetStoryStores,
  args: { renderWindow: renderStoryWindow, getWindowTitle: getStoryWindowTitle },
  render: (args) => (
    <StoryStage placement="bottom">
      <TaskbarAppsLayer {...args} />
    </StoryStage>
  ),
} satisfies Meta<typeof TaskbarAppsLayer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 창 미리보기 카드 이름(`Chrome 1` 같은 창 제목). 앱 버튼 이름(`Chrome`)과 가른다 */
const PREVIEW_CARD_NAME = /^Chrome \d+$/;

/**
 * 열린 창의 앱을 차례대로 돌려준다.
 * @returns 앱 목록
 */
function getOpenApps(): (string | undefined)[] {
  const { windows, order } = useWindowStore.getState();
  return order.map((id) => windows[id]?.app);
}

/**
 * 앱 버튼 이름을 차례대로 돌려준다.
 * @param canvasElement 스토리를 그린 요소
 * @returns 버튼 이름
 */
function getButtonNames(canvasElement: HTMLElement): string[] {
  return Array.from(canvasElement.querySelectorAll('[data-taskbar-app]'), (button) =>
    (button.getAttribute('aria-label') ?? '').trim(),
  );
}

/**
 * 열린 창마다 고른 탐색기 탭이 보는 위치.
 * @returns 창마다의 위치(탐색기가 아니면 undefined)
 */
function getExplorerLocations(): (string | null | undefined)[] {
  const { windows, order } = useWindowStore.getState();
  return order.map((id) => {
    const content = windows[id]?.content;
    if (content?.app !== 'file-explorer') {
      return undefined;
    }
    const tab = content.tabs[content.activeTabIndex];
    return tab?.history[tab.historyIndex]?.location;
  });
}

/**
 * 앱 버튼을 우클릭해 메뉴를 연다. 앞에 열었던 메뉴가 닫히길 기다렸다가 연다.
 * @param canvasElement 스토리를 그린 요소
 * @param name 버튼 이름
 */
async function openAppMenu(canvasElement: HTMLElement, name: string): Promise<void> {
  const body = within(canvasElement.ownerDocument.body);
  await waitFor(() => expect(body.queryByRole('menu')).not.toBeInTheDocument());
  await fireEvent.contextMenu(body.getByRole('button', { name }));
  await body.findByRole('menu');
}

/**
 * 열린 메뉴의 항목 이름을 차례대로 돌려준다.
 * @param canvasElement 스토리를 그린 요소
 * @returns 항목 이름
 */
function getMenuItemNames(canvasElement: HTMLElement): (string | null)[] {
  return within(canvasElement.ownerDocument.body)
    .getAllByRole('menuitem')
    .map((item) => item.textContent);
}

/**
 * 메뉴 항목을 누르고 메뉴가 닫히길 기다린다. 닫는 중에 접근성 검사가 돌면 포커스 가드가 걸린다.
 * @param canvasElement 스토리를 그린 요소
 * @param name 항목 이름
 */
async function clickMenuItem(canvasElement: HTMLElement, name: string): Promise<void> {
  const body = within(canvasElement.ownerDocument.body);
  await userEvent.click(body.getByRole('menuitem', { name }));
  await waitFor(() => expect(body.queryByRole('menu')).not.toBeInTheDocument());
}

/** 창이 없다. 버튼을 누르면 창을 연다. 탐색기는 바탕 화면 위치로 연다 */
export const Default: Story = {
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);

    // @codocs [[작업 표시줄:앱 버튼]]
    await step('열린 창이 없을 때 앱 버튼을 누르면 그 앱 창을 연다', async () => {
      await userEvent.click(body.getByRole('button', { name: 'Google Chrome' }));
      await expect(getOpenApps()).toEqual(['chrome']);
    });

    // @codocs [[창 동작:열기 규칙]]
    await step('파일 탐색기 버튼은 탐색기를 바탕 화면 위치로 연다', async () => {
      await userEvent.click(body.getByRole('button', { name: '파일 탐색기' }));
      await expect(getExplorerLocations()).toEqual([undefined, null]);
    });

    // @codocs [[창 동작:열기 규칙]]
    await step('우클릭 메뉴의 새 창도 탐색기를 바탕 화면 위치로 연다', async () => {
      await openAppMenu(canvasElement, '파일 탐색기');
      await clickMenuItem(canvasElement, '파일 탐색기');
      await expect(getExplorerLocations()).toEqual([undefined, null, null]);
    });
  },
};

/** Chrome 창이 둘이다. Chrome 버튼을 누르면 창 미리보기 목록을 연다. 우클릭 메뉴로 창을 열고 닫는다 */
export const WithWindows: Story = {
  beforeEach: () => {
    openStoryWindows(['chrome', 'chrome', 'file-explorer']);
  },
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);

    // @codocs [[작업 표시줄:창 미리보기]]
    await step('창이 여러 개일 때 누르면 쓰는 곳이 넘긴 제목으로 미리보기를 띄운다', async () => {
      const button = body.getByRole('button', { name: 'Google Chrome' });
      await userEvent.click(button);
      await expect(await body.findAllByRole('button', { name: PREVIEW_CARD_NAME })).toHaveLength(2);
      await expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    // @codocs [[작업 표시줄:창 미리보기]]
    await step('카드 폭은 창 비율을 따르고 축소 화면이 카드의 자리를 채운다', async () => {
      // 버튼 역할은 카드 안 누르는 영역이 가지므로 그 부모(카드)를 본다.
      for (const pressArea of body.getAllByRole('button', { name: PREVIEW_CARD_NAME })) {
        const card = pressArea.parentElement as HTMLElement;
        const thumbnail = card.querySelector('[inert]');
        const cardRect = card.getBoundingClientRect();
        const thumbnailRect = thumbnail?.getBoundingClientRect();
        // 카드 안쪽 여백(spacing/sm)을 양쪽에서 뺀 너비를 채운다. 최대 폭(208)보다 좁은 카드는 높이(108)도 채운다.
        await expect(thumbnailRect?.width).toBeCloseTo(cardRect.width - 16, 0);
        await expect(cardRect.width).toBeLessThanOrEqual(208);
        if (cardRect.width < 207.5) {
          await expect(thumbnailRect?.height).toBeCloseTo(108, 0);
        }
      }
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('앱 버튼을 우클릭하면 메뉴를 열고 창 미리보기를 닫는다', async () => {
      await openAppMenu(canvasElement, 'Google Chrome');
      await expect(body.queryByRole('button', { name: PREVIEW_CARD_NAME })).not.toBeInTheDocument();
      await expect(getMenuItemNames(canvasElement).slice(-3)).toEqual([
        'Google Chrome',
        '작업 표시줄에서 제거',
        '모든 창 닫기',
      ]);
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('앱 이름을 고르면 새 창을 연다', async () => {
      await clickMenuItem(canvasElement, 'Google Chrome');
      await expect(getOpenApps()).toEqual(['chrome', 'chrome', 'file-explorer', 'chrome']);
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('모든 창 닫기로 그 앱의 창을 모두 닫는다', async () => {
      await openAppMenu(canvasElement, 'Google Chrome');
      await clickMenuItem(canvasElement, '모든 창 닫기');
      await expect(getOpenApps()).toEqual(['file-explorer']);
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('창이 하나인 앱은 창 닫기로 그 앱의 창을 닫는다', async () => {
      await openAppMenu(canvasElement, '파일 탐색기');
      // 앞의 점프 목록("고정됨")을 빼고 앱 묶음만 본다.
      await expect(getMenuItemNames(canvasElement).slice(-3)).toEqual([
        '파일 탐색기',
        '작업 표시줄에서 제거',
        '창 닫기',
      ]);
      await clickMenuItem(canvasElement, '창 닫기');
      await expect(getOpenApps()).toEqual([]);
    });
  },
};

/**
 * Chrome 창이 하나다. Chrome 버튼 우클릭 메뉴 위에 점프 목록("자주 방문" 최신 글, "작업" 새 창)이 붙는다.
 * 글을 고르면 그 Chrome 창의 새 탭으로 열고, 새 창을 고르면 Chrome 창을 하나 더 연다.
 */
export const ChromeJumpList: Story = {
  beforeEach: async () => {
    hydrateWorkspaceStore(taskbarStoryPosts);
    await waitFor(() => expect(useWorkspaceStore.getState().items['post:p1']).toBeDefined());
    openStoryWindows(['chrome']);
  },
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);
    const latest = getLatestPosts(useWorkspaceStore.getState(), CHROME_LATEST_POST_COUNT);

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('최신 글은 Project 항목을 빼고 Blog 글 6개다', async () => {
      await expect(latest.map((post) => post.slug)).toEqual(['p7', 'p6', 'p5', 'p4', 'p3', 'p2']);
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step(
      '"자주 방문"에 새 탭 페이지와 같은 최신 글을, "작업"에 새 창을 두고 앱 묶음이 뒤따른다',
      async () => {
        await openAppMenu(canvasElement, 'Google Chrome');
        const visited = body.getByRole('group', { name: '자주 방문' });
        await expect(
          within(visited)
            .getAllByRole('menuitem')
            .map((item) => item.textContent),
        ).toEqual(latest.map((post) => post.name));
        const tasks = body.getByRole('group', { name: '작업' });
        await expect(
          within(tasks)
            .getAllByRole('menuitem')
            .map((item) => item.textContent),
        ).toEqual(['새 창']);
        await expect(getMenuItemNames(canvasElement).slice(-3)).toEqual([
          'Google Chrome',
          '작업 표시줄에서 제거',
          '창 닫기',
        ]);
        await expect(body.getAllByRole('separator')).toHaveLength(1);
      },
    );

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('글을 고르면 Chrome 맨 앞 창의 새 탭으로 그 글을 연다', async () => {
      const first = latest[0];
      if (first === undefined) {
        throw new Error('최신 글이 없다');
      }
      await clickMenuItem(canvasElement, first.name);
      const { windows, order } = useWindowStore.getState();
      const content = windows[order[0] ?? '']?.content;
      await expect(order).toHaveLength(1);
      await expect(content?.app === 'chrome' ? content.tabs.length : 0).toBe(2);
      const tab = content?.app === 'chrome' ? content.tabs[content.activeTabIndex] : undefined;
      await expect(tab?.history[tab.historyIndex]).toEqual({
        kind: 'post',
        collection: first.collection,
        slug: first.slug,
      });
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('새 창을 고르면 Chrome 창을 하나 더 연다', async () => {
      await openAppMenu(canvasElement, 'Google Chrome');
      await clickMenuItem(canvasElement, '새 창');
      await expect(getOpenApps()).toEqual(['chrome', 'chrome']);
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('휴지통에 넣은 글은 빠지고 다음 글이 채운다', async () => {
      const first = latest[0];
      if (first === undefined) {
        throw new Error('최신 글이 없다');
      }
      useWorkspaceStore.getState().trashItems([first.id]);
      const next = getLatestPosts(useWorkspaceStore.getState(), CHROME_LATEST_POST_COUNT);
      await openAppMenu(canvasElement, 'Google Chrome');
      const visited = body.getByRole('group', { name: '자주 방문' });
      const names = within(visited)
        .getAllByRole('menuitem')
        .map((item) => item.textContent);
      await expect(names).toEqual(next.map((post) => post.name));
      await expect(names).not.toContain(first.name);
      // 닫는 중에 접근성 검사가 돌면 포커스 가드가 걸리므로 메뉴가 닫히길 기다린다.
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(body.queryByRole('menu')).not.toBeInTheDocument());
    });
  },
};

/**
 * 점프 목록 "고정됨" 항목의 압정 해제 버튼을 찾는다. 버튼은 마우스 전용(`aria-hidden`)이라 역할로 찾지 않고 줄 안에서 이름으로 찾는다.
 * @param item 점프 목록 항목
 * @returns 압정 해제 버튼
 */
function getUnpinButton(item: HTMLElement): HTMLElement {
  const button = item.parentElement?.querySelector<HTMLElement>(
    'button[aria-label="이 목록에서 고정 해제"]',
  );
  if (button === null || button === undefined) {
    throw new Error('압정 해제 버튼이 없다');
  }
  return button;
}

/**
 * 탐색기 점프 목록 "고정됨"의 항목 이름을 차례대로 돌려준다. 묶음이 없으면 빈 목록이다.
 * @param canvasElement 스토리를 그린 요소
 * @returns 항목 이름
 */
function getPinnedNames(canvasElement: HTMLElement): (string | null)[] {
  const group = within(canvasElement.ownerDocument.body).queryByRole('group', { name: '고정됨' });
  return group === null
    ? []
    : within(group)
        .getAllByRole('menuitem')
        .map((item) => item.textContent);
}

/**
 * 열린 메뉴를 모두 돌려준다. 항목 메뉴가 열린 동안 점프 목록은 다른 우클릭 메뉴처럼 막혀(모달) 접근성 트리에서 숨으므로 숨은 메뉴도 센다.
 * @param canvasElement 스토리를 그린 요소
 * @returns 열린 메뉴
 */
function getOpenMenus(canvasElement: HTMLElement): HTMLElement[] {
  return within(canvasElement.ownerDocument.body).queryAllByRole('menu', { hidden: true });
}

/**
 * 점프 목록 위에 항목 메뉴가 열리길 기다려 돌려준다. 점프 목록은 열려 있지만 막혀서 보조 기술에는 항목 메뉴 하나만 보인다.
 * @param canvasElement 스토리를 그린 요소
 * @returns 항목 메뉴
 */
async function waitForItemMenu(canvasElement: HTMLElement): Promise<HTMLElement> {
  const body = within(canvasElement.ownerDocument.body);
  await waitFor(() => expect(getOpenMenus(canvasElement)).toHaveLength(2));
  await waitFor(() => expect(body.getAllByRole('menu')).toHaveLength(1));
  return body.getByRole('menu');
}

/**
 * 탐색기 창이 하나다. 탐색기 버튼 우클릭 메뉴 위에 즐겨찾기와 같은 "고정됨" 점프 목록이 붙는다.
 * 압정 해제 버튼과 항목 메뉴로 목록에서 빼도 점프 목록은 열려 있고, 항목을 고르면 그 폴더를 연 새 탐색기 창을 띄운다.
 */
export const ExplorerJumpList: Story = {
  beforeEach: () => {
    openStoryWindows(['file-explorer']);
  },
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step(
      '"고정됨"에 즐겨찾기 폴더를 고정한 차례로 두고, 구분선 아래 앱 묶음이 뒤따른다',
      async () => {
        await openAppMenu(canvasElement, '파일 탐색기');
        await expect(getPinnedNames(canvasElement)).toEqual(['Project', 'Blog', 'About']);
        await expect(getMenuItemNames(canvasElement).slice(-3)).toEqual([
          '파일 탐색기',
          '작업 표시줄에서 제거',
          '창 닫기',
        ]);
        await expect(body.getAllByRole('separator')).toHaveLength(1);
      },
    );

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step(
      '강조한 항목에만 마우스 전용 압정 해제 버튼이 나오고, 누르면 목록에서 빼고 점프 목록은 열어 둔다',
      async () => {
        const blog = body.getByRole('menuitem', { name: 'Blog' });
        const unpin = getUnpinButton(blog);
        await expect(unpin).not.toBeVisible();
        // 흉내 낸 포인터 이벤트로는 CSS :hover가 걸리지 않아, 같은 버튼을 보이는 강조 상태(포커스)로 확인한다.
        blog.focus();
        await waitFor(() => expect(unpin).toBeVisible());
        await expect(unpin).toHaveAttribute('aria-hidden', 'true');
        await expect(unpin).toHaveAttribute('tabindex', '-1');
        await userEvent.click(unpin);
        await waitFor(() => expect(getPinnedNames(canvasElement)).toEqual(['Project', 'About']));
        await expect(useWorkspaceStore.getState().favoritePins).toEqual(['project', 'about']);
        await expect(body.getByRole('menu')).toBeInTheDocument();
      },
    );

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step(
      '항목을 우클릭하면 항목 메뉴(열기 / 구분선 / 이 목록에서 고정 해제)를 띄우고 점프 목록은 닫지 않는다',
      async () => {
        await fireEvent.contextMenu(body.getByRole('menuitem', { name: 'Project' }));
        const itemMenu = await waitForItemMenu(canvasElement);
        await expect(
          within(itemMenu)
            .getAllByRole('menuitem')
            .map((item) => item.textContent),
        ).toEqual(['열기', '이 목록에서 고정 해제']);
        await expect(within(itemMenu).getAllByRole('separator')).toHaveLength(1);
        await userEvent.click(
          within(itemMenu).getByRole('menuitem', { name: '이 목록에서 고정 해제' }),
        );
        await waitFor(() => expect(getOpenMenus(canvasElement)).toHaveLength(1));
        await expect(getPinnedNames(canvasElement)).toEqual(['About']);
        // 항목이 사라져도 포커스는 점프 목록으로 돌아온다.
        await waitFor(() =>
          expect(body.getByRole('menu').contains(document.activeElement)).toBe(true),
        );
      },
    );

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('항목을 고르면 탐색기 창이 열려 있어도 그 폴더를 연 새 창을 띄운다', async () => {
      await clickMenuItem(canvasElement, 'About');
      await expect(getOpenApps()).toEqual(['file-explorer', 'file-explorer']);
      await expect(getExplorerLocations()).toEqual([null, 'about']);
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('항목 메뉴의 열기도 그 폴더를 연 새 창을 띄우고 메뉴를 모두 닫는다', async () => {
      await openAppMenu(canvasElement, '파일 탐색기');
      await fireEvent.contextMenu(body.getByRole('menuitem', { name: 'About' }));
      await waitForItemMenu(canvasElement);
      await clickMenuItem(canvasElement, '열기');
      await expect(getExplorerLocations()).toEqual([null, 'about', 'about']);
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('목록이 비면 머리글과 구분선을 함께 숨긴다', async () => {
      await openAppMenu(canvasElement, '파일 탐색기');
      await userEvent.click(getUnpinButton(body.getByRole('menuitem', { name: 'About' })));
      await waitFor(() => expect(getPinnedNames(canvasElement)).toEqual([]));
      await expect(body.queryByRole('separator')).not.toBeInTheDocument();
      await expect(getMenuItemNames(canvasElement)).toEqual([
        '파일 탐색기',
        '작업 표시줄에서 제거',
        '모든 창 닫기',
      ]);
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(body.queryByRole('menu')).not.toBeInTheDocument());
    });
  },
};

/** 즐겨찾기 폴더가 휴지통에 있으면 점프 목록에서 숨기고, 복원하면 다시 보인다. 이름을 바꾸면 바뀐 이름으로 보인다 */
export const ExplorerJumpListFolders: Story = {
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    // @codocs [[고정:즐겨찾기 고정]]
    await step('휴지통에 넣은 폴더는 숨기고 복원하면 다시 보인다', async () => {
      useWorkspaceStore.getState().trashItems(['blog']);
      await openAppMenu(canvasElement, '파일 탐색기');
      await expect(getPinnedNames(canvasElement)).toEqual(['Project', 'About']);
      await userEvent.keyboard('{Escape}');
      useWorkspaceStore.getState().restoreItems(['blog']);
      await openAppMenu(canvasElement, '파일 탐색기');
      await expect(getPinnedNames(canvasElement)).toEqual(['Project', 'Blog', 'About']);
      await userEvent.keyboard('{Escape}');
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    // @codocs [[고정:즐겨찾기 고정]]
    await step('이름을 바꾼 폴더는 바뀐 이름으로 보인다', async () => {
      useWorkspaceStore.getState().renameFolder('about', '소개');
      await openAppMenu(canvasElement, '파일 탐색기');
      await expect(getPinnedNames(canvasElement)).toEqual(['Project', 'Blog', '소개']);
      await userEvent.keyboard('{Escape}');
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    // @codocs [[접근성:포커스]]
    await step(
      '키보드로 항목에 간 뒤 contextmenu를 보내면(Shift+F10·메뉴 키) 항목 메뉴가 열리고, Esc는 항목 메뉴만 닫는다',
      async () => {
        await openAppMenu(canvasElement, '파일 탐색기');
        const project = body.getByRole('menuitem', { name: 'Project' });
        project.focus();
        await fireEvent.contextMenu(project);
        // 항목 메뉴로 포커스가 옮겨 간 뒤에 Esc를 누른다. 옮기기 전에 누르면 점프 목록이 키를 받는다.
        const itemMenu = await waitForItemMenu(canvasElement);
        await waitFor(() => expect(itemMenu.contains(document.activeElement)).toBe(true));
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(getOpenMenus(canvasElement)).toHaveLength(1));
        await waitFor(() => expect(document.activeElement).toBe(project));
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(body.queryByRole('menu')).not.toBeInTheDocument());
      },
    );
  },
};

/** 창이 있는 앱 버튼에 마우스를 400ms 올리면 미리보기를 띄운다. 가짜 시계로 지연을 흘린다 */
export const HoverPreview: Story = {
  beforeEach: () => {
    openStoryWindows(['chrome']);
  },
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);
    const button = body.getByRole('button', { name: 'Google Chrome' });
    const clock = installStoryClock([HOVER_PREVIEW_OPEN_DELAY, HOVER_PREVIEW_CLOSE_DELAY]);
    try {
      // @codocs [[작업 표시줄:창 미리보기]]
      await step(
        '창이 있는 앱 버튼에 마우스를 400ms 올리면 창이 하나여도 미리보기를 띄우고 버튼은 Hover 모양이다',
        async () => {
          await expect(button).not.toHaveAttribute('data-preview-open');
          // React의 onPointerEnter는 pointerover로 동작하므로 pointerEnter가 아니라 pointerOver를 보낸다.
          await fireEvent.pointerOver(button, { pointerType: 'mouse' });
          clock.tick(HOVER_PREVIEW_OPEN_DELAY - 1);
          await expect(button).toHaveAttribute('aria-expanded', 'false');
          clock.tick(1);
          await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'true'));
          // Hover 모양은 이 속성의 변형 클래스(data-preview-open:*)가 그린다
          await expect(button).toHaveAttribute('data-preview-open');
        },
      );

      // @codocs [[작업 표시줄:창 미리보기]]
      await step('카드 이름은 창 제목이고 축소 화면은 실제 창 내용을 그린다', async () => {
        const card = await body.findByRole('button', { name: PREVIEW_CARD_NAME });
        const thumbnail = card.querySelector('[aria-hidden="true"] [inert]');
        await expect(thumbnail).toHaveTextContent(PREVIEW_CARD_NAME);
      });

      // @codocs [[작업 표시줄:창 미리보기]]
      await step(
        '버튼과 미리보기 밖으로 나가 300ms가 지나면 닫고, 미리보기로 옮겨 가면 닫지 않는다',
        async () => {
          const card = await body.findByRole('button', { name: PREVIEW_CARD_NAME });
          // 버튼에서 나가 미리보기로 들어간다(둘은 같은 Popover 안이라 밖으로 나간 적이 없다)
          clock.tick(200);
          await fireEvent.pointerOver(card, { pointerType: 'mouse' });
          clock.tick(1000);
          await expect(button).toHaveAttribute('aria-expanded', 'true');
          await fireEvent.pointerOut(card, {
            pointerType: 'mouse',
            relatedTarget: canvasElement.ownerDocument.body,
          });
          clock.tick(HOVER_PREVIEW_CLOSE_DELAY - 1);
          await expect(button).toHaveAttribute('aria-expanded', 'true');
          clock.tick(1);
          await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'false'));
          await waitFor(() =>
            expect(body.queryByRole('button', { name: PREVIEW_CARD_NAME })).not.toBeInTheDocument(),
          );
        },
      );

      // @codocs [[작업 표시줄:창 미리보기]]
      await step('터치는 올리는 동작을 세지 않는다', async () => {
        await fireEvent.pointerOver(button, { pointerType: 'touch' });
        clock.tick(1000);
        await expect(button).toHaveAttribute('aria-expanded', 'false');
      });

      // @codocs [[작업 표시줄:창 미리보기]]
      await step('창이 없는 앱 버튼에는 미리보기를 띄우지 않는다', async () => {
        const explorer = body.getByRole('button', { name: '파일 탐색기' });
        await fireEvent.pointerOver(explorer, { pointerType: 'mouse' });
        clock.tick(1000);
        await expect(explorer).toHaveAttribute('aria-expanded', 'false');
      });
    } finally {
      clock.restore();
    }
  },
};

/** Chrome 창이 둘이다. 마우스를 올려 연 목록을 누르면 닫지 않고, 창이 하나 남은 뒤에는 버튼 동작이 그대로다 */
export const HoverPreviewMultiple: Story = {
  args: { renderWindow: () => null },
  beforeEach: () => {
    openStoryWindows(['chrome', 'chrome']);
  },
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);
    const button = body.getByRole('button', { name: 'Google Chrome' });
    const clock = installStoryClock([HOVER_PREVIEW_OPEN_DELAY, HOVER_PREVIEW_CLOSE_DELAY]);
    try {
      // @codocs [[작업 표시줄:창 미리보기]]
      await step('마우스를 올려 연 목록을 누르면 닫지 않는다', async () => {
        await fireEvent.pointerOver(button, { pointerType: 'mouse' });
        clock.tick(HOVER_PREVIEW_OPEN_DELAY);
        await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'true'));
        await fireEvent.click(button);
        await expect(body.getAllByRole('button', { name: PREVIEW_CARD_NAME })).toHaveLength(2);
      });

      // @codocs [[작업 표시줄:창 미리보기]]
      await step('창이 하나인 앱 버튼의 클릭 동작은 그대로다', async () => {
        useWindowStore.getState().close('window-2');
        await waitFor(() =>
          expect(body.getAllByRole('button', { name: PREVIEW_CARD_NAME })).toHaveLength(1),
        );
        await fireEvent.click(button);
        await waitFor(() =>
          expect(body.queryByRole('button', { name: PREVIEW_CARD_NAME })).not.toBeInTheDocument(),
        );
        await expect(useWindowStore.getState().windows['window-1']?.isMinimized).toBe(true);
      });
    } finally {
      clock.restore();
    }
  },
};

/** 앱 버튼과 미리보기 카드를 키보드로 쓴다 */
export const Keyboard: Story = {
  beforeEach: () => {
    openStoryWindows(['chrome', 'chrome']);
  },
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);
    const chrome = body.getByRole('button', { name: 'Google Chrome' });
    const explorer = body.getByRole('button', { name: '파일 탐색기' });

    // @codocs [[접근성:Tab]]
    await step('앱 버튼은 Tab 한 번에 닿고(맨 앞 창의 앱) 안에서 ←/→로 옮긴다', async () => {
      await expect(chrome).toHaveAttribute('tabindex', '0');
      await expect(explorer).toHaveAttribute('tabindex', '-1');
      chrome.focus();
      await userEvent.keyboard('{ArrowLeft}');
      await expect(explorer).toHaveFocus();
      await userEvent.keyboard('{ArrowRight}');
      await expect(chrome).toHaveFocus();
    });

    // @codocs [[접근성:포커스]]
    await step('키보드로 목록을 열면 첫 카드로 포커스를 옮긴다', async () => {
      await userEvent.keyboard('{Enter}');
      const cards = await body.findAllByRole('button', { name: PREVIEW_CARD_NAME });
      await waitFor(() => expect(cards[0]).toHaveFocus());
    });

    // @codocs [[접근성:Tab]]
    await step('카드는 Tab 한 번에 닿고 안에서 ←/→로 옮긴다', async () => {
      const cards = body.getAllByRole('button', { name: PREVIEW_CARD_NAME });
      await expect(cards.filter((card) => card.tabIndex === 0)).toHaveLength(1);
      await userEvent.keyboard('{ArrowRight}');
      await expect(cards[1]).toHaveFocus();
    });

    // @codocs [[접근성:포커스]]
    await step('Esc로 닫으면 앱 버튼으로 돌아간다', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(chrome).toHaveFocus());
    });

    // @codocs [[접근성:포커스]]
    await step('카드에서 Delete로 창을 닫으면 옆 카드, 마지막이면 앱 버튼으로 옮긴다', async () => {
      await userEvent.keyboard('{Enter}');
      await body.findAllByRole('button', { name: PREVIEW_CARD_NAME });
      await userEvent.keyboard('{Delete}');
      await waitFor(() => expect(useWindowStore.getState().order).toHaveLength(1));
      await waitFor(() =>
        expect(body.getByRole('button', { name: PREVIEW_CARD_NAME })).toHaveFocus(),
      );
      await userEvent.keyboard('{Delete}');
      await waitFor(() => expect(useWindowStore.getState().order).toHaveLength(0));
      await waitFor(() => expect(chrome).toHaveFocus());
    });
  },
};

/** 고정하지 않은 앱의 마지막 창을 미리보기에서 닫는다. 그 앱 창을 다시 열어도 미리보기가 저절로 열리지 않는다 */
export const HoverLastWindowClosed: Story = {
  args: { renderWindow: () => null },
  beforeEach: () => {
    useWorkspaceStore.getState().unpinFromTaskbar('chrome');
    openStoryWindows(['chrome']);
  },
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);
    const clock = installStoryClock([HOVER_PREVIEW_OPEN_DELAY, HOVER_PREVIEW_CLOSE_DELAY]);
    try {
      // @codocs [[작업 표시줄:창 미리보기]]
      await step(
        '마지막 창을 미리보기에서 닫은 뒤 그 앱 창을 다시 열어도 미리보기가 저절로 열리지 않는다',
        async () => {
          const button = body.getByRole('button', { name: 'Google Chrome' });
          await fireEvent.pointerOver(button, { pointerType: 'mouse' });
          clock.tick(HOVER_PREVIEW_OPEN_DELAY);
          await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'true'));
          // 닫기 버튼은 카드에 마우스를 올려야 보이는 CSS hover라, 보이지 않는 채로 이름을 못 찾으므로 카드(누르는 영역의 부모) 안에서 속성으로 찾는다.
          const card = await body.findByRole('button', { name: PREVIEW_CARD_NAME });
          const closeButton =
            card.parentElement?.querySelector('button[aria-label="창 닫기"]') ?? null;
          await expect(closeButton).not.toBeNull();
          await fireEvent.click(closeButton as Element);
          await waitFor(() =>
            expect(body.queryByRole('button', { name: 'Google Chrome' })).not.toBeInTheDocument(),
          );
          const workArea = { width: window.innerWidth, height: window.innerHeight };
          useWindowStore.getState().open('chrome', workArea);
          const reopened = await body.findByRole('button', { name: 'Google Chrome' });
          await expect(reopened).toHaveAttribute('aria-expanded', 'false');
          await expect(
            body.queryByRole('button', { name: PREVIEW_CARD_NAME }),
          ).not.toBeInTheDocument();
        },
      );
    } finally {
      clock.restore();
    }
  },
};

/** Chrome 창이 하나다. 고정을 해제하면 뒤로 가고, 다시 고정하면 고정 목록 맨 뒤에 붙고, 해제한 앱은 창을 모두 닫으면 버튼이 사라진다 */
export const PinAndUnpin: Story = {
  beforeEach: () => {
    openStoryWindows(['chrome']);
  },
  play: async ({ canvasElement, step }) => {
    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('창이 없는 앱의 메뉴에는 창 닫기가 없다', async () => {
      await openAppMenu(canvasElement, '파일 탐색기');
      // 앞의 점프 목록("고정됨")을 빼고 앱 묶음만 본다.
      await expect(getMenuItemNames(canvasElement).slice(-3)).toEqual([
        'About',
        '파일 탐색기',
        '작업 표시줄에서 제거',
      ]);
      await userEvent.keyboard('{Escape}');
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    // @codocs [[작업 표시줄:고정과 순서]]
    await step(
      '고정 해제를 고르면 고정 목록에서 빼고, 고정하지 않은 실행 중인 앱은 뒤에 붙는다',
      async () => {
        await openAppMenu(canvasElement, 'Google Chrome');
        await clickMenuItem(canvasElement, '작업 표시줄에서 제거');
        await expect(useWorkspaceStore.getState().taskbarPins).toEqual(['file-explorer']);
        await expect(getButtonNames(canvasElement)).toEqual(['파일 탐색기', 'Google Chrome']);
      },
    );

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step(
      '고정하지 않은 앱은 작업 표시줄에 고정을 고르면 고정 목록 맨 뒤에 붙인다',
      async () => {
        await openAppMenu(canvasElement, 'Google Chrome');
        await expect(getMenuItemNames(canvasElement).slice(-3)).toEqual([
          'Google Chrome',
          '작업 표시줄에 고정',
          '창 닫기',
        ]);
        await clickMenuItem(canvasElement, '작업 표시줄에 고정');
        await expect(useWorkspaceStore.getState().taskbarPins).toEqual(['file-explorer', 'chrome']);
      },
    );

    // @codocs [[작업 표시줄:고정과 순서]]
    await step('고정을 해제한 앱은 창을 모두 닫으면 버튼이 사라진다', async () => {
      await openAppMenu(canvasElement, 'Google Chrome');
      await clickMenuItem(canvasElement, '작업 표시줄에서 제거');
      await expect(getButtonNames(canvasElement)).toEqual(['파일 탐색기', 'Google Chrome']);
      await openAppMenu(canvasElement, 'Google Chrome');
      await clickMenuItem(canvasElement, '창 닫기');
      await waitFor(() => expect(getButtonNames(canvasElement)).toEqual(['파일 탐색기']));
    });
  },
};

/** 고정한 앱 버튼 둘이다. 버튼을 다른 버튼 자리로 끌어 놓으면 순서가 바뀐다 */
export const DragOrder: Story = {
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);

    /**
     * 요소 가운데 자리를 돌려준다.
     * @param element 요소
     * @returns 가운데 자리
     */
    function getCenter(element: HTMLElement): { x: number; y: number } {
      const box = element.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    }

    // @codocs [[작업 표시줄:고정과 순서]]
    await step('고정한 앱을 고정 순서대로 그린다', async () => {
      await expect(getButtonNames(canvasElement)).toEqual(['파일 탐색기', 'Google Chrome']);
      useWorkspaceStore.getState().moveTaskbarPin('chrome', 0);
      await waitFor(() =>
        expect(getButtonNames(canvasElement)).toEqual(['Google Chrome', '파일 탐색기']),
      );
      useWorkspaceStore.getState().moveTaskbarPin('chrome', 1);
      await waitFor(() =>
        expect(getButtonNames(canvasElement)).toEqual(['파일 탐색기', 'Google Chrome']),
      );
    });

    // @codocs [[작업 표시줄:고정과 순서]]
    await step(
      '고정한 버튼을 다른 고정 버튼 자리로 끌어 놓으면 순서가 바뀌고, 끌기 뒤에 따라오는 클릭은 버튼 동작을 하지 않는다',
      async () => {
        const chrome = body.getByRole('button', { name: 'Google Chrome' });
        const explorer = body.getByRole('button', { name: '파일 탐색기' });
        await dragStoryPointer(chrome, [getCenter(chrome), getCenter(explorer)]);
        await fireEvent.click(chrome);
        await expect(useWorkspaceStore.getState().taskbarPins).toEqual(['chrome', 'file-explorer']);
        await expect(useWindowStore.getState().order).toEqual([]);
      },
    );

    // @codocs [[항목 조작:순서 바꾸기 끌기]]
    await step(
      '끄는 버튼은 커지고, 밀려나는 버튼은 미끄러지고, 놓으면 끌던 버튼이 새 자리로 들어간다',
      async () => {
        const chrome = body.getByRole('button', { name: 'Google Chrome' });
        const explorer = body.getByRole('button', { name: '파일 탐색기' });
        // 앞 단계의 놓기·미끄러짐이 끝나 버튼이 제자리에 선 뒤에 잰다.
        await waitFor(() => expect(chrome).not.toHaveAttribute('data-reorder-motion'));
        await waitFor(() => expect(explorer).not.toHaveAttribute('data-reorder-motion'));
        const end = getCenter(explorer);
        await pressStoryPointer(chrome, [getCenter(chrome), end]);
        await expect(chrome).toHaveAttribute('data-reorder-motion', 'lift');
        await expect(explorer).toHaveAttribute('data-reorder-motion', 'slide');
        await expect(useWorkspaceStore.getState().taskbarPins).toEqual(['file-explorer', 'chrome']);
        await fireEvent.pointerUp(chrome, storyPointerInit(end));
        await expect(chrome).toHaveAttribute('data-reorder-motion', 'drop');
        await waitFor(() => expect(chrome).not.toHaveAttribute('data-reorder-motion'));
        await waitFor(() => expect(explorer).not.toHaveAttribute('data-reorder-motion'));
        await fireEvent.click(chrome);
      },
    );

    // @codocs [[작업 표시줄:고정과 순서]]
    await step('끌지 않고 누르면 버튼 동작을 한다', async () => {
      const chrome = body.getByRole('button', { name: 'Google Chrome' });
      await dragStoryPointer(chrome, [getCenter(chrome)]);
      await fireEvent.click(chrome);
      await expect(useWindowStore.getState().order).toHaveLength(1);
    });
  },
};

/** 창이 열린 고정 앱 버튼을 끄는 동안 그 앱의 실행 표시가 사라지고, 놓으면 돌아온다 */
export const DragHidesIndicator: Story = {
  beforeEach: () => {
    openStoryWindows(['chrome']);
  },
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);

    // @codocs [[작업 표시줄:고정과 순서]]
    // @codocs [[항목 조작:순서 바꾸기 끌기]]
    await step('끄는 동안 그 앱의 실행 표시가 사라지고 놓으면 돌아온다', async () => {
      const chrome = body.getByRole('button', { name: 'Google Chrome' });
      const explorer = body.getByRole('button', { name: '파일 탐색기' });
      const start = chrome.getBoundingClientRect();
      const end = explorer.getBoundingClientRect();
      const from = { x: start.x + start.width / 2, y: start.y + start.height / 2 };
      const to = { x: end.x + end.width / 2, y: end.y + end.height / 2 };
      await expect(chrome).toHaveAttribute('data-indicator', 'active');
      await pressStoryPointer(chrome, [from, to]);
      await expect(chrome).toHaveAttribute('data-indicator', 'none');
      await fireEvent.pointerUp(chrome, storyPointerInit(to));
      await waitFor(() => expect(chrome).toHaveAttribute('data-indicator', 'active'));
    });
  },
};

/** 모바일 폭이다. 창 미리보기 목록을 화면 폭에서 좌우 12px 여백을 뺀 폭에 맞추고 카드를 같은 너비로 줄인다 */
export const Mobile: Story = {
  args: { renderWindow: () => null },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  beforeEach: () => {
    openStoryWindows(['chrome', 'chrome', 'chrome', 'chrome']);
  },
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);

    // @codocs [[작업 표시줄:모바일]]
    await step(
      '카드를 창 비율 폭으로 놓아 넘치면 목록을 화면 폭에서 좌우 12px 여백을 뺀 폭에 맞추고 카드를 같은 너비로 줄인다',
      async () => {
        await userEvent.click(body.getByRole('button', { name: 'Google Chrome' }));
        // 버튼 역할은 카드 안 누르는 영역이 가지므로 그 부모(카드)의 크기를 본다.
        const cards = (await body.findAllByRole('button', { name: PREVIEW_CARD_NAME })).map(
          (pressArea) => pressArea.parentElement as HTMLElement,
        );
        await expect(cards).toHaveLength(4);
        // 실제 브라우저라 여는 애니메이션의 scale이 getBoundingClientRect에 들어가므로 배치 크기를 본다.
        const listWidth = window.innerWidth - 12 * 2;
        // 카드는 틈 없이 붙고 목록 판은 테두리 합 2px만 갖는다 (예: 320폭이면 (296 - 2) / 4 = 73)
        const cardWidth = Math.floor((listWidth - 2) / 4);
        await expect(cards[0]?.parentElement?.offsetWidth).toBe(listWidth);
        await expect(cards.map((card) => card.offsetWidth)).toEqual(Array(4).fill(cardWidth));
      },
    );

    // @codocs [[작업 표시줄:모바일]]
    // @codocs [[작업 표시줄:창 미리보기]]
    await step('화면 폭 안에 들어가면 카드마다 창(작업 영역) 비율 폭이다', async () => {
      const { order } = useWindowStore.getState();
      useWindowStore.getState().close(order[0] ?? '');
      await waitFor(async () =>
        expect(await body.findAllByRole('button', { name: PREVIEW_CARD_NAME })).toHaveLength(3),
      );
      // 버튼 역할은 카드 안 누르는 영역이 가지므로 그 부모(카드)를 본다.
      const cards = body
        .getAllByRole('button', { name: PREVIEW_CARD_NAME })
        .map((pressArea) => pressArea.parentElement as HTMLElement);
      const workArea = getWorkArea(window.innerWidth, window.innerHeight);
      // 축소 화면 높이 108 × 작업 영역 비율 + 좌우 여백 16 (예: 320×520이면 82.5)
      const cardWidth = 108 * (workArea.width / workArea.height) + 16;
      for (const card of cards) {
        // 배치 크기(offsetWidth)는 정수로 반올림되므로 1px 안에서 본다.
        await expect(Math.abs(card.offsetWidth - cardWidth)).toBeLessThanOrEqual(1);
      }
    });
  },
};
