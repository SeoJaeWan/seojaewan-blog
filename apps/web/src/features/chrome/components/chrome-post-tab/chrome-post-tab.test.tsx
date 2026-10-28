import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearPostBodyCache } from '@/features/chrome/hooks/use-post-body/use-post-body';
import type { ChromeTabPage } from '@/shared/utils/chrome-tabs/chrome-tabs';
import type { PostBlock } from '@/shared/utils/post-body/post-body';
import {
  createInitialWorkspace,
  type PostItem,
} from '@/shared/utils/workspace-rules/workspace-rules';

import { ChromePostTab } from './chrome-post-tab';

const workspace = createInitialWorkspace({
  posts: [
    { slug: 'old', title: '오래된 글', folderPath: [], date: '2026-01-01' },
    { slug: 'mid', title: '가운데 글', folderPath: ['React'], date: '2026-05-01' },
    { slug: 'new', title: '새 글', folderPath: [], date: '2026-10-01' },
  ],
  links: [],
});

/**
 * 글자만 있는 제목 블록을 만든다.
 * @param label 제목 글자
 * @returns 제목 블록
 */
function heading(label: string): PostBlock {
  return { type: 'heading_2', richText: [{ text: label, link: null }] };
}

const threeHeadings: readonly PostBlock[] = [heading('하나'), heading('둘'), heading('셋')];

const linkedBody: readonly PostBlock[] = [
  {
    type: 'paragraph',
    richText: [
      { text: '앞 글', link: '/posts/old' },
      { text: ' 그리고 ', link: null },
      { text: '바깥', link: 'https://example.com/' },
    ],
  },
  { type: 'code', language: 'ts', code: 'const a = 1;' },
];

const handleNavigate = vi.fn<(page: ChromeTabPage) => void>();
const handleReload = vi.fn();

/**
 * 서버 경로가 본문을 돌려주게 한다.
 * @param blocks 본문 블록. null이면 404다
 */
function mockBody(blocks: readonly PostBlock[] | null): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        blocks === null
          ? Response.json({ error: 'not-found' }, { status: 404 })
          : Response.json({ blocks }),
      ),
    ),
  );
}

/**
 * 가운데 글의 글 화면을 그린다.
 * @param layout 배치
 */
function renderPost(layout: 'wide' | 'narrow' = 'wide'): void {
  const post = workspace.items['post:mid'];
  if (post?.kind !== 'post') {
    throw new Error('글이 없다');
  }
  const item: PostItem = post;
  render(
    <ChromePostTab
      post={item}
      workspace={workspace}
      layout={layout}
      resolveLink={(href) =>
        href.startsWith('/posts/') ? { kind: 'post', slug: href.slice(7) } : null
      }
      onNavigate={handleNavigate}
      onReload={handleReload}
    />,
  );
}

/**
 * 제목 요소를 차례마다 500px 간격(첫 제목 100px)으로, 나머지 요소를 맨 위(0)에 놓는다. jsdom에는 그려진 자리가 없다.
 * 스크롤하면 스크롤한 만큼 위로 올라간다.
 */
function mockHeadingTops(): void {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rectOf(
    this: Element,
  ) {
    const match = /^heading-(\d+)$/u.exec(this.id);
    const container = this.closest('.overflow-y-auto');
    const scrollTop = container === null ? 0 : container.scrollTop;
    const top = match === null ? 0 : Number(match[1]) * 500 + 100 - scrollTop;
    return DOMRect.fromRect({ x: 0, y: top, width: 100, height: 20 });
  });
}

