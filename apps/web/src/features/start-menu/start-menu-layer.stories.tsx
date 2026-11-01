import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, screen, spyOn, userEvent, waitFor, within } from 'storybook/test';

import { dragStoryPointer } from '@/features/window/story-pointer';
import { usePanelStore } from '@/shared/stores/panel-store/panel-store';
import { useRestartStore } from '@/shared/stores/restart-store/restart-store';
import { useSearchStore } from '@/shared/stores/search-store/search-store';
import { resetStoryStores } from '@/shared/stores/store-reset/story-stores';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';

import { StartMenuLayer } from './start-menu-layer';
import { hydrateStartStoryPosts } from './story-posts';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 실제 패널 저장소에 이은 Start·검색 패널 층을 그린다. 패널을 연 채로 시작하고,
// 항목을 누르면 창 저장소에 창을 열고 패널을 닫는다. Esc·바깥 누르기로도 닫힌다. 다시 열려면 스토리를 다시 그린다.
// 작업 표시줄과 창은 다른 기능이라 그리지 않는다. 함께 보려면 `Features/Shell/Shell`을 본다.
const meta = {
  title: 'Features/StartMenu/StartMenuLayer',
  component: StartMenuLayer,
  parameters: { layout: 'fullscreen' },
  beforeEach: resetStoryStores,
  render: () => (
    <div className="fixed inset-0">
      <StartMenuLayer />
    </div>
  ),
} satisfies Meta<typeof StartMenuLayer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Start 메뉴를 연 채로 시작한다 */
export const StartOpen: Story = {
  beforeEach: () => {
    usePanelStore.getState().toggleStart();
  },
};

/** 검색 패널을 연 채로 시작한다 */
export const SearchOpen: Story = {
  beforeEach: () => {
    usePanelStore.getState().openSearch();
  },
};

/**
 * 패널이 모두 닫힐 때까지 기다린다(닫는 움직임이 끝나야 패널이 사라진다).
 * @param root 스토리 캔버스 요소
 */
async function waitForPanelClosed(root: HTMLElement): Promise<void> {
  await waitFor(() => expect(within(root).queryByRole('dialog')).not.toBeInTheDocument());
}

/**
 * 닫힌 Start 메뉴를 다시 열고 패널을 돌려준다.
 * @param root 스토리 캔버스 요소
 * @returns Start 패널
 */
async function reopenStart(root: HTMLElement): Promise<HTMLElement> {
  await waitForPanelClosed(root);
  usePanelStore.getState().toggleStart();
  return within(root).findByRole('dialog', { name: '시작' });
}

/**
 * 닫힌 검색 패널을 다시 열어 검색어를 넣고 패널을 돌려준다.
 * 데스크톱의 검색 패널 검색어는 작업 표시줄 검색칸이 쓰므로 저장소에 직접 넣는다.
 * @param root 스토리 캔버스 요소
 * @param query 검색어
 * @returns 검색 패널
 */
async function reopenSearch(root: HTMLElement, query: string): Promise<HTMLElement> {
  await waitForPanelClosed(root);
  usePanelStore.getState().openSearch();
  const panel = await within(root).findByRole('dialog', { name: '검색' });
  useSearchStore.getState().setQuery('search', query);
  return panel;
}

/**
 * 고정됨 칸을 이름으로 찾는다. 모두 목록에 같은 이름의 줄이 있어, DOM 순서가 앞인 고정됨 칸을 돌려준다.
 * @param panel Start 패널
 * @param name 칸 이름
 * @returns 칸 요소
 */
function pinnedTile(panel: HTMLElement, name: string): HTMLElement {
  const [tile] = within(panel).getAllByRole('button', { name });
  if (tile === undefined) {
    throw new Error(`고정됨 칸이 없다: ${name}`);
  }
  return tile;
}

/**
 * 칸이나 줄을 우클릭해 메뉴를 열고 메뉴 항목 이름을 돌려준다.
 * @param target 칸이나 줄
 * @returns 메뉴 항목 이름
 */
async function openContextMenu(target: HTMLElement): Promise<string[]> {
  await fireEvent.contextMenu(target);
  const items = await screen.findAllByRole('menuitem');
  return items.map((item) => item.textContent);
}

/** 열려 있는 우클릭 메뉴를 Esc로 닫는다. */
async function closeContextMenu(): Promise<void> {
  await fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
}

