import windowExplorerExport from '@figma/patterns/window/explorer/export.json';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';
import { expect, fireEvent, fn, screen, userEvent, waitFor, within } from 'storybook/test';

import { FigmaFrame } from '@seojaewan/design-system/story';

import {
  getStoryCenter,
  holdStoryDrag,
} from '@/features/file-explorer/utils/story-drag/story-drag';
import { hydrateStoryWorkspace } from '@/features/file-explorer/utils/story-workspace/story-workspace';
import type { DeviceVariant } from '@/shared/hooks/use-device/use-device';
import { getWorkArea } from '@/shared/hooks/use-work-area/use-work-area';
import { resetStoryStores } from '@/shared/stores/store-reset/story-stores';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import {
  createExplorerContent,
  type ExplorerLocation,
} from '@/shared/utils/window-rules/window-rules';
import { BLOG_FOLDER_ID } from '@/shared/utils/workspace-rules/workspace-rules';

import { ExplorerWindowLayer } from './explorer-window-layer';
import { LAYER_STORY_POSTS } from './story-data';

type LayerStoryArgs = {
  /** 화면 방식 */
  device: DeviceVariant;
  /** 처음 보는 위치 */
  location: ExplorerLocation;
  /** 마지막 탭을 닫아 창을 닫을 때 */
  onClose: () => void;
};

type ExplorerWindowLayerHostProps = Pick<LayerStoryArgs, 'device' | 'onClose'>;

/** 창 최소화 요청을 받는다. 이 스토리는 창을 줄이지 않는다. */
function handleMinimize(): void {}

/**
 * 창 저장소에서 창 내용을 읽어 탐색기 층을 그린다(창 층이 하는 일).
 * @param props
 * @returns 탐색기 층
 */
function ExplorerWindowLayerHost(props: ExplorerWindowLayerHostProps): JSX.Element | null {
  const { device, onClose } = props;
  const target = useWindowStore((state) => {
    const [id] = state.order;
    return id === undefined ? undefined : state.windows[id];
  });
  if (target?.content.app !== 'file-explorer') {
    return null;
  }
  return (
    <ExplorerWindowLayer
      windowId={target.id}
      content={target.content}
      device={device}
      controls={{
        isInactive: false,
        placement: 'default',
        onMinimize: handleMinimize,
        onClose,
      }}
    />
  );
}

// @codocs [[테스트 작성 규칙:스토리 테스트]]
// 동작 스토리다. 실제 창 저장소와 작업 공간 저장소에 이은 탐색기 창 층을 그린다. 창 층이 하는 일(창 내용을 저장소에서 읽어 넘기기)은
// 스토리의 틀이 대신한다. 창 크기는 창 층이 정하므로 FigmaFrame이 피그마 `Window/Explorer` 크기로 감싼다.
const meta = {
  title: 'Behavior/FileExplorer/ExplorerWindowLayer',
  parameters: {
    layout: 'padded',
  },
  beforeEach: [
    resetStoryStores,
    async ({ args }) => {
      await hydrateStoryWorkspace(LAYER_STORY_POSTS);
      const workArea = getWorkArea(window.innerWidth, window.innerHeight);
      useWindowStore
        .getState()
        .open('file-explorer', workArea, createExplorerContent(args.location));
    },
  ],
  args: { device: 'desktop', location: BLOG_FOLDER_ID, onClose: fn() },
  render: (args) => {
    const { device, onClose: handleClose } = args;
    return (
      <FigmaFrame source={windowExplorerExport} args={{ device }}>
        <ExplorerWindowLayerHost device={device} onClose={handleClose} />
      </FigmaFrame>
    );
  },
} satisfies Meta<LayerStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * 탭 제목들.
 * @param canvas 캔버스
 * @returns 탭 제목
 */
function getTabTitles(canvasElement: HTMLElement): string[] {
  const canvas = within(canvasElement);
  return canvas.getAllByRole('tab').map((tab) => tab.textContent);
}

/**
 * 본문(폴더 내용) 영역.
 * @param canvas 캔버스
 * @returns 폴더 내용
 */
function getFolderContent(canvasElement: HTMLElement): HTMLElement {
  const canvas = within(canvasElement);
  return canvas.getByRole('listbox', { name: '폴더 내용' });
}

/**
 * 탐색 창의 칸들. 즐겨찾기 칸(`favorite:`로 시작하는 열쇠)이나 폴더 트리 칸만 고른다.
 * @param canvasElement 캔버스
 * @param isFavorite 즐겨찾기 칸을 고를지
 * @returns 칸
 */
