import pageExport from '@figma/patterns/chrome/page/export.json';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';

import { ImageAsset, ListItem } from '@seojaewan/design-system';
import { figmaFrame } from '@seojaewan/design-system/story';

import { POST_PAGE, postPageBlocks } from '@/features/chrome/components/chrome-page/story-data';
import { PostBlocks } from '@/features/chrome/components/post-blocks/post-blocks';

import { ChromePage } from './chrome-page';
import { NEW_TAB_LATEST_POSTS, NOT_FOUND_URL, SEARCH_RESULTS } from './story-data';

// 피그마 Chrome/Page의 변형 속성 값이다(정규화한 이름).
const PAGES = ['post', 'new-tab', 'search-results', 'not-found'] as const;
const LAYOUTS = ['wide', 'narrow'] as const;

type FigmaArgs = {
  page: (typeof PAGES)[number];
  layout: (typeof LAYOUTS)[number];
};

/**
 * 변형에 맞는 페이지를 피그마 조립과 같은 데이터로 그린다.
 * @param args 변형 속성
 * @returns ChromePage
 */
function renderPage(args: FigmaArgs): JSX.Element {
  switch (args.page) {
    case 'post': {
      return (
        <ChromePage
          page="post"
          layout={args.layout}
          cover={<ImageAsset name="images/wallpaper-bloom" />}
          meta={POST_PAGE.meta}
          title={POST_PAGE.title}
          toc={POST_PAGE.toc}
          previousTitle={POST_PAGE.previousTitle}
          nextTitle={POST_PAGE.nextTitle}
        >
          <PostBlocks
            blocks={postPageBlocks[args.layout]}
            renderImage={() => <ImageAsset name="images/wallpaper-bloom" />}
          />
        </ChromePage>
      );
    }
    case 'new-tab': {
      return (
        <ChromePage
          page="new-tab"
          layout={args.layout}
          latestPosts={NEW_TAB_LATEST_POSTS.map((title) => ({ title }))}
        />
      );
    }
    case 'search-results': {
      return (
        <ChromePage
          page="search-results"
          layout={args.layout}
          query={SEARCH_RESULTS.query}
          results={SEARCH_RESULTS.results}
        />
      );
    }
    case 'not-found': {
      return <ChromePage page="not-found" layout={args.layout} url={NOT_FOUND_URL} />;
    }
  }
}

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 이 제목이 피그마 조립과 짝이다.
// 본문은 크기를 갖지 않고 창이 정하므로 FigmaFrame이 피그마 원본 크기(size/chrome-page/*)로 감싼다.
const meta = {
  title: 'Patterns/Chrome/Page',
  args: { page: 'post', layout: 'wide' },
  argTypes: {
    page: { control: 'inline-radio', options: PAGES },
    layout: { control: 'inline-radio', options: LAYOUTS },
  },
  decorators: [figmaFrame(pageExport)],
  render: renderPage,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

const handleResultOpen = fn();
const handleLatestPostOpen = fn();
const handleImageOpen = fn();
const handleTocItemSelect = fn();

/**
 * 요소에 실제로 적용된 마우스 커서 모양을 읽는다.
 * @param element 요소
 * @returns CSS cursor 값
 */
function getCursor(element: Element): string {
  return getComputedStyle(element).cursor;
}

// @codocs [[디자인 시스템:커서]]
/** 검색 결과 줄은 손가락 커서고, 같은 ListItem을 쓰는 Windows 화면 줄은 화살표 그대로다 */
export const SearchResultsCursor: Story = {
  args: { page: 'search-results' },
  render: () => (
    <>
      <ChromePage
        page="search-results"
        query={SEARCH_RESULTS.query}
        results={SEARCH_RESULTS.results}
        onResultOpen={handleResultOpen}
      />
      <ListItem
        role="button"
        tabIndex={0}
        title="Windows 화면 줄"
        icon={<ImageAsset name="images/file-document" />}
      />
    </>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      getCursor(canvas.getByRole('button', { name: /리액트 서버 컴포넌트 이해하기/ })),
    ).toBe('pointer');
    await expect(getCursor(canvas.getByRole('button', { name: /Windows 화면 줄/ }))).not.toBe(
      'pointer',
    );
  },
};

// @codocs [[디자인 시스템:커서]]
/** 새 탭 바로가기는 손가락 커서다 */
export const NewTabCursor: Story = {
  args: { page: 'new-tab' },
  render: () => (
    <ChromePage
      page="new-tab"
      latestPosts={NEW_TAB_LATEST_POSTS.map((title) => ({ title }))}
      onLatestPostOpen={handleLatestPostOpen}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(getCursor(canvas.getByRole('button', { name: 'React 19 훅 정리' }))).toBe(
      'pointer',
    );
  },
};

// @codocs [[디자인 시스템:커서]]
/** 글 이미지의 크게 보기 버튼은 페이지 영역 규칙이 아니라 확대 커서를 그대로 둔다 */
export const ImageCursor: Story = {
  args: { page: 'post' },
  render: () => (
    <ChromePage page="post" meta={POST_PAGE.meta} title={POST_PAGE.title} toc={POST_PAGE.toc}>
      <PostBlocks
        blocks={postPageBlocks.wide}
        renderImage={() => <ImageAsset name="images/wallpaper-bloom" />}
        onImageOpen={handleImageOpen}
      />
    </ChromePage>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(getCursor(canvas.getByRole('button', { name: /이미지 크게 보기/ }))).toBe(
      'zoom-in',
    );
  },
};

// 목차가 최대 높이를 넘도록 많이 둔 항목이다. 셋째마다 한 단계 들인 항목이고, 마지막 항목이 지금 읽는 위치다.
const longToc = Array.from({ length: 30 }, (_, index) => ({
  label: `목차 ${String(index + 1)}`,
  level: index % 3 === 2 ? (2 as const) : (1 as const),
  isActive: index === 29,
}));

// @codocs [[Chrome:글 화면]]
/** 목차는 상대 단계로 들여 쓰고, 최대 높이를 넘으면 지금 읽는 위치 항목이 보이게 목차 안에서만 스크롤한다 */
export const TocLevelAndScroll: Story = {
  args: { page: 'post' },
  render: () => (
    <ChromePage
      page="post"
      meta={POST_PAGE.meta}
      title={POST_PAGE.title}
      toc={longToc}
      onTocItemSelect={handleTocItemSelect}
    >
      <PostBlocks
        blocks={postPageBlocks.wide}
        renderImage={() => <ImageAsset name="images/wallpaper-bloom" />}
      />
    </ChromePage>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('2단계 항목은 1단계 항목보다 들여 쓴다', async () => {
      const first = canvas.getByText('목차 1');
      const third = canvas.getByText('목차 3');
      await expect(third.offsetLeft).toBeGreaterThan(first.offsetLeft);
    });

    await step('지금 읽는 위치 항목이 보이도록 목차만 스크롤하고 페이지는 그대로다', async () => {
      const active = canvas.getByText('목차 30');
      const list = active.closest('[data-scrollbar-hidden]');
      if (list === null) {
        throw new Error('목차 스크롤 영역이 없다');
      }
      // 부드럽게 스크롤하므로 끝날 때까지 기다린다.
      await waitFor(async () => {
        await expect(list.scrollTop).toBeGreaterThan(0);
        await expect(active.getBoundingClientRect().bottom).toBeLessThanOrEqual(
          list.getBoundingClientRect().bottom + 1,
        );
      });
      await expect(window.scrollY).toBe(0);
    });
  },
};