/**
 * 열린 창들의 앱 이름.
 * @returns 열린 차례대로의 앱
 */
function openedApps(): (string | undefined)[] {
  const { windows, order } = useWindowStore.getState();
  return order.map((id) => windows[id]?.app);
}

/**
 * 요소의 가운데 자리.
 * @param element 요소
 * @returns 화면 위 자리
 */
function centerOf(element: Element): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** 고정됨 칸 순서, 우클릭 메뉴, 끌어 옮기기를 보는 Start 메뉴 */
export const PinnedTiles: Story = {
  beforeEach: async () => {
    const restoreCatalog = await hydrateStartStoryPosts();
    usePanelStore.getState().toggleStart();
    return restoreCatalog;
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const panel = await canvas.findByRole('dialog', { name: '시작' });

    // @codocs [[Start 메뉴:고정됨]]
    await step('저장소의 고정 목록과 순서로 그린다', async () => {
      const tiles = within(panel).getAllByRole('button', {
        name: /^(File Explorer|Chrome|Blog|GitHub)$/,
      });
      await expect(tiles.slice(0, 4).map((tile) => tile.textContent)).toEqual([
        'File Explorer',
        'Chrome',
        'Blog',
        'GitHub',
      ]);
    });

    // @codocs [[Start 메뉴:고정됨]]
    await step('새로 고정한 항목은 맨 뒤에 보인다', async () => {
      useWorkspaceStore.getState().pinToStart('post:nextjs-cache');
      await waitFor(() => {
        const tiles = panel.querySelectorAll('[data-start-tile-id]');
        return expect(tiles[tiles.length - 1]?.textContent).toBe('Next.js 캐시');
      });
      useWorkspaceStore.getState().unpinFromStart('post:nextjs-cache');
    });

    // @codocs [[Start 메뉴:고정됨]]
    await step('휴지통에 들어간 항목은 고정됨에서 보이지 않고 복원하면 다시 보인다', async () => {
      useWorkspaceStore.getState().trashItems(['link:github']);
      await waitFor(() =>
        expect(panel.querySelector('[data-start-tile-id="link:github"]')).toBeNull(),
      );
      useWorkspaceStore.getState().restoreItems(['link:github']);
      await waitFor(() =>
        expect(panel.querySelector('[data-start-tile-id="link:github"]')).not.toBeNull(),
      );
    });

    // @codocs [[Start 메뉴:고정됨]]
    await step(
      '우클릭 메뉴는 열기, 맨 앞으로 이동, 고정 해제이고 글과 외부 링크는 링크 복사도 있다',
      async () => {
        await expect(await openContextMenu(pinnedTile(panel, 'Blog'))).toEqual([
          '열기',
          '맨 앞으로 이동',
          '시작 화면에서 고정 해제',
        ]);
        await closeContextMenu();
        await expect(await openContextMenu(pinnedTile(panel, 'GitHub'))).toEqual([
          '열기',
          '맨 앞으로 이동',
          '링크 복사',
          '시작 화면에서 고정 해제',
        ]);
        await closeContextMenu();
      },
    );

    // @codocs [[Start 메뉴:고정됨]]
    await step('맨 앞 항목은 맨 앞으로 이동을 고를 수 없다', async () => {
      await openContextMenu(pinnedTile(panel, 'File Explorer'));
      await expect(screen.getByRole('menuitem', { name: '맨 앞으로 이동' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await closeContextMenu();
    });

    // @codocs [[Start 메뉴:고정됨]]
    await step(
      '고정 칸을 다른 칸 자리로 끌면 순서가 바뀌고, 따라오는 클릭은 항목을 열지 않는다',
      async () => {
        const github = pinnedTile(panel, 'GitHub');
        const front = pinnedTile(panel, 'File Explorer');
        await dragStoryPointer(github, [centerOf(github), centerOf(front)]);
        await fireEvent.click(github);
        await expect(useWorkspaceStore.getState().startPins.slice(0, 4)).toEqual([
          'link:github',
          'app:file-explorer',
          'app:chrome',
          'blog',
        ]);
        await expect(useWindowStore.getState().order).toEqual([]);
      },
    );

    // @codocs [[Start 메뉴:고정됨]]
    await step('우클릭 메뉴의 맨 앞으로 이동은 그 항목을 고정됨 맨 앞으로 옮긴다', async () => {
      await openContextMenu(pinnedTile(panel, 'Blog'));
      await userEvent.click(screen.getByRole('menuitem', { name: '맨 앞으로 이동' }));
      await expect(useWorkspaceStore.getState().startPins[0]).toBe('blog');
    });

    // @codocs [[Start 메뉴:고정됨]]
    await step('우클릭 메뉴의 고정 해제는 그 항목을 고정됨에서 뺀다', async () => {
      await openContextMenu(pinnedTile(panel, 'GitHub'));
      await userEvent.click(screen.getByRole('menuitem', { name: '시작 화면에서 고정 해제' }));
      await expect(useWorkspaceStore.getState().startPins).not.toContain('link:github');
      await waitFor(() =>
        expect(panel.querySelector('[data-start-tile-id="link:github"]')).toBeNull(),
      );
    });

    // @codocs [[Start 메뉴:고정됨]]
    await step('우클릭 메뉴의 열기는 항목을 열고 Start 메뉴를 닫는다', async () => {
      await openContextMenu(pinnedTile(panel, 'Blog'));
      await userEvent.click(screen.getByRole('menuitem', { name: '열기' }));
      await expect(useWindowStore.getState().order).toHaveLength(1);
      await expect(usePanelStore.getState().openPanel).toBeNull();
    });
  },
};

/** 모두 목록의 묶음, 보기 바꾸기, 줄 우클릭 메뉴를 보는 Start 메뉴 */
export const AllList: Story = {
  beforeEach: async () => {
    const restoreCatalog = await hydrateStartStoryPosts();
    usePanelStore.getState().toggleStart();
    return restoreCatalog;
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const panel = await canvas.findByRole('dialog', { name: '시작' });
    /**
     * 모두 영역.
     * @returns 모두 영역
     */
    function all(): HTMLElement {
      return within(panel).getByRole('region', { name: '모두' });
    }

    // @codocs [[Start 메뉴:모두]]
    await step(
      '모두 목록은 저장소의 앱, 폴더, 글, 외부 링크를 묶어 보이고 휴지통은 뺀다',
      async () => {
        await expect(
          within(panel).getByRole('button', { name: 'Next.js 캐시' }),
        ).toBeInTheDocument();
        await expect(within(panel).getByRole('button', { name: '글 하나' })).toBeInTheDocument();
        await expect(
          within(panel).queryByText('휴지통', { selector: 'p' }),
        ).not.toBeInTheDocument();
      },
    );

    // @codocs [[Start 메뉴:모두]]
    await step(
      '고정됨과 모두 영역은 화면 읽기 프로그램이 구분하도록 각각 이름을 가진다',
      async () => {
        const pinned = within(panel).getByRole('region', { name: '고정됨' });
        await expect(within(pinned).getByRole('button', { name: 'GitHub' })).toBeInTheDocument();
        await expect(within(all()).getByRole('button', { name: '글 하나' })).toBeInTheDocument();
      },
    );

    // @codocs [[Start 메뉴:모두]]
    await step('휴지통에 들어간 항목은 모두 목록에서 뺀다', async () => {
      useWorkspaceStore.getState().trashItems(['post:p1']);
      await waitFor(() =>
        expect(within(panel).queryByRole('button', { name: '글 하나' })).not.toBeInTheDocument(),
      );
      useWorkspaceStore.getState().restoreItems(['post:p1']);
    });

    // @codocs [[Start 메뉴:모두]]
    await step('처음 보기는 범주라 항목 종류로 묶어 보인다', async () => {
      await expect(within(panel).getByRole('button', { name: '보기: 범주' })).toBeInTheDocument();
      await expect(within(panel).getByText('외부 링크')).toBeInTheDocument();
    });

    // @codocs [[Start 메뉴:모두]]
    await step(
      '줄 우클릭 메뉴는 열기와 시작 화면 고정이고, 글·외부 링크는 링크 복사, 앱은 작업 표시줄 고정도 있다',
      async () => {
        await expect(
          await openContextMenu(within(all()).getByRole('button', { name: 'Next.js 캐시' })),
        ).toEqual(['열기', '시작 화면에 고정', '링크 복사']);
        await closeContextMenu();
        await expect(
          await openContextMenu(within(all()).getByRole('button', { name: 'React' })),
        ).toEqual(['열기', '시작 화면에 고정']);
        await closeContextMenu();
        await expect(
          await openContextMenu(within(all()).getByRole('button', { name: 'Chrome' })),
        ).toEqual(['열기', '시작 화면에서 고정 해제', '작업 표시줄에서 고정 해제']);
        await closeContextMenu();
      },
    );

    // @codocs [[Start 메뉴:모두]]
    await step('줄 우클릭 메뉴의 시작 화면에 고정은 그 항목을 고정됨 맨 뒤에 더한다', async () => {
      await openContextMenu(within(all()).getByRole('button', { name: 'Next.js 캐시' }));
      await userEvent.click(screen.getByRole('menuitem', { name: '시작 화면에 고정' }));
      await expect(useWorkspaceStore.getState().startPins.at(-1)).toBe('post:nextjs-cache');
    });

    // @codocs [[Start 메뉴:모두]]
    await step('이미 고정된 항목은 줄 우클릭 메뉴에서 시작 화면 고정을 해제한다', async () => {
      await openContextMenu(within(all()).getByRole('button', { name: 'Blog' }));
      await userEvent.click(screen.getByRole('menuitem', { name: '시작 화면에서 고정 해제' }));
      await expect(useWorkspaceStore.getState().startPins).not.toContain('blog');
    });

    // @codocs [[Start 메뉴:모두]]
    await step('앱 줄 우클릭 메뉴로 작업 표시줄 고정을 해제하고 다시 고정한다', async () => {
      await openContextMenu(within(all()).getByRole('button', { name: 'Chrome' }));
      await userEvent.click(screen.getByRole('menuitem', { name: '작업 표시줄에서 고정 해제' }));
      await expect(useWorkspaceStore.getState().taskbarPins).toEqual(['file-explorer']);
      await openContextMenu(within(all()).getByRole('button', { name: 'Chrome' }));
      await userEvent.click(screen.getByRole('menuitem', { name: '작업 표시줄에 고정' }));
      await expect(useWorkspaceStore.getState().taskbarPins).toEqual(['file-explorer', 'chrome']);
    });

    // @codocs [[Start 메뉴:모두]]
    await step('보기 메뉴에서 보기를 고르면 그 보기로 바뀌고 저장소에 저장한다', async () => {
      await userEvent.click(within(panel).getByRole('button', { name: '보기: 범주' }));
      await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: '간단히' }));
      await expect(useWorkspaceStore.getState().startAllView).toBe('list');
      await expect(within(panel).getByRole('button', { name: '보기: 간단히' })).toBeInTheDocument();
      await expect(within(panel).queryByText('외부 링크')).not.toBeInTheDocument();
    });

    // @codocs [[Start 메뉴:모두]]
    await step('그리드 보기의 항목 칸도 같은 우클릭 메뉴를 띄운다', async () => {
      useWorkspaceStore.getState().setStartAllView('grid');
      await waitFor(() =>
        expect(within(panel).getByRole('button', { name: '보기: 그리드' })).toBeInTheDocument(),
      );
      await expect(
        await openContextMenu(within(all()).getByRole('button', { name: 'Next.js 캐시' })),
      ).toEqual(['열기', '시작 화면에서 고정 해제', '링크 복사']);
      await closeContextMenu();
    });

    // @codocs [[Start 메뉴:모두]]
    await step('다시 시작하면 보기가 처음 상태(범주)로 돌아간다', async () => {
      useWorkspaceStore.getState().reset();
      await expect(useWorkspaceStore.getState().startAllView).toBe('category');
    });

    // @codocs [[Start 메뉴:모두]]
    await step('줄 우클릭 메뉴의 열기는 항목을 열고 Start 메뉴를 닫는다', async () => {
      await waitFor(() =>
        expect(within(all()).getByRole('button', { name: 'Next.js 캐시' })).toBeInTheDocument(),
      );
      await openContextMenu(within(all()).getByRole('button', { name: 'Next.js 캐시' }));
      await userEvent.click(screen.getByRole('menuitem', { name: '열기' }));
      await expect(openedApps()).toEqual(['chrome']);
      await expect(usePanelStore.getState().openPanel).toBeNull();
    });
  },
};