function getNavigationItems(canvasElement: HTMLElement, isFavorite: boolean): HTMLElement[] {
  return within(within(canvasElement).getByRole('tree'))
    .getAllByRole('treeitem')
    .filter(
      (entry) =>
        (entry.getAttribute('data-tree-key')?.startsWith('favorite:') ?? false) === isFavorite,
    );
}

/**
 * 탐색 창 즐겨찾기 칸 이름들.
 * @param canvasElement 캔버스
 * @returns 이름
 */
function getFavoriteLabels(canvasElement: HTMLElement): string[] {
  return getNavigationItems(canvasElement, true).map((entry) => entry.textContent);
}

/**
 * 탐색 창의 즐겨찾기 칸 하나.
 * @param canvasElement 캔버스
 * @param label 칸 이름
 * @returns 즐겨찾기 칸
 */
function getFavoriteItem(canvasElement: HTMLElement, label: string): HTMLElement {
  const item = getNavigationItems(canvasElement, true).find((entry) => entry.textContent === label);
  if (item === undefined) {
    throw new Error(`즐겨찾기 칸이 없다: ${label}`);
  }
  return item;
}

/**
 * 폴더 내용의 항목 하나.
 * @param canvasElement 캔버스
 * @param name 항목 이름
 * @returns 항목
 */
function getContentItem(canvasElement: HTMLElement, name: string): HTMLElement {
  const item = within(getFolderContent(canvasElement))
    .getAllByRole('option')
    .find((entry) => entry.textContent.includes(name));
  if (item === undefined) {
    throw new Error(`항목이 없다: ${name}`);
  }
  return item;
}

/**
 * 탐색 창의 폴더 트리 칸 하나(즐겨찾기 칸은 빼고 찾는다).
 * @param canvas 캔버스
 * @param label 칸 이름
 * @returns 트리 칸
 */
function getTreeItem(canvasElement: HTMLElement, label: string): HTMLElement {
  const item = getNavigationItems(canvasElement, false).find(
    (entry) => entry.textContent === label,
  );
  if (item === undefined) {
    throw new Error(`트리 칸이 없다: ${label}`);
  }
  return item;
}

/**
 * 탭 하나의 닫기 버튼. 닫기 버튼은 탭(`role="tab"`) 옆, 탭 묶음 안에 있다.
 * @param tab 탭
 * @returns 닫기 버튼
 */
function getCloseButtonOf(tab: HTMLElement | undefined): HTMLElement {
  return within(tab?.parentElement ?? document.body).getByLabelText('탭 닫기');
}

/**
 * 창 내용을 React 폴더 탭 하나로 되돌리고 다시 그려질 때까지 기다린다.
 * @param canvas 캔버스
 */
async function resetTabs(canvasElement: HTMLElement): Promise<void> {
  const canvas = within(canvasElement);
  const [id] = useWindowStore.getState().order;
  if (id !== undefined) {
    useWindowStore.getState().setContent(id, createExplorerContent('folder:React'));
  }
  await waitFor(async () => {
    await expect(canvas.getAllByRole('tab')).toHaveLength(1);
  });
}

/**
 * 닫은 메뉴가 문서에서 사라질 때까지 기다린다. 닫는 애니메이션이 끝나야 사라진다.
 */
async function waitForMenuGone(): Promise<void> {
  await waitFor(
    async () => {
      await expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    },
    { timeout: 5000 },
  );
}

