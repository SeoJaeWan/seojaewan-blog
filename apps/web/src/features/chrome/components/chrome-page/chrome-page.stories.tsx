import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';

import { ImageAsset } from '@seojaewan/design-system';

import { PostBlocks } from '@/features/chrome/components/post-blocks/post-blocks';
import { POST_PAGE, postPageBlocks } from '@/shared/stories/post/post';

import { ChromePage } from './chrome-page';
import { NEW_TAB_LATEST_POSTS, NOT_FOUND_URL, SEARCH_RESULTS } from './story-data';

// 피그마 Chrome/Page의 변형 속성 값이다(정규화한 이름).
const PAGES = ['post', 'new-tab', 'search-results', 'not-found'] as const;
const LAYOUTS = ['wide', 'narrow'] as const;

// 본문은 크기를 갖지 않고 창이 정하므로 피그마 원본 크기(size/1278×711, size/388×720)로 감싸 그린다.
const SIZE_CLASS_NAMES = { wide: 'w-1278 h-711', narrow: 'w-388 h-720' } as const;

// 피그마 `figure`의 이미지 칸 높이다(그림 448·240에서 간격 8과 캡션 20을 뺀 값). 크기 토큰에 없는 값이라 인라인으로 준다.
const FIGURE_IMAGE_HEIGHTS = { wide: 420, narrow: 212 } as const;

type ParityArgs = {
  page: (typeof PAGES)[number];
  layout: (typeof LAYOUTS)[number];
};

/**
 * 변형에 맞는 페이지를 피그마 조립과 같은 데이터로 그린다.
 * @param args 변형 속성
 * @returns ChromePage
 */
function renderPage(args: ParityArgs): JSX.Element {
  const className = SIZE_CLASS_NAMES[args.layout];
  switch (args.page) {
    case 'post': {
      return (
        <ChromePage
          page="post"
          layout={args.layout}
          className={className}
          cover={<ImageAsset name="images/wallpaper-bloom" />}
          meta={POST_PAGE.meta}
          title={POST_PAGE.title}
          toc={POST_PAGE.toc}
          previousTitle={POST_PAGE.previousTitle}
          nextTitle={POST_PAGE.nextTitle}
        >
          <PostBlocks
            blocks={postPageBlocks[args.layout]}
            renderImage={() => (
              <ImageAsset
                name="images/wallpaper-bloom"
                style={{ height: FIGURE_IMAGE_HEIGHTS[args.layout] }}
              />
            )}
          />
        </ChromePage>
      );
    }
    case 'new-tab': {
      return (
        <ChromePage
          page="new-tab"
          layout={args.layout}
          className={className}
          latestPosts={NEW_TAB_LATEST_POSTS.map((title) => ({ title }))}
        />
      );
    }
    case 'search-results': {
      return (
        <ChromePage
          page="search-results"
          layout={args.layout}
          className={className}
          query={SEARCH_RESULTS.query}
          results={SEARCH_RESULTS.results}
        />
      );
    }
    case 'not-found': {
      return (
        <ChromePage
          page="not-found"
          layout={args.layout}
          className={className}
          url={NOT_FOUND_URL}
        />
      );
    }
  }
}

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 캡처 도구가 이 제목으로 피그마 조립과 짝짓는다.
const meta = {
  title: 'Patterns/Chrome/Page',
  args: { page: 'post', layout: 'wide' },
  argTypes: {
    page: { control: 'inline-radio', options: PAGES },
    layout: { control: 'inline-radio', options: LAYOUTS },
  },
  render: renderPage,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