/** 항목을 열면 창이 열리고 Start 메뉴가 닫히는 흐름과 전원 메뉴의 다시 시작 */
export const OpenItems: Story = {
  beforeEach: async () => {
    const restoreCatalog = await hydrateStartStoryPosts();
    usePanelStore.getState().toggleStart();
    return restoreCatalog;
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    let panel = await canvas.findByRole('dialog', { name: '시작' });

    // @codocs [[Start 메뉴:열기와 닫기]]
    await step('앱 항목을 열면 그 앱 창을 열고 Start 메뉴를 닫는다', async () => {
      await userEvent.click(pinnedTile(panel, 'File Explorer'));
      await expect(openedApps()).toEqual(['file-explorer']);
      await waitForPanelClosed(canvasElement);
    });

    // @codocs [[Start 메뉴:열기와 닫기]]
    await step('글 항목을 열면 Chrome에서 열고 Start 메뉴를 닫는다', async () => {
      panel = await reopenStart(canvasElement);
      await userEvent.click(within(panel).getByRole('button', { name: 'Next.js 캐시' }));
      await expect(openedApps()).toEqual(['file-explorer', 'chrome']);
      await expect(usePanelStore.getState().openPanel).toBeNull();
    });

    // @codocs [[Start 메뉴:열기와 닫기]]
    await step('폴더 항목을 열면 새 탐색기 창을 열고 Start 메뉴를 닫는다', async () => {
      panel = await reopenStart(canvasElement);
      await userEvent.click(pinnedTile(panel, 'Blog'));
      await expect(openedApps()).toEqual(['file-explorer', 'chrome', 'file-explorer']);
      await expect(usePanelStore.getState().openPanel).toBeNull();
    });

    // @codocs [[Start 메뉴:열기와 닫기]]
    await step('외부 링크를 열면 실제 브라우저의 새 탭으로 열고 창을 만들지 않는다', async () => {
      const open = spyOn(window, 'open').mockReturnValue(null);
      panel = await reopenStart(canvasElement);
      await userEvent.click(pinnedTile(panel, 'GitHub'));
      await expect(open).toHaveBeenCalledWith('https://github.com/SeoJaeWan', '_blank', 'noopener');
      await expect(openedApps()).toHaveLength(3);
    });

    // @codocs [[다시 시작:순서]]
    await step('전원 메뉴의 다시 시작을 고르면 Start 메뉴를 닫고 다시 시작한다', async () => {
      panel = await reopenStart(canvasElement);
      await userEvent.click(within(panel).getByRole('button', { name: '전원' }));
      await userEvent.click(await screen.findByRole('menuitem', { name: '다시 시작' }));
      await expect(useRestartStore.getState().phase).toBe('covering');
      await expect(usePanelStore.getState().openPanel).toBeNull();
    });
  },
};