/** 폴더를 열고, 뒤로·앞으로·위로와 키보드로 같은 탭에서 위치를 옮긴다 */
export const Navigation: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[파일 탐색기:조작]]
    await step('탐색 창 칸은 끌어 놓을 곳이다', async () => {
      await expect(getTreeItem(canvasElement, 'React')).toHaveAttribute(
        'data-drop-target',
        'folder:React',
      );
    });

    // @codocs [[파일 탐색기:탭]]
    await step('뒤로·앞으로 갈 기록이 없으면 버튼이 비활성이다', async () => {
      await expect(canvas.getByRole('button', { name: '뒤로' })).toBeDisabled();
      await expect(canvas.getByRole('button', { name: '앞으로' })).toBeDisabled();
    });

    // @codocs [[파일 탐색기:조작]]
    await step('데스크톱은 폴더를 한 번 클릭해도 이동하지 않는다', async () => {
      await user.click(within(getFolderContent(canvasElement)).getByText('React'));
      await expect(getTabTitles(canvasElement)).toEqual(['Blog']);
    });

    await step('폴더를 더블클릭하면 새 탭을 열지 않고 같은 탭에서 그 폴더로 이동한다', async () => {
      const before = getFolderContent(canvasElement).parentElement;
      await user.dblClick(within(getFolderContent(canvasElement)).getByText('React'));
      await expect(
        within(getFolderContent(canvasElement)).getByText('훅 정리'),
      ).toBeInTheDocument();
      await expect(canvas.getAllByRole('tab')).toHaveLength(1);
      // 같은 탭에서 위치를 옮기면 항목 자리를 새로 그려 스크롤을 맨 위로 돌린다.
      await expect(getFolderContent(canvasElement).parentElement).not.toBe(before);
    });

    // @codocs [[파일 탐색기:탭]]
    await step('탭 제목은 현재 폴더 이름이다', async () => {
      await expect(getTabTitles(canvasElement)).toEqual(['React']);
    });

    // @codocs [[파일 탐색기:조작]]
    await step('Backspace를 누르면 뒤로 간다', async () => {
      await fireEvent.keyDown(getFolderContent(canvasElement), { key: 'Backspace' });
      await expect(getTabTitles(canvasElement)).toEqual(['Blog']);
    });

    await step('검색 상자에서 누른 Backspace는 뒤로 가지 않는다', async () => {
      await user.dblClick(within(getFolderContent(canvasElement)).getByText('React'));
      await fireEvent.keyDown(canvas.getByRole('searchbox', { name: '검색' }), {
        key: 'Backspace',
      });
      await expect(getTabTitles(canvasElement)).toEqual(['React']);
    });

    await step('본문 DOM 밖(포털 메뉴)에서 올라온 Backspace로는 뒤로 가지 않는다', async () => {
      await userEvent.pointer({ keys: '[MouseRight]', target: getFolderContent(canvasElement) });
      await fireEvent.keyDown(await screen.findByRole('menu'), { key: 'Backspace' });
      // 메뉴가 열린 동안 바깥은 접근성 트리에서 숨겨지므로 숨은 요소까지 찾는다.
      await expect(
        canvas.getAllByRole('tab', { hidden: true }).map((tab) => tab.textContent),
      ).toEqual(['React']);
      await user.keyboard('{Escape}');
      await waitForMenuGone();
    });

    await step('Alt + ←는 뒤로 가고 Alt + →는 앞으로 간다', async () => {
      await fireEvent.keyDown(getFolderContent(canvasElement), { key: 'ArrowLeft', altKey: true });
      await expect(getTabTitles(canvasElement)).toEqual(['Blog']);
      await fireEvent.keyDown(getFolderContent(canvasElement), { key: 'ArrowRight', altKey: true });
      await expect(getTabTitles(canvasElement)).toEqual(['React']);
    });

    // @codocs [[파일 탐색기:탭]]
    await step(
      '뒤로 버튼은 바로 앞에 본 위치로, 앞으로 버튼은 뒤로 오기 전 위치로 간다',
      async () => {
        await user.click(canvas.getByRole('button', { name: '뒤로' }));
        await expect(getTabTitles(canvasElement)).toEqual(['Blog']);
        await user.click(canvas.getByRole('button', { name: '앞으로' }));
        await expect(getTabTitles(canvasElement)).toEqual(['React']);
      },
    );

    await step('위로는 상위 폴더로 간다', async () => {
      await user.click(canvas.getByRole('button', { name: '위로' }));
      await expect(getTabTitles(canvasElement)).toEqual(['Blog']);
    });

    // @codocs [[파일 탐색기:탭]]
    await step('위로 간 폴더는 방금 있던 폴더가 선택되고 현재 항목이다', async () => {
      const react = getContentItem(canvasElement, 'React');
      await expect(react).toHaveAttribute('aria-selected', 'true');
      await expect(react).toHaveAttribute('tabindex', '0');
    });

    await step('뒤로·앞으로 돌아오면 그 칸을 떠날 때의 선택을 되살린다', async () => {
      await user.click(canvas.getByRole('button', { name: '뒤로' }));
      await expect(getTabTitles(canvasElement)).toEqual(['React']);
      await user.click(getContentItem(canvasElement, '훅 정리'));
      await user.click(canvas.getByRole('button', { name: '앞으로' }));
      await expect(getTabTitles(canvasElement)).toEqual(['Blog']);
      await expect(getContentItem(canvasElement, 'React')).toHaveAttribute('aria-selected', 'true');
      await user.click(canvas.getByRole('button', { name: '뒤로' }));
      await expect(getContentItem(canvasElement, '훅 정리')).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    // @codocs [[파일 탐색기:조작]]
    await step('새로 간 폴더는 선택 없이 보인다', async () => {
      await user.dblClick(getContentItem(canvasElement, 'Hooks'));
      await expect(getTabTitles(canvasElement)).toEqual(['Hooks']);
      await expect(
        within(getFolderContent(canvasElement))
          .getAllByRole('option')
          .filter((entry) => entry.getAttribute('aria-selected') === 'true'),
      ).toHaveLength(0);
    });
  },
};

