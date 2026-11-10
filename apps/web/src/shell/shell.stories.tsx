import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { installStoryClock } from '@/features/taskbar/components/taskbar-apps-layer/story-clock';
import { useRestartStore } from '@/shared/stores/restart-store/restart-store';
import { resetStoryStores } from '@/shared/stores/store-reset/story-stores';
import { readCssTimeVariable } from '@/shared/utils/motion-time/motion-time';

import { Shell } from './shell';
import { SHELL_STORY_POSTS } from './story-data';
import { chooseRestartInStory } from './story-restart';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 앱 화면 전체(바탕화면·창·패널·작업 표시줄·재부팅 화면)를 실제 저장소로 그린다.
// Start 버튼을 누르면 Start 메뉴가 열리고, 앱을 열면 창이 생기며, 전원 메뉴의 다시 시작이 동작한다.
// 글 색인은 서버 대신 스토리 데이터로 넘기고, 작업 공간은 브라우저 저장분(localStorage)을 읽어 되살린다.
const meta = {
  title: 'Features/Shell/Shell',
  component: Shell,
  parameters: { layout: 'fullscreen' },
  args: { posts: SHELL_STORY_POSTS },
  beforeEach: resetStoryStores,
} satisfies Meta<typeof Shell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * 바탕화면의 Blog 폴더 아이콘을 더블클릭한다. 아이콘은 창보다 앞(DOM 순서)에 있다.
 * @param documentBody 스토리가 그려진 문서의 body
 */
async function openBlogFolder(documentBody: HTMLElement): Promise<void> {
  const [icon] = within(documentBody).getAllByText('Blog');
  await userEvent.dblClick(icon ?? documentBody);
}

/** 처음 화면. 바탕화면 항목을 보이고, 작업 표시줄 앱 버튼으로 창을 열고 최소화·복원한다 */
export const DesktopAndTaskbar: Story = {
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);

    // @codocs [[바탕화면:표시하는 항목]]
    // @codocs [[항목과 폴더:외부 링크]]
    await step(
      '처음에는 바탕화면에 휴지통, Blog 폴더, 외부 링크(GitHub)가 보이고, 주소를 비운 이력서는 보이지 않는다',
      async () => {
        const desktop = body.getByRole('main', { name: '바탕화면' });
        for (const name of ['휴지통', 'Blog', 'GitHub']) {
          await expect(within(desktop).getByText(name)).toBeInTheDocument();
        }
        await expect(within(desktop).queryByText('이력서')).not.toBeInTheDocument();
      },
    );

    // @codocs [[작업 표시줄:앱 버튼]]
    await step('열린 창이 없을 때 누르면 탐색기는 바탕 화면 위치로 연다', async () => {
      await userEvent.click(body.getByRole('button', { name: '파일 탐색기' }));

      const region = await body.findByRole('region', { name: '바탕 화면 - 파일 탐색기' });
      await expect(within(region).getAllByText('바탕 화면').length).toBeGreaterThan(0);
    });

    // @codocs [[작업 표시줄:앱 버튼]]
    await step('창이 1개이고 맨 앞이면 최소화하고, 다시 누르면 복원한다', async () => {
      const button = body.getByRole('button', { name: 'Chrome' });
      await userEvent.click(button);
      await expect(await body.findByRole('region', { name: '새 탭 - Chrome' })).toBeInTheDocument();

      await userEvent.click(button);
      await waitFor(() =>
        expect(body.queryByRole('region', { name: '새 탭 - Chrome' })).not.toBeInTheDocument(),
      );

      await userEvent.click(button);
      await expect(await body.findByRole('region', { name: '새 탭 - Chrome' })).toBeInTheDocument();
    });
  },
};