/** Start 위쪽 검색칸에 입력해 결과를 고르고 여는 Start 메뉴 */
export const StartSearch: Story = {
  beforeEach: async () => {
    const restoreCatalog = await hydrateStartStoryPosts();
    usePanelStore.getState().toggleStart();
    return restoreCatalog;
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    let panel = await canvas.findByRole('dialog', { name: '시작' });
    /**
     * Start 검색칸.
     * @returns 검색칸
     */
    function searchBox(): HTMLElement {
      return within(panel).getByRole('searchbox', { name: '시작 메뉴 검색' });
    }

    // @codocs [[Start 메뉴:검색]]
    // @codocs [[검색:입력칸]]
    await step(
      '위쪽 검색칸에 입력하면 Start 안이 검색 결과 화면으로 바뀌고 검색어는 Start 안에서만 쓴다',
      async () => {
        await userEvent.type(searchBox(), 'react');
        await expect(within(panel).getByText('최고 일치')).toBeInTheDocument();
        await expect(within(panel).queryByText('고정됨')).not.toBeInTheDocument();
        await expect(useSearchStore.getState().panels).toMatchObject({
          start: { query: 'react' },
          search: { query: '' },
        });
      },
    );

    // @codocs [[검색:결과 화면]]
    await step('아래 방향키로 고른 줄이 보이는 영역 밖이면 스크롤해 보이게 한다', async () => {
      const scrollIntoView = spyOn(Element.prototype, 'scrollIntoView');
      scrollIntoView.mockClear();
      await userEvent.keyboard('{ArrowDown}');
      await expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
      await expect(panel.querySelector('[aria-current="true"]')).toHaveTextContent(
        'React 19 훅 정리',
      );
    });

    // @codocs [[검색:결과 화면]]
    await step('위 방향키로 고른 항목을 거꾸로 옮긴다', async () => {
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');
      await expect(panel.querySelector('[aria-current="true"]')).toHaveTextContent(
        'React 19 훅 정리',
      );
    });

    // @codocs [[Start 메뉴:검색]]
    await step('입력을 모두 지우면 원래 화면(고정됨, 모두)으로 돌아간다', async () => {
      await userEvent.clear(searchBox());
      await expect(within(panel).getByText('고정됨')).toBeInTheDocument();
      await expect(within(panel).queryByText('최고 일치')).not.toBeInTheDocument();
    });

    // @codocs [[Start 메뉴:검색]]
    await step('결과가 없으면 검색 결과 없음을 안내한다', async () => {
      await userEvent.type(searchBox(), '없는이름');
      await expect(within(panel).getByText('검색 결과 없음')).toBeInTheDocument();
      await userEvent.clear(searchBox());
    });

    // @codocs [[Start 메뉴:검색]]
    await step('패널을 닫으면 검색어를 지운다', async () => {
      await userEvent.type(searchBox(), 'react');
      usePanelStore.getState().close();
      await expect(useSearchStore.getState().panels.start.query).toBe('');
    });

    // @codocs [[검색:결과 화면]]
    await step('Enter를 누르면 고른 항목을 열고 패널을 닫고 검색어를 지운다', async () => {
      panel = await reopenStart(canvasElement);
      await userEvent.type(searchBox(), 'react');
      await userEvent.keyboard('{ArrowDown}{Enter}');
      await expect(openedApps()).toEqual(['chrome']);
      await expect(usePanelStore.getState().openPanel).toBeNull();
      await expect(useSearchStore.getState().panels.start.query).toBe('');
    });
  },
};