/** 탐색 창 맨 위의 즐겨찾기를 누르고, 폴더 메뉴와 끌기로 고정하고 뺀다 */
export const Favorites: Story = {
  play: async ({ canvasElement, step }) => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[파일 탐색기:탐색 창]]
    await step('탐색 창 맨 위에 압정이 붙은 즐겨찾기가 고정한 차례로 있다', async () => {
      await expect(getFavoriteLabels(canvasElement)).toEqual(['Project', 'Blog', 'About']);
      const [firstFavorite] = getNavigationItems(canvasElement, true);
      await expect(firstFavorite?.querySelectorAll('svg').length).toBeGreaterThan(0);
    });

    await step('즐겨찾기 칸을 누르면 그 폴더로 가고 그 칸이 선택된 칸이다', async () => {
      await user.click(getFavoriteItem(canvasElement, 'About'));
      await expect(getTabTitles(canvasElement)).toEqual(['About']);
      await expect(getFavoriteItem(canvasElement, 'About')).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(getTreeItem(canvasElement, 'About')).toHaveAttribute('aria-selected', 'false');
      await user.click(getTreeItem(canvasElement, 'Blog'));
      await expect(getTreeItem(canvasElement, 'Blog')).toHaveAttribute('aria-selected', 'true');
      await expect(getFavoriteItem(canvasElement, 'Blog')).toHaveAttribute(
        'aria-selected',
        'false',
      );
    });

    // @codocs [[파일 탐색기:우클릭 메뉴]]
    await step('폴더 메뉴의 즐겨찾기에 고정은 맨 뒤에 넣고, 즐겨찾기에서 제거는 뺀다', async () => {
      await userEvent.pointer({
        keys: '[MouseRight]',
        target: getContentItem(canvasElement, 'React'),
      });
      await user.click(await screen.findByRole('menuitem', { name: '즐겨찾기에 고정' }));
      await waitForMenuGone();
      await expect(getFavoriteLabels(canvasElement)).toEqual(['Project', 'Blog', 'About', 'React']);
      await userEvent.pointer({
        keys: '[MouseRight]',
        target: getContentItem(canvasElement, 'React'),
      });
      await user.click(await screen.findByRole('menuitem', { name: '즐겨찾기에서 제거' }));
      await waitForMenuGone();
      await expect(getFavoriteLabels(canvasElement)).toEqual(['Project', 'Blog', 'About']);
    });

    // @codocs [[파일 탐색기:탐색 창]]
    await step(
      '폴더를 즐겨찾기 칸 사이로 끌면 가로선과 툴팁을 보이고, 놓으면 그 자리에 고정한다',
      async () => {
        const react = getContentItem(canvasElement, 'React');
        const blog = getFavoriteItem(canvasElement, 'Blog');
        const box = blog.getBoundingClientRect();
        const gap = { x: box.x + box.width / 2, y: box.y + 1 };
        const held = await holdStoryDrag(react, [
          getStoryCenter(react),
          { x: gap.x, y: gap.y + 20 },
          gap,
        ]);
        await expect(canvasElement.querySelector('[data-favorites-drop-line]')).not.toBeNull();
        await expect(await screen.findByText('즐겨찾기에 고정')).toBeInTheDocument();
        await held.release();
        await expect(getFavoriteLabels(canvasElement)).toEqual([
          'Project',
          'React',
          'Blog',
          'About',
        ]);
        await expect(getTabTitles(canvasElement)).toEqual(['Blog']);
      },
    );

    await step(
      '글은 즐겨찾기 칸 사이에 놓을 수 없어 not-allowed 커서이고 놓아도 그대로다',
      async () => {
        await user.dblClick(getContentItem(canvasElement, 'React'));
        const post = getContentItem(canvasElement, '훅 정리');
        const about = getFavoriteItem(canvasElement, 'About');
        const box = about.getBoundingClientRect();
        const gap = { x: box.x + box.width / 2, y: box.y + 1 };
        const held = await holdStoryDrag(post, [
          getStoryCenter(post),
          { x: gap.x, y: gap.y + 20 },
          gap,
        ]);
        await expect(document.documentElement).toHaveAttribute('data-item-drag-rejected');
        await expect(canvasElement.querySelector('[data-favorites-drop-line]')).toBeNull();
        await held.release();
        await expect(getFavoriteLabels(canvasElement)).toEqual([
          'Project',
          'React',
          'Blog',
          'About',
        ]);
      },
    );

    await step('즐겨찾기가 비면 칸과 구분선을 숨긴다', async () => {
      for (const id of [...useWorkspaceStore.getState().favoritePins]) {
        useWorkspaceStore.getState().unpinFromFavorites(id);
      }
      await waitFor(async () => {
        await expect(getNavigationItems(canvasElement, true)).toHaveLength(0);
      });
      await expect(canvasElement.querySelector('[data-favorites-end]')).toBeNull();
    });
  },
};

