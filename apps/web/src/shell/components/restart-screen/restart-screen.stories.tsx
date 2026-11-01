import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { installStoryClock } from '@/features/taskbar/components/taskbar-apps-layer/story-clock';
import { useRestartStore } from '@/shared/stores/restart-store/restart-store';
import { resetStoryStores } from '@/shared/stores/store-reset/story-stores';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { readCssTimeVariable } from '@/shared/utils/motion-time/motion-time';
import { Shell } from '@/shell/shell';
import { SHELL_STORY_POSTS, WINDOW_STORY_A11Y } from '@/shell/story-data';
import { chooseRestartInStory } from '@/shell/story-restart';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 재부팅 화면은 앱 화면 전체(Shell)를 다시 시작할 때 덮으므로 Shell을 실제 저장소로 그린다.
// 전원 메뉴의 다시 시작을 누르면 재부팅 화면이 덮고, 정해진 시간 동안 보인 뒤 처음 상태의 바탕화면을 드러낸다.
const meta = {
  title: 'Features/Shell/RestartScreen',
  component: Shell,
  parameters: { layout: 'fullscreen', a11y: WINDOW_STORY_A11Y },
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
      await userEvent.click(body.getByRole('button', { name: 'Chrome' }));
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