/** 검색 패널의 입력 전 화면(최근과 추천) */
export const SearchBeforeTyping: Story = {
  beforeEach: async () => {
    const restoreCatalog = await hydrateStartStoryPosts();
    usePanelStore.getState().openSearch();
    return restoreCatalog;
  },
  play: async ({ canvasElement, step }) => {
    const panel = await within(canvasElement).findByRole('dialog', { name: '검색' });

    // @codocs [[검색:입력 전 화면]]
    await step('추천에 최신 글 6개와 날짜를 보이고, 처음 방문하면 최근 항목이 없다', async () => {
      const recommended = within(panel).getAllByRole('button');
      await expect(recommended).toHaveLength(6);
      await expect(recommended[0]).toHaveTextContent('React 19 훅 정리2026-10-20');
      await expect(within(panel).queryByText('최근')).not.toBeInTheDocument();
      await expect(within(panel).getByText('추천')).toBeInTheDocument();
    });

    // @codocs [[검색:입력 전 화면]]
    await step('최근에 연 항목을 최대 5개 보인다', async () => {
      for (const id of ['blog', 'link:github', 'post:p1', 'post:p2', 'post:p3', 'post:p4']) {
        useWorkspaceStore.getState().recordRecentItem(id);
      }
      // 최근 5개와 추천 6개. 가장 오래된 Blog는 밀려난다.
      await waitFor(() => expect(within(panel).getAllByRole('button')).toHaveLength(11));
      await expect(within(panel).getByText('GitHub')).toBeInTheDocument();
      await expect(within(panel).queryByText('Blog')).not.toBeInTheDocument();
    });

    // @codocs [[검색:입력 전 화면]]
    await step('휴지통에 들어간 글은 최근과 추천에서 뺀다', async () => {
      await expect(within(panel).getAllByText('글 넷').length).toBeGreaterThan(0);
      useWorkspaceStore.getState().trashItems(['post:p4']);
      await waitFor(() => expect(within(panel).queryByText('글 넷')).not.toBeInTheDocument());
    });
  },
};