/** 바탕 화면에서는 위로 갈 곳이 없다 */
export const DesktopRoot: Story = {
  args: { location: null },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[파일 탐색기:탭]]
    await step('바탕화면에서는 위로가 비활성이다', async () => {
      await expect(canvas.getByRole('button', { name: '위로' })).toBeDisabled();
    });
  },
};

// 주소창 경로 구분자(백슬래시)다.
const pathSeparator = String.fromCodePoint(92);

/**
 * 주소 줄 경로(Breadcrumb)의 빈 곳인 위치 아이콘 자리.
 * @param canvasElement 캔버스
 * @returns 위치 아이콘 자리
 */
function getBreadcrumbBlank(canvasElement: HTMLElement): HTMLElement {
  const current = within(canvasElement).getByRole('button', { current: 'page' });
  const blank =
    current.closest('[data-separator]')?.parentElement?.parentElement?.firstElementChild;
  if (!(blank instanceof HTMLElement)) {
    throw new Error('경로의 빈 곳이 없다');
  }
  return blank;
}

/** 주소창 편집. 경로의 빈 곳을 눌러 경로를 입력하고 Enter로 가며, 찾지 못하면 메시지 상자를 띄운다 */
export const AddressEdit: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    /**
     * 경로의 빈 곳을 눌러 편집을 시작하고 입력칸을 돌려준다.
     * @returns 주소 입력칸
     */
    async function startEditing(): Promise<HTMLInputElement> {
      await user.click(getBreadcrumbBlank(canvasElement));
      const field = await canvas.findByRole('textbox', { name: '주소' });
      if (!(field instanceof HTMLInputElement)) {
        throw new Error('주소 입력칸이 없다');
      }
      return field;
    }

    // @codocs [[파일 탐색기:주소창 편집]]
    await step('경로의 빈 곳을 누르면 경로가 입력칸으로 바뀌고 전체가 선택된다', async () => {
      const field = await startEditing();
      const text = ['바탕 화면', 'Blog'].join(pathSeparator);
      await expect(field).toHaveValue(text);
      await waitFor(() => expect(field).toHaveFocus());
      await expect([field.selectionStart, field.selectionEnd]).toEqual([0, text.length]);
    });

    // @codocs [[파일 탐색기:주소창 편집]]
    await step('Esc를 누르면 입력을 버리고 경로 모양으로 돌아간다', async () => {
      await user.keyboard('x{Escape}');
      await expect(canvas.queryByRole('textbox', { name: '주소' })).not.toBeInTheDocument();
      await expect(getTabTitles(canvasElement)).toEqual(['Blog']);
    });

    // @codocs [[파일 탐색기:주소창 편집]]
    await step(
      'Enter를 누르면 대소문자를 가리지 않고 경로의 폴더로 가고 뒤로 기록에 남는다',
      async () => {
        const field = await startEditing();
        await user.clear(field);
        await user.type(field, ['blog', 'REACT'].join(pathSeparator));
        await user.keyboard('{Enter}');
        await expect(getTabTitles(canvasElement)).toEqual(['React']);
        await expect(canvas.queryByRole('textbox', { name: '주소' })).not.toBeInTheDocument();
        await user.click(canvas.getByRole('button', { name: '뒤로' }));
        await expect(getTabTitles(canvasElement)).toEqual(['Blog']);
      },
    );

    // @codocs [[파일 탐색기:주소창 편집]]
    await step('찾지 못하면 메시지 상자를 띄우고 입력칸은 그대로 둔다', async () => {
      const field = await startEditing();
      await user.clear(field);
      await user.type(field, '없는 폴더');
      await user.keyboard('{Enter}');
      const dialog = await screen.findByRole('alertdialog');
      await expect(dialog).toHaveTextContent(
        "'없는 폴더'을(를) 찾을 수 없습니다. 철자를 확인하고 다시 시도하세요.",
      );
      await expect(within(dialog).getByText('파일 탐색기')).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: '확인' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      await expect(canvas.getByRole('textbox', { name: '주소' })).toHaveValue('없는 폴더');
    });

    // @codocs [[파일 탐색기:주소창 편집]]
    await step('포커스를 잃으면 입력을 버린다', async () => {
      await user.click(getFolderContent(canvasElement));
      await expect(canvas.queryByRole('textbox', { name: '주소' })).not.toBeInTheDocument();
    });

    // @codocs [[파일 탐색기:주소창 편집]]
    await step('휴지통도 받는다', async () => {
      const field = await startEditing();
      await user.clear(field);
      await user.type(field, '휴지통');
      await user.keyboard('{Enter}');
      await expect(getTabTitles(canvasElement)).toEqual(['휴지통']);
    });
  },
};

