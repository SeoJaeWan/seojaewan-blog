import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, spyOn, userEvent, waitFor, within } from 'storybook/test';

import type { ChromeTabPage } from '@/shared/utils/chrome-tabs/chrome-tabs';

import { ChromePostTab } from './chrome-post-tab';
import { fullBody, midPost, noHeadingBody, postTabWorkspace } from './story-data';
import { getPostBodyRequests, mockPostBodies } from './story-fetch';

/**
 * 링크 주소가 블로그 글이면 그 글 페이지를 돌려준다.
 * @param href 링크 주소
 * @returns 글 페이지. 외부 주소면 null
 */
function resolveStoryLink(href: string): ChromeTabPage | null {
  return href.startsWith('/posts/') ? { kind: 'post', slug: href.slice(7) } : null;
}

// @codocs [[테스트 작성 규칙:스토리 테스트]]
// 동작 스토리다. 글 본문은 서버 경로에서 받으므로 `fetch`를 가짜로 바꿔 상황마다의 본문을 준다.
const meta = {
  title: 'Behavior/Chrome/ChromePostTab',
  component: ChromePostTab,
  args: {
    post: midPost,
    workspace: postTabWorkspace,
    layout: 'wide',
    resolveLink: resolveStoryLink,
    onNavigate: fn(),
    onReload: fn(),
  },
  render: (args) => (
    <div className="flex h-569 w-size-post-width">
      <ChromePostTab {...args} />
    </div>
  ),
} satisfies Meta<typeof ChromePostTab>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[Chrome:글 화면]]
/** 넓은 창에서 글을 읽는다: 머리, 목차, 읽는 위치, 링크, 코드 복사, 이전·다음 글 */
export const Wide: Story = {
  beforeEach: () => mockPostBodies({ mid: fullBody }),
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('heading', { name: '하나' });

    await step('머리에 제목과 폴더 경로·작성일을 보인다', async () => {
      await expect(canvas.getByRole('heading', { level: 1, name: '가운데 글' })).toBeVisible();
      await expect(canvas.getByText('Blog › React · 2026-05-01')).toBeVisible();
    });

    await step('본문은 서버 경로에서 받아 그린다', async () => {
      await expect(getPostBodyRequests()).toContain('/api/posts/mid');
    });

    await step('제목이 1개 이상이면 넓은 창에 목차를 보인다', async () => {
      await expect(canvas.getByText('목차')).toBeVisible();
    });

    await step('첫 제목에 닿기 전에는 첫 목차 항목을 읽는 중으로 표시한다', async () => {
      await expect(canvas.getByRole('button', { name: '하나' })).toHaveAttribute(
        'aria-current',
        'location',
      );
    });

    await step('스크롤하면 지나온 마지막 제목의 목차 항목을 읽는 중으로 표시한다', async () => {
      const second = canvas.getByRole('heading', { name: '둘' });
      const container = second.closest('.overflow-y-auto');
      if (!(container instanceof HTMLElement)) {
        throw new Error('스크롤 상자가 없다');
      }
      container.scrollTop =
        second.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop;
      await waitFor(async () => {
        await expect(canvas.getByRole('button', { name: '둘' })).toHaveAttribute(
          'aria-current',
          'location',
        );
      });
    });

    await step('목차 항목을 누르면 그 제목으로 스크롤한다', async () => {
      const third = canvas.getByRole('heading', { name: '셋' });
      const container = third.closest('.overflow-y-auto');
      if (!(container instanceof HTMLElement)) {
        throw new Error('스크롤 상자가 없다');
      }
      const before = container.scrollTop;
      await userEvent.click(canvas.getByRole('button', { name: '셋' }));
      await waitFor(async () => {
        await expect(container.scrollTop).toBeGreaterThan(before);
        await expect(canvas.getByRole('button', { name: '셋' })).toHaveAttribute(
          'aria-current',
          'location',
        );
      });
    });

    await step('다른 글 링크를 누르면 같은 탭에서 그 글로 간다', async () => {
      await userEvent.click(canvas.getByRole('link', { name: '앞 글' }));
      await expect(args.onNavigate).toHaveBeenLastCalledWith({ kind: 'post', slug: 'old' });
    });

    await step('외부 링크는 실제 브라우저의 새 탭(noopener)에서 연다', async () => {
      const external = canvas.getByRole('link', { name: '바깥' });
      await expect(external).toHaveAttribute('target', '_blank');
      await expect(external).toHaveAttribute('rel', 'noopener noreferrer');
    });

    await step('코드 블록의 복사 버튼은 코드를 클립보드에 복사한다', async () => {
      const writeText = spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
      await userEvent.click(canvas.getByRole('button', { name: '코드 복사' }));
      await expect(writeText).toHaveBeenCalledWith('const a = 1;');
    });

    await step('이전 글 카드를 누르면 작성일이 앞선 글로 간다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: /이전 글/ }));
      await expect(args.onNavigate).toHaveBeenLastCalledWith({ kind: 'post', slug: 'old' });
    });

    await step('다음 글 카드를 누르면 작성일이 뒤인 글로 간다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: /다음 글/ }));
      await expect(args.onNavigate).toHaveBeenLastCalledWith({ kind: 'post', slug: 'new' });
    });
  },
};

// @codocs [[Chrome:글 화면]]
/** 좁은 창에서 글을 읽는다: 목차는 처음에 접혀 있고 눌러 펼친다 */
export const Narrow: Story = {
  args: { layout: 'narrow' },
  beforeEach: () => mockPostBodies({ mid: fullBody }),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    // 펼치면 목차 머리를 다시 그리므로 누를 때마다 다시 찾는다.
    /**
     * 목차 머리 버튼.
     * @returns 목차 머리 버튼
     */
    function getToc(): HTMLElement {
      return canvas.getByRole('button', { name: '목차' });
    }
    await canvas.findByRole('button', { name: '목차' });

    await step('좁은 창의 목차는 처음에 접혀 있다', async () => {
      await expect(getToc()).toHaveAttribute('aria-expanded', 'false');
    });

    await step('접은 목차를 누르면 펼친다', async () => {
      await userEvent.click(getToc());
      await expect(getToc()).toHaveAttribute('aria-expanded', 'true');
      await expect(canvas.getByRole('button', { name: '셋' })).toBeVisible();
    });

    await step('펼친 목차 머리에서 Enter를 누르면 접는다', async () => {
      getToc().focus();
      await userEvent.keyboard('{Enter}');
      await expect(canvas.queryByRole('button', { name: '셋' })).not.toBeInTheDocument();
    });

    await step('펼친 목차에서 항목을 고르면 접는다', async () => {
      await userEvent.click(getToc());
      canvas.getByRole('button', { name: '셋' }).focus();
      await userEvent.keyboard('{Enter}');
      await expect(getToc()).toHaveAttribute('aria-expanded', 'false');
    });
  },
};

// @codocs [[Chrome:글 화면]]
/** 제목이 없는 글은 목차를 보이지 않는다 */
export const NoHeadings: Story = {
  beforeEach: () => mockPostBodies({ mid: noHeadingBody }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('link', { name: '앞 글' });
    await expect(canvas.queryByText('목차')).not.toBeInTheDocument();
  },
};

// @codocs [[Chrome:글 화면]]
/** 본문을 받지 못하면 찾을 수 없음 화면을 보인다 */
export const BodyFailed: Story = {
  beforeEach: () => mockPostBodies({ mid: null }),
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(
        '다음 웹 주소에 대한 웹페이지를 찾을 수 없습니다: seojaewan.com/posts/mid',
      ),
    ).toBeVisible();
  },
};