/** 검색 패널의 검색 결과 화면. 검색어는 작업 표시줄 검색칸이 쓰므로 저장소에 넣는다 */
export const SearchResults: Story = {
  beforeEach: async () => {
    const restoreCatalog = await hydrateStartStoryPosts();
    usePanelStore.getState().openSearch();
    return restoreCatalog;
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    let panel = await canvas.findByRole('dialog', { name: '검색' });
    useSearchStore.getState().setQuery('search', 'react');

    // @codocs [[검색:결과 화면]]
    await step(
      '검색어로 찾은 결과를 최고 일치와 종류별 묶음으로 보이고 최고 일치가 선택돼 있다',
      async () => {
        await expect(await within(panel).findByText('최고 일치')).toBeInTheDocument();
        await expect(within(panel).getByText('글', { selector: 'p' })).toBeInTheDocument();
        await expect(
          within(panel).getByRole('button', { name: /^React 19 훅 정리/ }),
        ).toBeInTheDocument();
        const selected = panel.querySelectorAll('[aria-current="true"]');
        await expect(selected).toHaveLength(1);
        await expect(selected[0]).toHaveTextContent('React폴더');
      },
    );

    // @codocs [[검색:결과 화면]]
    await step('오른쪽 카드는 목록에서 고른 항목을 따라간다', async () => {
      // 최고 일치(React 폴더)는 링크 복사가 없다
      await expect(
        within(panel).queryByRole('button', { name: '링크 복사' }),
      ).not.toBeInTheDocument();
      useSearchStore.getState().moveSelection('search', 1, 4);
      await expect(
        await within(panel).findByRole('button', { name: '링크 복사' }),
      ).toBeInTheDocument();
      await expect(within(panel).getAllByText('React 19 훅 정리')).toHaveLength(2);
    });

    // @codocs [[검색:결과 화면]]
    await step('카드의 열기는 고른 항목을 연다', async () => {
      await userEvent.click(within(panel).getByRole('button', { name: '열기' }));
      await expect(openedApps()).toEqual(['chrome']);
    });

    // @codocs [[검색:결과 화면]]
    await step('최고 일치 카드에 열기를 두고, 글과 외부 링크만 링크 복사도 둔다', async () => {
      panel = await reopenSearch(canvasElement, 'react');
      await expect(await within(panel).findByRole('button', { name: '열기' })).toBeInTheDocument();
      await expect(
        within(panel).queryByRole('button', { name: '링크 복사' }),
      ).not.toBeInTheDocument();
      useSearchStore.getState().setQuery('search', 'Next.js 캐시');
      await expect(
        await within(panel).findByRole('button', { name: '링크 복사' }),
      ).toBeInTheDocument();
    });

    // @codocs [[검색:결과 화면]]
    await step('결과가 없으면 검색 결과 없음을 안내한다', async () => {
      useSearchStore.getState().setQuery('search', '없는이름');
      await expect(await within(panel).findByText('검색 결과 없음')).toBeInTheDocument();
    });

    // @codocs [[검색:결과 화면]]
    await step('휴지통에 들어간 항목은 결과에 나오지 않는다', async () => {
      useSearchStore.getState().setQuery('search', 'Next.js');
      await expect(
        await within(panel).findByRole('button', { name: /^Next.js 캐시/ }),
      ).toBeInTheDocument();
      useWorkspaceStore.getState().trashItems(['post:nextjs-cache']);
      await waitFor(() =>
        expect(
          within(panel).queryByRole('button', { name: /^Next.js 캐시/ }),
        ).not.toBeInTheDocument(),
      );
      useWorkspaceStore.getState().restoreItems(['post:nextjs-cache']);
    });

    // @codocs [[검색:결과 화면]]
    await step(
      '최고 일치 카드의 링크 복사를 누르면 글의 공유 링크를 클립보드에 복사한다',
      async () => {
        const writeText = spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
        useSearchStore.getState().setQuery('search', 'Next.js 캐시');
        await userEvent.click(await within(panel).findByRole('button', { name: '링크 복사' }));
        await expect(writeText).toHaveBeenCalledWith(
          `${window.location.origin}/posts/nextjs-cache`,
        );
      },
    );

    // @codocs [[검색:결과 화면]]
    // @codocs [[검색:입력 전 화면]]
    await step('최고 일치 카드의 열기는 항목을 열고 검색 패널을 닫고 최근에 기록한다', async () => {
      await userEvent.click(within(panel).getByRole('button', { name: '열기' }));
      // 글은 이미 열린 Chrome 창에서 열리므로 창은 늘지 않는다.
      await expect(openedApps()).toEqual(['chrome']);
      await expect(usePanelStore.getState().openPanel).toBeNull();
      await expect(useWorkspaceStore.getState().recentItemIds[0]).toBe('post:nextjs-cache');
    });

    // @codocs [[검색:결과 화면]]
    await step('Esc를 누르면 닫힌다', async () => {
      panel = await reopenSearch(canvasElement, 'react');
      await userEvent.keyboard('{Escape}');
      await expect(usePanelStore.getState().openPanel).toBeNull();
    });
  },
};