beforeEach(() => {
  clearPostBodyCache();
  handleNavigate.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// @codocs [[Chrome:글 화면]]
describe('Chrome:글 화면', () => {
  it('머리에 제목과 폴더 경로·작성일을 보인다', async () => {
    mockBody([]);
    renderPost();
    expect(await screen.findByRole('heading', { level: 1, name: '가운데 글' })).toBeVisible();
    expect(screen.getByText('Blog › React · 2026-05-01')).toBeVisible();
  });

  it('본문은 서버 경로에서 받아 그린다', async () => {
    mockBody(threeHeadings);
    renderPost();
    expect(await screen.findByRole('heading', { name: '하나' })).toBeVisible();
    expect(fetch).toHaveBeenCalledWith('/api/posts/mid');
  });

  it('본문을 받지 못하면 찾을 수 없음 화면이다', async () => {
    mockBody(null);
    renderPost();
    expect(
      await screen.findByText(
        '다음 웹 주소에 대한 웹페이지를 찾을 수 없습니다: seojaewan.com/posts/mid',
      ),
    ).toBeVisible();
  });

  it('제목이 3개 이상이면 넓은 창에 목차를 보인다', async () => {
    mockBody(threeHeadings);
    renderPost();
    expect(await screen.findByText('목차')).toBeVisible();
  });

  it('제목이 3개보다 적으면 목차를 보이지 않는다', async () => {
    mockBody([heading('하나'), heading('둘')]);
    renderPost();
    await screen.findByRole('heading', { name: '하나' });
    expect(screen.queryByText('목차')).not.toBeInTheDocument();
  });

  it('좁은 창의 목차는 처음에 접혀 있다', async () => {
    mockBody(threeHeadings);
    renderPost('narrow');
    expect(await screen.findByRole('button', { name: '목차' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('좁은 창의 접은 목차를 누르면 펼친다', async () => {
    mockBody(threeHeadings);
    renderPost('narrow');
    await userEvent.click(await screen.findByRole('button', { name: '목차' }));
    expect(screen.getByRole('button', { name: '셋' })).toBeVisible();
  });

  it('좁은 창의 펼친 목차 머리에서 Enter를 누르면 접는다', async () => {
    mockBody(threeHeadings);
    renderPost('narrow');
    await userEvent.click(await screen.findByRole('button', { name: '목차' }));
    screen.getByRole('button', { name: '목차' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByRole('button', { name: '셋' })).not.toBeInTheDocument();
  });

  it('좁은 창의 펼친 목차에서 항목을 고르면 접는다', async () => {
    mockBody(threeHeadings);
    renderPost('narrow');
    await userEvent.click(await screen.findByRole('button', { name: '목차' }));
    screen.getByRole('button', { name: '셋' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: '목차' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('첫 제목에 닿기 전에는 첫 목차 항목을 읽는 중으로 표시한다', async () => {
    mockHeadingTops();
    mockBody(threeHeadings);
    renderPost();
    expect(await screen.findByRole('button', { name: '하나' })).toHaveAttribute(
      'aria-current',
      'location',
    );
  });

  it('스크롤하면 지나온 마지막 제목의 목차 항목을 읽는 중으로 표시한다', async () => {
    mockHeadingTops();
    mockBody(threeHeadings);
    renderPost();
    const heading = await screen.findByRole('heading', { name: '둘' });
    const container = heading.closest('.overflow-y-auto');
    if (!(container instanceof HTMLElement)) {
      throw new Error('스크롤 상자가 없다');
    }
    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 3000 });
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 500 });
    container.scrollTop = 700;
    fireEvent.scroll(container);
    expect(screen.getByRole('button', { name: '둘' })).toHaveAttribute('aria-current', 'location');
  });

  it('목차 항목을 누르면 그 제목으로 스크롤한다', async () => {
    mockBody(threeHeadings);
    renderPost();
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
    await userEvent.click(await screen.findByRole('button', { name: '셋' }));
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole('heading', { name: '셋' }));
  });

  it('다른 글 링크를 누르면 같은 탭에서 그 글로 간다', async () => {
    mockBody(linkedBody);
    renderPost();
    await userEvent.click(await screen.findByRole('link', { name: '앞 글' }));
    expect(handleNavigate).toHaveBeenCalledWith({ kind: 'post', slug: 'old' });
  });

  it('외부 링크는 실제 브라우저의 새 탭(noopener)에서 연다', async () => {
    mockBody(linkedBody);
    renderPost();
    const external = await screen.findByRole('link', { name: '바깥' });
    expect(external).toHaveAttribute('target', '_blank');
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('코드 블록의 복사 버튼은 코드를 클립보드에 복사한다', async () => {
    mockBody(linkedBody);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    renderPost();
    await userEvent.click(await screen.findByRole('button', { name: '코드 복사' }));
    expect(writeText).toHaveBeenCalledWith('const a = 1;');
  });

  it('이전 글 카드를 누르면 작성일이 앞선 글로 간다', async () => {
    mockBody([]);
    renderPost();
    await userEvent.click(await screen.findByRole('button', { name: /이전 글/ }));
    expect(handleNavigate).toHaveBeenCalledWith({ kind: 'post', slug: 'old' });
  });

  it('다음 글 카드를 누르면 작성일이 뒤인 글로 간다', async () => {
    mockBody([]);
    renderPost();
    await userEvent.click(await screen.findByRole('button', { name: /다음 글/ }));
    expect(handleNavigate).toHaveBeenCalledWith({ kind: 'post', slug: 'new' });
  });
});