/** 주소창 경로 끝이 휴지통에 있는 항목이면 복원할지 묻고, 취소하면 편집 상태로, 복원하면 복원한 뒤 연다 */
export const AddressEditTrashed: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await expect(useWorkspaceStore.getState().trashItems(['folder:React'])).toEqual({ ok: true });
    const path = ['Blog', 'React'].join(pathSeparator);

    /**
     * 경로를 입력하고 Enter를 눌러 뜬 메시지 상자를 돌려준다.
     * @returns 메시지 상자
     */
    async function submitTrashedPath(): Promise<HTMLElement> {
      await user.click(getBreadcrumbBlank(canvasElement));
      const field = await canvas.findByRole('textbox', { name: '주소' });
      await user.clear(field);
      await user.type(field, path);
      await user.keyboard('{Enter}');
      return screen.findByRole('alertdialog');
    }

    // @codocs [[파일 탐색기:주소창 편집]]
    await step('휴지통에 있는 폴더는 열지 않고 종류에 맞춘 문구로 복원할지 묻는다', async () => {
      const dialog = await submitTrashedPath();
      await expect(within(dialog).getByText('휴지통에 있는 폴더')).toBeInTheDocument();
      await expect(dialog).toHaveTextContent('이 폴더는 휴지통에 있어요. 복원하고 열까요?');
    });

    // @codocs [[파일 탐색기:주소창 편집]]
    await step('취소하면 주소창 편집 상태로 돌아간다', async () => {
      await user.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: '취소' }),
      );
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      await expect(canvas.getByRole('textbox', { name: '주소' })).toHaveValue(path);
      await expect(getTabTitles(canvasElement)).toEqual(['Blog']);
    });

    // @codocs [[파일 탐색기:주소창 편집]]
    await step('복원하면 원래 위치로 돌려놓고 그 폴더로 간다', async () => {
      await user.keyboard('{Enter}');
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: '복원' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      await expect(getTabTitles(canvasElement)).toEqual(['React']);
      await expect(useWorkspaceStore.getState().items['folder:React']).toMatchObject({
        parentId: BLOG_FOLDER_ID,
        trash: null,
      });
    });
  },
};

