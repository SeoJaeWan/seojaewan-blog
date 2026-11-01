import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { dragStoryPointer } from '@/features/window/story-pointer';
import { openStoryWindows, resetStoryStores } from '@/shared/stores/store-reset/story-stores';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import { getStoryWindowTitle, renderStoryWindow } from '@/shared/utils/window-rules/story-window';

import {
  HOVER_PREVIEW_CLOSE_DELAY,
  HOVER_PREVIEW_OPEN_DELAY,
} from './hooks/use-hover-preview/use-hover-preview';
import { installStoryClock } from './story-clock';
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
    <div className="fixed inset-x-spacing-none bottom-spacing-none flex justify-center">
      <TaskbarAppsLayer {...args} />
    </div>
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
    return tab?.history[tab.historyIndex];
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
      await userEvent.click(body.getByRole('button', { name: 'Chrome' }));
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
      const button = body.getByRole('button', { name: 'Chrome' });
      await userEvent.click(button);
      await expect(await body.findAllByRole('button', { name: PREVIEW_CARD_NAME })).toHaveLength(2);
      await expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('앱 버튼을 우클릭하면 메뉴를 열고 창 미리보기를 닫는다', async () => {
      await openAppMenu(canvasElement, 'Chrome');
      await expect(body.queryByRole('button', { name: PREVIEW_CARD_NAME })).not.toBeInTheDocument();
      await expect(getMenuItemNames(canvasElement)).toEqual([
        'Chrome',
        '작업 표시줄에서 고정 해제',
        '모든 창 닫기',
      ]);
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('앱 이름을 고르면 새 창을 연다', async () => {
      await clickMenuItem(canvasElement, 'Chrome');
      await expect(getOpenApps()).toEqual(['chrome', 'chrome', 'file-explorer', 'chrome']);
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('모든 창 닫기로 그 앱의 창을 모두 닫는다', async () => {
      await openAppMenu(canvasElement, 'Chrome');
      await clickMenuItem(canvasElement, '모든 창 닫기');
      await expect(getOpenApps()).toEqual(['file-explorer']);
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step('창이 하나인 앱은 창 닫기로 그 앱의 창을 닫는다', async () => {
      await openAppMenu(canvasElement, '파일 탐색기');
      await expect(getMenuItemNames(canvasElement)).toEqual([
        '파일 탐색기',
        '작업 표시줄에서 고정 해제',
        '창 닫기',
      ]);
      await clickMenuItem(canvasElement, '창 닫기');
      await expect(getOpenApps()).toEqual([]);
    });
  },
};

/** 창이 있는 앱 버튼에 마우스를 400ms 올리면 미리보기를 띄운다. 가짜 시계로 지연을 흘린다 */
export const HoverPreview: Story = {
  // 축소 화면의 글자가 카드 이름에 없다고 label-content-name-mismatch에 걸린다. 지연만 보는 스토리라 창 내용을 그리지 않는다.
  args: { renderWindow: () => null },
  beforeEach: () => {
    openStoryWindows(['chrome']);
  },
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);
    const button = body.getByRole('button', { name: 'Chrome' });
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
    const button = body.getByRole('button', { name: 'Chrome' });
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
          const button = body.getByRole('button', { name: 'Chrome' });
          await fireEvent.pointerOver(button, { pointerType: 'mouse' });
          clock.tick(HOVER_PREVIEW_OPEN_DELAY);
          await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'true'));
          // 닫기 버튼은 카드에 마우스를 올려야 보이는 CSS hover라, 보이지 않는 채로 이름을 못 찾으므로 카드 안에서 속성으로 찾는다.
          const card = await body.findByRole('button', { name: PREVIEW_CARD_NAME });
          const closeButton = card.querySelector('button[aria-label="창 닫기"]');
          await expect(closeButton).not.toBeNull();
          await fireEvent.click(closeButton as Element);
          await waitFor(() =>
            expect(body.queryByRole('button', { name: 'Chrome' })).not.toBeInTheDocument(),
          );
          const workArea = { width: window.innerWidth, height: window.innerHeight };
          useWindowStore.getState().open('chrome', workArea);
          const reopened = await body.findByRole('button', { name: 'Chrome' });
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
      await expect(getMenuItemNames(canvasElement)).toEqual([
        '파일 탐색기',
        '작업 표시줄에서 고정 해제',
      ]);
      await userEvent.keyboard('{Escape}');
    });

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    // @codocs [[작업 표시줄:고정과 순서]]
    await step(
      '고정 해제를 고르면 고정 목록에서 빼고, 고정하지 않은 실행 중인 앱은 뒤에 붙는다',
      async () => {
        await openAppMenu(canvasElement, 'Chrome');
        await clickMenuItem(canvasElement, '작업 표시줄에서 고정 해제');
        await expect(useWorkspaceStore.getState().taskbarPins).toEqual(['file-explorer']);
        await expect(getButtonNames(canvasElement)).toEqual(['파일 탐색기', 'Chrome']);
      },
    );

    // @codocs [[작업 표시줄:우클릭 메뉴]]
    await step(
      '고정하지 않은 앱은 작업 표시줄에 고정을 고르면 고정 목록 맨 뒤에 붙인다',
      async () => {
        await openAppMenu(canvasElement, 'Chrome');
        await expect(getMenuItemNames(canvasElement)).toEqual([
          'Chrome',
          '작업 표시줄에 고정',
          '창 닫기',
        ]);
        await clickMenuItem(canvasElement, '작업 표시줄에 고정');
        await expect(useWorkspaceStore.getState().taskbarPins).toEqual(['file-explorer', 'chrome']);
      },
    );

    // @codocs [[작업 표시줄:고정과 순서]]
    await step('고정을 해제한 앱은 창을 모두 닫으면 버튼이 사라진다', async () => {
      await openAppMenu(canvasElement, 'Chrome');
      await clickMenuItem(canvasElement, '작업 표시줄에서 고정 해제');
      await expect(getButtonNames(canvasElement)).toEqual(['파일 탐색기', 'Chrome']);
      await openAppMenu(canvasElement, 'Chrome');
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
      await expect(getButtonNames(canvasElement)).toEqual(['파일 탐색기', 'Chrome']);
      useWorkspaceStore.getState().moveTaskbarPin('chrome', 0);
      await waitFor(() => expect(getButtonNames(canvasElement)).toEqual(['Chrome', '파일 탐색기']));
      useWorkspaceStore.getState().moveTaskbarPin('chrome', 1);
      await waitFor(() => expect(getButtonNames(canvasElement)).toEqual(['파일 탐색기', 'Chrome']));
    });

    // @codocs [[작업 표시줄:고정과 순서]]
    await step(
      '고정한 버튼을 다른 고정 버튼 자리로 끌어 놓으면 순서가 바뀌고, 끌기 뒤에 따라오는 클릭은 버튼 동작을 하지 않는다',
      async () => {
        const chrome = body.getByRole('button', { name: 'Chrome' });
        const explorer = body.getByRole('button', { name: '파일 탐색기' });
        await dragStoryPointer(chrome, [getCenter(chrome), getCenter(explorer)]);
        await fireEvent.click(chrome);
        await expect(useWorkspaceStore.getState().taskbarPins).toEqual(['chrome', 'file-explorer']);
        await expect(useWindowStore.getState().order).toEqual([]);
      },
    );

    // @codocs [[작업 표시줄:고정과 순서]]
    await step('끌지 않고 누르면 버튼 동작을 한다', async () => {
      const chrome = body.getByRole('button', { name: 'Chrome' });
      await dragStoryPointer(chrome, [getCenter(chrome)]);
      await fireEvent.click(chrome);
      await expect(useWindowStore.getState().order).toHaveLength(1);
    });
  },
};