/** Blog 탐색기 창 둘을 연 채 작업 표시줄 버튼을 눌러 창 미리보기를 연다 */
export const WindowPreview: Story = {
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);
    await openBlogFolder(canvasElement.ownerDocument.body);
    await openBlogFolder(canvasElement.ownerDocument.body);
    await body.findAllByRole('region', { name: 'Blog - 파일 탐색기' });
    await waitFor(() =>
      expect(body.getAllByRole('region', { name: 'Blog - 파일 탐색기' })).toHaveLength(2),
    );
    const [first] = body.getAllByRole('region', { name: 'Blog - 파일 탐색기' });

    // @codocs [[작업 표시줄:창 미리보기]]
    await step(
      '창이 여러 개일 때 누르면 미리보기를 띄우고, 고른 창을 맨 앞으로 가져온다',
      async () => {
        await expect(first).toHaveAttribute('data-window-state', 'inactive');
        await userEvent.click(body.getByRole('button', { name: '파일 탐색기' }));
        const previews = await body.findAllByRole('button', { name: 'Blog - 파일 탐색기' });
        await expect(previews).toHaveLength(2);

        await userEvent.click(previews[0] ?? document.body);

        await waitFor(() => expect(first).toHaveAttribute('data-window-state', 'active'));
        await waitFor(() =>
          expect(body.queryAllByRole('button', { name: 'Blog - 파일 탐색기' })).toHaveLength(0),
        );
      },
    );

    // @codocs [[작업 표시줄:창 미리보기]]
    await step('미리보기의 닫기 버튼을 누르면 그 창을 닫는다', async () => {
      await userEvent.click(body.getByRole('button', { name: '파일 탐색기' }));
      const [preview] = await body.findAllByRole('button', { name: 'Blog - 파일 탐색기' });

      // 닫기 버튼은 마우스 전용이라 보조 기술에 숨겨져 역할 이름이 없다
      await userEvent.click(within(preview ?? document.body).getByLabelText('창 닫기'));

      await waitFor(() =>
        expect(body.getAllByRole('region', { name: 'Blog - 파일 탐색기' })).toHaveLength(1),
      );
    });
  },
};