/** 탭을 열고, 고르고, 닫고, 끌어 순서를 바꾼다 */
export const Tabs: Story = {
  args: { location: 'folder:React' },
  play: async ({ canvasElement, args, step }) => {
    const { onClose: handleClose } = args;
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[파일 탐색기:탭]]
    await step('+ 버튼은 바탕 화면 위치를 보는 새 탭을 열고 그 탭을 고른다', async () => {
      await user.click(canvas.getByRole('button', { name: '새 탭' }));
      await expect(getTabTitles(canvasElement)).toEqual(['React', '바탕 화면']);
      await expect(canvas.getByRole('tab', { name: /바탕 화면/ })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    await step('고른 탭만 Tab 키로 닿는다', async () => {
      await expect(canvas.getAllByRole('tab').map((tab) => tab.tabIndex)).toEqual([-1, 0]);
    });

    await step('탭에서 ←를 누르면 앞 탭을 고르고 그 탭에 포커스를 옮긴다', async () => {
      canvas.getByRole('tab', { name: /바탕 화면/ }).focus();
      await user.keyboard('{ArrowLeft}');
      await expect(canvas.getByRole('tab', { name: /React/ })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(canvas.getByRole('tab', { name: /React/ })).toHaveFocus();
    });

    await step('탭을 클릭하면 그 탭으로 바꾼다', async () => {
      await user.click(canvas.getByRole('tab', { name: /바탕 화면/ }));
      await user.click(canvas.getByRole('tab', { name: /React/ }));
      await expect(
        within(getFolderContent(canvasElement)).getByText('훅 정리'),
      ).toBeInTheDocument();
    });

    await step('탭의 ×를 누르면 그 탭을 닫는다', async () => {
      await user.click(getCloseButtonOf(canvas.getByRole('tab', { name: /바탕 화면/ })));
      await expect(getTabTitles(canvasElement)).toEqual(['React']);
    });

    // @codocs [[접근성:포커스]]
    await step('탭에서 Delete를 누르면 그 탭을 닫고 고른 탭으로 포커스를 옮긴다', async () => {
      await user.click(canvas.getByRole('button', { name: '새 탭' }));
      canvas.getByRole('tab', { selected: true }).focus();
      await user.keyboard('{Delete}');
      await expect(getTabTitles(canvasElement)).toEqual(['React']);
      await waitFor(async () => {
        await expect(canvas.getByRole('tab', { selected: true })).toHaveFocus();
      });
    });

    await step('탭을 가운데 클릭하면 그 탭을 닫는다', async () => {
      await user.click(canvas.getByRole('button', { name: '새 탭' }));
      await fireEvent(
        canvas.getByRole('tab', { name: /React/ }),
        new MouseEvent('auxclick', { bubbles: true, button: 1 }),
      );
      await expect(getTabTitles(canvasElement)).toEqual(['바탕 화면']);
    });

    await step('탭을 끌어 순서를 바꾸면 창 내용의 탭 차례가 바뀐다', async () => {
      await resetTabs(canvasElement);
      await user.click(canvas.getByRole('button', { name: '새 탭' }));
      const blog = canvas.getByRole('tab', { name: /바탕 화면/ });
      const react = canvas.getByRole('tab', { name: /React/ });
      const held = await holdStoryDrag(blog, [getStoryCenter(blog), getStoryCenter(react)]);
      await held.release();
      await expect(getTabTitles(canvasElement)).toEqual(['바탕 화면', 'React']);
    });

    await step('탭을 두 칸 이상 끌면 끈 자리마다 차례대로 옮긴다', async () => {
      await resetTabs(canvasElement);
      await user.click(canvas.getByRole('button', { name: '새 탭' }));
      await user.click(canvas.getByRole('button', { name: '새 탭' }));
      await user.dblClick(within(getFolderContent(canvasElement)).getByText('Blog'));
      const [first, middle, last] = canvas.getAllByRole('tab');
      if (first === undefined || middle === undefined || last === undefined) {
        throw new Error('탭이 셋이 아니다');
      }
      const held = await holdStoryDrag(last, [
        getStoryCenter(last),
        getStoryCenter(middle),
        getStoryCenter(first),
      ]);
      await held.release();
      await expect(getTabTitles(canvasElement)).toEqual(['Blog', 'React', '바탕 화면']);
    });

    await step('끄는 동안 탭이 닫히면 닫힌 탭이 되살아나지 않는다', async () => {
      await resetTabs(canvasElement);
      await user.click(canvas.getByRole('button', { name: '새 탭' }));
      await user.click(canvas.getByRole('button', { name: '새 탭' }));
      const [first, middle, last] = canvas.getAllByRole('tab');
      if (first === undefined || middle === undefined || last === undefined) {
        throw new Error('탭이 셋이 아니다');
      }
      const held = await holdStoryDrag(last, [getStoryCenter(last), getStoryCenter(middle)]);
      await fireEvent.click(getCloseButtonOf(first));
      await held.moveTo(getStoryCenter(first));
      await held.release();
      await expect(canvas.getAllByRole('tab')).toHaveLength(2);
    });

    await step('마지막 탭을 닫으면 창을 닫는다', async () => {
      await resetTabs(canvasElement);
      await user.click(canvas.getByLabelText('탭 닫기'));
      await expect(handleClose).toHaveBeenCalledTimes(1);
    });
  },
};

/** 다른 창에서 지금 보는 폴더를 휴지통에 넣는다 */
export const TrashedFolder: Story = {
  args: { location: 'folder:React/Hooks' },
  play: async ({ canvasElement, step }) => {
    // @codocs [[파일 탐색기:탭]]
    await step('다른 창에서 지금 보는 폴더를 휴지통에 넣으면 상위 폴더로 이동한다', async () => {
      useWorkspaceStore.getState().trashItems(['folder:React']);
      await waitFor(async () => {
        await expect(getTabTitles(canvasElement)).toEqual(['Blog']);
      });
    });
  },
};

/** 깊은 폴더에서 탐색 창을 접고 위치 칸으로 올라간다 */
export const DeepFolder: Story = {
  args: { location: 'folder:React/Hooks' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[파일 탐색기:구성]]
    await step('현재 위치의 조상을 접으면 가장 가까운 보이는 조상이 Tab으로 닿는다', async () => {
      await fireEvent.keyDown(getTreeItem(canvasElement, 'Blog'), { key: 'ArrowLeft' });
      await expect(getTreeItem(canvasElement, 'Blog')).toHaveAttribute('tabindex', '0');
    });

    await step('위치 칸을 누르면 그 위치로 간다', async () => {
      await expect(
        canvas.getByRole('button', { name: 'Hooks', current: 'page' }),
      ).toBeInTheDocument();
      await user.click(canvas.getByRole('button', { name: 'Blog' }));
      await expect(getTabTitles(canvasElement)).toEqual(['Blog']);
    });
  },
};

/** 탐색 창 트리를 펼치고 접고 눌러 위치를 옮긴다 */
export const Tree: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[파일 탐색기:구성]]
    await step('탐색 창의 꺾쇠를 누르면 접힌 폴더를 펼치고 그 폴더로 이동하지 않는다', async () => {
      await user.click(getTreeItem(canvasElement, 'React').querySelector('svg') ?? canvasElement);
      await expect(within(canvas.getByRole('tree')).getByText('Hooks')).toBeInTheDocument();
      await expect(getTabTitles(canvasElement)).toEqual(['Blog']);
    });

    await step('탐색 창 칸에서 ←를 누르면 펼친 폴더를 접는다', async () => {
      await fireEvent.keyDown(getTreeItem(canvasElement, 'React'), { key: 'ArrowLeft' });
      await expect(getTreeItem(canvasElement, 'React')).toHaveAttribute('aria-expanded', 'false');
    });

    await step('탐색 창 칸에서 →를 누르면 접힌 폴더를 펼친다', async () => {
      await fireEvent.keyDown(getTreeItem(canvasElement, 'React'), { key: 'ArrowRight' });
      await expect(getTreeItem(canvasElement, 'React')).toHaveAttribute('aria-expanded', 'true');
    });

    // @codocs [[파일 탐색기:탐색 창]]
    await step('탐색 창에서 ↑↓·Home/End·부모/자식 이동으로 포커스를 옮긴다', async () => {
      const items = within(canvas.getByRole('tree')).getAllByRole('treeitem');
      const react = getTreeItem(canvasElement, 'React');
      const hooks = getTreeItem(canvasElement, 'Hooks');
      react.focus();
      await user.keyboard('{ArrowDown}');
      await expect(hooks).toHaveFocus();
      await user.keyboard('{ArrowUp}');
      await expect(react).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      await expect(hooks).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      await expect(react).toHaveFocus();
      await user.keyboard('{End}');
      await expect(items.at(-1)).toHaveFocus();
      await user.keyboard('{Home}');
      await expect(items[0]).toHaveFocus();
      await expect(getTabTitles(canvasElement)).toEqual(['Blog']);
    });

    await step('탐색 창은 현재 위치를 고른 칸으로 표시한다', async () => {
      await user.dblClick(within(getFolderContent(canvasElement)).getByText('React'));
      const selected = within(canvas.getByRole('tree'))
        .getAllByRole('treeitem')
        .filter((item) => item.getAttribute('aria-selected') === 'true');
      await expect(selected.map((item) => item.textContent)).toEqual(['React']);
    });

    await step('탐색 창의 폴더를 누르면 그 폴더로 간다', async () => {
      await user.click(within(canvas.getByRole('tree')).getByText('휴지통'));
      await expect(getTabTitles(canvasElement)).toEqual(['휴지통']);
    });
  },
};

