import pageExport from '@figma/patterns/chrome/page/export.json';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';

import { ImageAsset } from '@seojaewan/design-system';
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
// 제목은 Patterns/ + 피그마 조립 이름이다. 캡처 도구가 이 제목으로 피그마 조립과 짝짓는다.
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