/** 모바일 폭이다. 창 미리보기 목록을 화면 폭에서 좌우 12px 여백을 뺀 폭에 맞추고 카드를 같은 너비로 줄인다 */
export const Mobile: Story = {
  args: { renderWindow: () => null },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  beforeEach: () => {
    openStoryWindows(['chrome', 'chrome', 'chrome']);
  },
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);

    // @codocs [[작업 표시줄:모바일]]
    await step(
      '미리보기 목록을 화면 폭에서 좌우 12px 여백을 뺀 폭에 맞추고 카드를 같은 너비로 줄인다',
      async () => {
        await userEvent.click(body.getByRole('button', { name: 'Chrome' }));
        const cards = await body.findAllByRole('button', { name: PREVIEW_CARD_NAME });
        await expect(cards).toHaveLength(3);
        // 실제 브라우저라 여는 애니메이션의 scale이 getBoundingClientRect에 들어가므로 배치 크기를 본다.
        const listWidth = window.innerWidth - 12 * 2;
        // 카드 사이 간격 4px 둘, 목록 판 여백 합 10px (예: 390폭이면 (366 - 10 - 4 * 2) / 3 = 116)
        const cardWidth = Math.floor((listWidth - 10 - 4 * 2) / 3);
        await expect(cards[0]?.parentElement?.offsetWidth).toBe(listWidth);
        await expect(cards.map((card) => card.offsetWidth)).toEqual([
          cardWidth,
          cardWidth,
          cardWidth,
        ]);
      },
    );
  },
};
