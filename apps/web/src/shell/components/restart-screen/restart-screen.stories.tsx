import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { installStoryClock } from '@/features/taskbar/components/taskbar-apps-layer/story-clock';
import { useRestartStore } from '@/shared/stores/restart-store/restart-store';
import { resetStoryStores } from '@/shared/stores/store-reset/story-stores';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { readCssTimeVariable } from '@/shared/utils/motion-time/motion-time';
import { pageLoadRestartState } from '@/shared/utils/restart-rules/restart-rules';
import { Shell } from '@/shell/shell';
import { SHELL_STORY_POSTS } from '@/shell/story-data';
import { chooseRestartInStory } from '@/shell/story-restart';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 재부팅 화면은 앱 화면 전체(Shell)를 다시 시작할 때 덮으므로 Shell을 실제 저장소로 그린다.
// 전원 메뉴의 다시 시작을 누르면 재부팅 화면이 덮고, 정해진 시간 동안 보인 뒤 처음 상태의 바탕화면을 드러낸다.
// 사이트를 처음 불러올 때도 같은 화면이 덮고 있다가, 화면 크기를 알고 첫 창을 열면 바로 걷힌다.
const meta = {
  title: 'Features/Shell/RestartScreen',
  component: Shell,
  parameters: { layout: 'fullscreen' },
  args: { posts: SHELL_STORY_POSTS },
  beforeEach: resetStoryStores,
} satisfies Meta<typeof Shell>;

export default meta;

type Story = StoryObj<typeof meta>;

// 재부팅 화면을 보여 주는 시간 토큰
const BOOT_SCREEN_DELAY = '--motion-delay-boot-screen';

/** 열린 Chrome 창이 있을 때 다시 시작한다. 재부팅 화면이 덮은 뒤 창이 모두 닫히고, 정해진 시간 뒤에 사라진다 */
export const RestartWithOpenWindow: Story = {
  play: async ({ canvasElement, step }) => {
    const documentBody = canvasElement.ownerDocument.body;
    const body = within(documentBody);
    const clock = installStoryClock([readCssTimeVariable(BOOT_SCREEN_DELAY)]);
    // 나타나는 애니메이션을 멈춰 두는 스타일. 덮기 전의 모습을 흔들림 없이 확인하려고 잠깐 단다.
    const hold = documentBody.ownerDocument.createElement('style');
    hold.textContent = '.motion-boot-screen-enter { animation-play-state: paused !important; }';

    /**
     * Chrome 창을 찾는다.
     * @returns Chrome 창, 없으면 null
     */
    function queryChromeWindow(): HTMLElement | null {
      return body.queryByRole('region', { name: '새 탭 - Chrome' });
    }

    /**
     * 재부팅 화면의 진행 링을 찾는다.
     * @returns 진행 링, 없으면 null
     */
    function queryBootScreen(): HTMLElement | null {
      return body.queryByRole('progressbar', { name: '다시 시작하는 중' });
    }

    try {
      await userEvent.click(body.getByRole('button', { name: 'Google Chrome' }));
      await expect(await body.findByRole('region', { name: '새 탭 - Chrome' })).toBeInTheDocument();

      // @codocs [[다시 시작:순서]]
      await step('재부팅 화면이 다 덮기 전에는 창이 남아 있고, 다 덮은 뒤에 지운다', async () => {
        documentBody.ownerDocument.head.append(hold);

        await chooseRestartInStory(documentBody);

        await expect(
          await body.findByRole('progressbar', { name: '다시 시작하는 중' }),
        ).toBeInTheDocument();
        await expect(queryChromeWindow()).toBeInTheDocument();
        await expect(useRestartStore.getState().phase).toBe('covering');

        hold.remove();
        await waitFor(() => expect(useRestartStore.getState().phase).toBe('showing'));
        await expect(queryChromeWindow()).not.toBeInTheDocument();
        await expect(useWindowStore.getState().order).toHaveLength(0);
      });

      // @codocs [[다시 시작:순서]]
      await step(
        '다시 시작하면 메뉴와 Start가 닫히고 재부팅 화면이 덮은 뒤 열린 창이 모두 닫힌다',
        async () => {
          await expect(body.queryByRole('menuitem', { name: '다시 시작' })).not.toBeInTheDocument();
          await expect(body.queryByRole('dialog', { name: '시작' })).not.toBeInTheDocument();
          await expect(queryBootScreen()).toBeInTheDocument();
          await expect(queryChromeWindow()).not.toBeInTheDocument();
        },
      );

      // @codocs [[다시 시작:순서]]
      await step(
        '재부팅 화면은 정해진 시간 동안 보이다가 사라지고, 처음 상태의 바탕화면이 남는다',
        async () => {
          const delay = readCssTimeVariable(BOOT_SCREEN_DELAY);

          clock.tick(delay - 1);
          await expect(queryBootScreen()).toBeInTheDocument();
          await expect(useRestartStore.getState().phase).toBe('showing');

          clock.tick(1);
          await waitFor(() => expect(queryBootScreen()).not.toBeInTheDocument());
          await expect(useRestartStore.getState().phase).toBe('idle');
          await expect(body.getByRole('main', { name: '바탕화면' })).toBeInTheDocument();
        },
      );
    } finally {
      hold.remove();
      clock.restore();
    }
  },
};