/** Start 버튼으로 Start 메뉴를 열고 닫는다. Esc·바깥 클릭·항목 열기가 닫고, 전원 메뉴는 Esc로 먼저 닫힌다 */
export const StartMenu: Story = {
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);
    const startButton = body.getByRole('button', { name: '시작' });

    /** 열린 Start 메뉴가 닫힐 때까지 기다린다. */
    async function expectStartClosed(): Promise<void> {
      await waitFor(() =>
        expect(body.queryByRole('dialog', { name: '시작' })).not.toBeInTheDocument(),
      );
    }

    // @codocs [[Start 메뉴:열기와 닫기]]
    await step('Start 버튼을 누르면 Start 메뉴가 열리고, 다시 누르면 닫힌다', async () => {
      await expect(body.queryByRole('dialog', { name: '시작' })).not.toBeInTheDocument();

      await userEvent.click(startButton);
      await expect(await body.findByRole('dialog', { name: '시작' })).toBeInTheDocument();
      await expect(startButton).toHaveAttribute('aria-expanded', 'true');

      await userEvent.click(startButton);
      await expectStartClosed();
      await expect(startButton).toHaveAttribute('aria-expanded', 'false');
    });

    // @codocs [[Start 메뉴:열기와 닫기]]
    // @codocs [[접근성:포커스]]
    await step('Esc를 누르면 닫히고 포커스는 Start 버튼으로 돌아간다', async () => {
      await userEvent.click(startButton);
      await body.findByRole('dialog', { name: '시작' });

      await userEvent.keyboard('{Escape}');

      await expectStartClosed();
      await waitFor(() => expect(startButton).toHaveFocus());
    });

    // @codocs [[접근성:역할]]
    await step('포커스가 패널 밖으로 나가면 닫힌다', async () => {
      await userEvent.click(startButton);
      await body.findByRole('dialog', { name: '시작' });

      canvasElement.ownerDocument
        .querySelector<HTMLElement>('[data-taskbar-app="chrome"]')
        ?.focus();

      await expectStartClosed();
    });

    // @codocs [[Start 메뉴:열기와 닫기]]
    await step(
      'Start 버튼을 다시 누르면 닫히고 작업 표시줄 검색칸을 누르면 검색 패널로 바뀐다',
      async () => {
        await userEvent.click(startButton);
        await body.findByRole('dialog', { name: '시작' });
        await userEvent.click(startButton);
        await expectStartClosed();

        await userEvent.click(startButton);
        await body.findByRole('dialog', { name: '시작' });
        await userEvent.click(body.getByRole('searchbox', { name: '검색' }));
        await expect(await body.findByRole('dialog', { name: '검색' })).toBeInTheDocument();
        await expectStartClosed();
        await userEvent.keyboard('{Escape}');
        await waitFor(() =>
          expect(body.queryByRole('dialog', { name: '검색' })).not.toBeInTheDocument(),
        );
      },
    );

    // @codocs [[Start 메뉴:열기와 닫기]]
    await step('바깥을 클릭하면 닫히고, 패널 안을 클릭하면 닫히지 않는다', async () => {
      await userEvent.click(startButton);
      const panel = await body.findByRole('dialog', { name: '시작' });

      await userEvent.click(within(panel).getByText('고정됨'));
      await expect(body.getByRole('dialog', { name: '시작' })).toBeInTheDocument();

      await userEvent.click(body.getByText('휴지통'));
      await expectStartClosed();
    });

    // @codocs [[Start 메뉴:열기와 닫기]]
    await step('항목을 열면 닫힌다', async () => {
      await userEvent.click(startButton);
      const panel = await body.findByRole('dialog', { name: '시작' });
      // 고정됨 칸과 모두 목록의 줄에 같은 이름이 있어, DOM 순서가 앞인 고정됨 칸을 누른다
      const [pinnedChrome] = within(panel).getAllByRole('button', { name: 'Chrome' });

      await userEvent.click(pinnedChrome ?? document.body);

      await expectStartClosed();
    });

    // @codocs [[Start 메뉴:열기와 닫기]]
    await step('Start 메뉴에서 앱 항목을 열면 그 앱 창이 열리고 Start 메뉴는 닫힌다', async () => {
      await userEvent.click(startButton);
      const panel = await body.findByRole('dialog', { name: '시작' });
      const [pinnedExplorer] = within(panel).getAllByRole('button', { name: 'File Explorer' });

      await userEvent.click(pinnedExplorer ?? document.body);

      const region = await body.findByRole('region', { name: '바탕 화면 - 파일 탐색기' });
      await expectStartClosed();

      // @codocs [[접근성:포커스]]
      await waitFor(() => expect(region).toContainElement(document.activeElement as HTMLElement));
    });

    // @codocs [[Start 메뉴:열기와 닫기]]
    await step('전원 메뉴가 열려 있을 때 Esc를 누르면 전원 메뉴만 닫힌다', async () => {
      await userEvent.click(startButton);
      const panel = await body.findByRole('dialog', { name: '시작' });
      await userEvent.click(within(panel).getByRole('button', { name: '전원' }));
      await expect(await body.findByRole('menuitem', { name: '다시 시작' })).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');

      await waitFor(() =>
        expect(body.queryByRole('menuitem', { name: '다시 시작' })).not.toBeInTheDocument(),
      );
      await expect(body.getByRole('dialog', { name: '시작' })).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');
      await expectStartClosed();
    });
  },
};