/** 모바일 폭의 검색 패널. 패널 안 입력칸으로 검색하고 추천 글을 3개만 보인다 */
export const MobileSearch: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  beforeEach: async () => {
    const restoreCatalog = await hydrateStartStoryPosts();
    usePanelStore.getState().openSearch();
    return restoreCatalog;
  },
  play: async ({ canvasElement, step }) => {
    const panel = await within(canvasElement).findByRole('dialog', { name: '검색' });

    // @codocs [[검색:입력 전 화면]]
    await step('모바일은 추천 글을 3개만 보인다', async () => {
      await expect(within(panel).getAllByRole('button')).toHaveLength(3);
    });

    // @codocs [[검색:결과 화면]]
    await step('모바일 검색 패널은 패널 안 입력칸으로 검색한다', async () => {
      await userEvent.type(within(panel).getByRole('searchbox', { name: '검색' }), 'react');
      await expect(within(panel).getByText('최고 일치')).toBeInTheDocument();
    });
  },
};

// 화면이 낮은 상황을 실제 브라우저 높이로 보인다. 뷰포트 높이를 고르려고 스토리 안에서 선택지를 더한다.
const LOW_VIEWPORTS = {
  low400: {
    name: '낮은 화면(높이 400)',
    styles: { width: '1280px', height: '400px' },
    type: 'desktop',
  },
  low100: {
    name: '아주 낮은 화면(높이 100)',
    styles: { width: '1280px', height: '100px' },
    type: 'desktop',
  },
} as const;