// 사라지는 애니메이션을 멈춰 두는 스타일. 걷히는 도중의 모습을 흔들림 없이 확인하려고 잠깐 단다.
const HOLD_EXIT_STYLE = '.motion-boot-screen-exit { animation-play-state: paused !important; }';

/** 사이트를 처음 불러온 화면. 재부팅 화면이 덮은 채 시작해, 정해진 시간을 기다리지 않고 바로 걷힌다 */
export const PageLoad: Story = {
  beforeEach: () => {
    // 처음 불러온 상태로 그린다. 사라지는 애니메이션은 그리기 전부터 멈춰 두어 걷히는 도중을 붙든다.
    useRestartStore.setState(pageLoadRestartState);
    const hold = document.createElement('style');
    hold.textContent = HOLD_EXIT_STYLE;
    document.head.append(hold);
    return () => {
      hold.remove();
    };
  },
  play: async ({ canvasElement, step }) => {
    const documentBody = canvasElement.ownerDocument.body;
    const body = within(documentBody);
    const desktop = body.getByRole('main', { name: '바탕화면' });

    // @codocs [[창 동작:새로고침과 첫 진입]]
    await step(
      '화면 크기를 알면 정해진 시간을 기다리지 않고 바로 걷히기 시작하고, 걷히는 동안 바탕화면은 조작할 수 없다(inert)',
      async () => {
        await waitFor(() => expect(useRestartStore.getState().phase).toBe('revealing'));
        await expect(body.getByRole('progressbar', { name: '시작하는 중' })).toBeInTheDocument();
        await expect(
          documentBody.querySelector('[data-boot-screen-fallback] .motion-boot-screen-exit'),
        ).not.toBeNull();
        await expect(
          body.getByRole('button', { name: 'Google Chrome' }).closest('[inert]'),
        ).not.toBeNull();
      },
    );

    // @codocs [[창 동작:새로고침과 첫 진입]]
    // @codocs [[접근성:포커스]]
    await step(
      '다 걷히면 재부팅 화면과 안전장치 틀이 빠지고, 바탕화면을 조작할 수 있으며 포커스가 바탕화면에 있다',
      async () => {
        for (const style of documentBody.ownerDocument.head.querySelectorAll('style')) {
          if (style.textContent === HOLD_EXIT_STYLE) {
            style.remove();
          }
        }
        await waitFor(() => expect(useRestartStore.getState().phase).toBe('idle'));
        await expect(body.queryByRole('progressbar')).not.toBeInTheDocument();
        await expect(documentBody.querySelector('[data-boot-screen-fallback]')).toBeNull();
        await expect(
          body.getByRole('button', { name: 'Google Chrome' }).closest('[inert]'),
        ).toBeNull();
        await expect(desktop).toHaveFocus();
      },
    );
  },
};