/** 모바일 폭에서는 탭 하나만 쓰고 폴더를 탭하면 이동한다 */
export const Mobile: Story = {
  args: { device: 'mobile' },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    // @codocs [[창 동작:모바일]]
    await step('모바일은 탭 하나만 써서 탭 줄과 새 탭 버튼이 없다', async () => {
      await expect(canvas.queryByRole('tab')).not.toBeInTheDocument();
      await expect(canvas.queryByRole('button', { name: '새 탭' })).not.toBeInTheDocument();
    });

    // @codocs [[파일 탐색기:조작]]
    await step('모바일은 폴더를 탭하면 같은 탭에서 그 폴더로 이동한다', async () => {
      await user.click(within(getFolderContent(canvasElement)).getByText('React'));
      await expect(
        within(getFolderContent(canvasElement)).getByText('훅 정리'),
      ).toBeInTheDocument();
    });

    // @codocs [[파일 탐색기:주소창 편집]]
    // @codocs [[파일 탐색기:모바일]]
    await step('모바일은 현재 위치 한 칸을 누르면 입력칸으로 바뀐다', async () => {
      await user.click(canvas.getByRole('button', { current: 'page' }));
      await expect(await canvas.findByRole('textbox', { name: '주소' })).toHaveValue(
        ['바탕 화면', 'Blog', 'React'].join(pathSeparator),
      );
    });
  },
};