/**
 * 패널 바탕의 높이(px). 패널 높이의 상한이 걸렸는지 실제 배치 높이로 본다.
 * @param panel 패널(`role="dialog"`)
 * @returns 패널 바탕의 높이
 */
function panelHeightOf(panel: HTMLElement): number {
  const surface = panel.firstElementChild;
  if (!(surface instanceof HTMLElement)) {
    throw new Error('패널 바탕이 없다');
  }
  return surface.offsetHeight;
}

/** 화면이 낮으면 Start 패널 높이를 작업 영역에서 틈(12)을 뺀 값으로 줄인다 */
export const LowScreen: Story = {
  parameters: { viewport: { options: LOW_VIEWPORTS } },
  globals: { viewport: { value: 'low400', isRotated: false } },
  beforeEach: () => {
    usePanelStore.getState().toggleStart();
  },
  play: async ({ canvasElement, step }) => {
    const panel = await within(canvasElement).findByRole('dialog', { name: '시작' });

    // @codocs [[Start 메뉴:구성]]
    await step('화면이 낮으면 패널 높이를 작업 영역에서 틈(12)을 뺀 값 이하로 줄인다', async () => {
      await expect(window.innerHeight).toBe(400);
      // 작업 영역 352(400 - 작업 표시줄 48) - 틈 12
      await expect(panelHeightOf(panel)).toBe(340);
    });
  },
};

/** 화면이 아주 낮아도 패널은 위쪽과 아래쪽을 더한 높이보다 줄지 않는다 */
export const TinyScreen: Story = {
  // 높이 100에서는 본문이 줄어든 패널 안 스크롤 영역으로만 남고 영역 안 항목이 가려져, axe가 키보드로 닿는 내용을 찾지 못한다.
  // 이 극단 크기에서만 나는 검사 한 가지라 이 스토리에서만 끈다(임의 작업 문서에 적는다).
  parameters: {
    viewport: { options: LOW_VIEWPORTS },
    a11y: { config: { rules: [{ id: 'scrollable-region-focusable', enabled: false }] } },
  },
  globals: { viewport: { value: 'low100', isRotated: false } },
  beforeEach: () => {
    usePanelStore.getState().toggleStart();
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[Start 메뉴:구성]]
    await step('Start 패널은 위쪽과 아래쪽을 더한 높이보다 줄지 않는다', async () => {
      const panel = await canvas.findByRole('dialog', { name: '시작' });
      await expect(window.innerHeight).toBe(100);
      await expect(panelHeightOf(panel)).toBe(151);
    });

    // @codocs [[Start 메뉴:구성]]
    await step(
      '검색 패널도 같은 규칙으로 줄고, 위아래 여백을 더한 높이보다 줄지 않는다',
      async () => {
        usePanelStore.getState().openSearch();
        const panel = await within(canvasElement).findByRole('dialog', { name: '검색' });
        await expect(panelHeightOf(panel)).toBe(66);
      },
    );
  },
};