/** 작업 표시줄 검색칸에 포커스해 검색 패널을 연다. Start가 열려 있으면 닫고, Esc·바깥 클릭이 닫는다 */
export const Search: Story = {
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);

    /** 검색 패널이 닫힐 때까지 기다린다. */
    async function expectSearchClosed(): Promise<void> {
      await waitFor(() =>
        expect(body.queryByRole('dialog', { name: '검색' })).not.toBeInTheDocument(),
      );
    }

    // @codocs [[검색:개요]]
    await step(
      '작업 표시줄 검색칸에 포커스하면 검색 패널이 열린다. Start가 열려 있었으면 닫힌다',
      async () => {
        await userEvent.click(body.getByRole('button', { name: '시작' }));
        await body.findByRole('dialog', { name: '시작' });

        await userEvent.click(body.getByRole('searchbox', { name: '검색' }));

        await expect(await body.findByRole('dialog', { name: '검색' })).toBeInTheDocument();
        await waitFor(() =>
          expect(body.queryByRole('dialog', { name: '시작' })).not.toBeInTheDocument(),
        );
      },
    );

    // @codocs [[검색:개요]]
    await step(
      '데스크톱 검색 패널은 왼쪽 끝을 작업 표시줄 검색 상자의 왼쪽 끝에 맞춘다',
      async () => {
        const panel = await body.findByRole('dialog', { name: '검색' });
        const searchBox = canvasElement.ownerDocument.querySelector(
          '[data-search-panel-anchor] > *',
        );
        // 여는 움직임은 세로로만 옮기므로 왼쪽 끝은 움직이는 동안에도 같다.
        await expect(Math.round(panel.getBoundingClientRect().left)).toBe(
          Math.round(searchBox?.getBoundingClientRect().left ?? Number.NaN),
        );
      },
    );

    // @codocs [[검색:결과 화면]]
    // @codocs [[접근성:포커스]]
    await step('Esc를 누르면 닫히고 포커스는 검색칸에 남는다', async () => {
      await userEvent.keyboard('{Escape}');

      await expectSearchClosed();
      await expect(body.getByRole('searchbox', { name: '검색' })).toHaveFocus();
    });

    // @codocs [[접근성:포커스]]
    await step('작업 표시줄 검색칸에서 Tab을 누르면 패널 안 첫 항목으로 간다', async () => {
      await userEvent.click(body.getByRole('searchbox', { name: '검색' }));
      const panel = await body.findByRole('dialog', { name: '검색' });
      await userEvent.tab();
      await expect(panel).toContainElement(document.activeElement as HTMLElement);
      await userEvent.keyboard('{Escape}');
      await expectSearchClosed();
    });

    // @codocs [[접근성:역할]]
    await step('포커스가 검색칸에서 패널 밖으로 나가면 닫힌다', async () => {
      await userEvent.click(body.getByRole('searchbox', { name: '검색' }));
      await body.findByRole('dialog', { name: '검색' });

      body.getByRole('button', { name: 'Chrome' }).focus();

      await expectSearchClosed();
    });

    // @codocs [[검색:결과 화면]]
    await step('바깥을 클릭하면 닫힌다', async () => {
      await userEvent.click(body.getByRole('searchbox', { name: '검색' }));
      await body.findByRole('dialog', { name: '검색' });

      await userEvent.click(body.getByText('휴지통'));

      await expectSearchClosed();
    });
  },
};

/** 전원 메뉴의 다시 시작을 누른다. 재부팅 화면이 덮는 동안 바탕화면은 조작할 수 없고(inert), 끝나면 포커스가 바탕화면으로 돌아온다 */
export const Restart: Story = {
  play: async ({ canvasElement, step }) => {
    const documentBody = canvasElement.ownerDocument.body;
    const body = within(documentBody);
    const desktop = body.getByRole('main', { name: '바탕화면' });
    const clock = installStoryClock([readCssTimeVariable('--motion-delay-boot-screen')]);
    try {
      // @codocs [[다시 시작:초기화 방법]]
      // @codocs [[다시 시작:순서]]
      await step(
        '다시 시작하는 동안 바탕화면 하위 트리는 조작할 수 없고(inert), 끝나면 다시 조작할 수 있다',
        async () => {
          await expect(body.getByRole('button', { name: 'Chrome' }).closest('[inert]')).toBeNull();

          await chooseRestartInStory(documentBody);
          await waitFor(() => expect(useRestartStore.getState().phase).toBe('showing'));
          await expect(
            body.getByRole('button', { name: 'Chrome' }).closest('[inert]'),
          ).not.toBeNull();

          clock.tick(readCssTimeVariable('--motion-delay-boot-screen'));
          await waitFor(() => expect(useRestartStore.getState().phase).toBe('idle'));
          await expect(body.getByRole('button', { name: 'Chrome' }).closest('[inert]')).toBeNull();
        },
      );

      // @codocs [[다시 시작:순서]]
      await step('다시 시작이 끝나면 포커스를 바탕화면(main)으로 옮긴다', async () => {
        await expect(desktop).toHaveFocus();
      });
    } finally {
      clock.restore();
    }
  },
};
