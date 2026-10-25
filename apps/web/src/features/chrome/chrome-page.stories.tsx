import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';

import { CodeBlock } from '@seojaewan/design-system';

import { ChromePage, type ChromePageLayout } from './chrome-page';
import {
  NEW_TAB_LATEST_POSTS,
  NOT_FOUND_URL,
  POST_BODY,
  POST_PAGE,
  SEARCH_RESULTS,
} from './story-data';

// 피그마 Chrome/Page의 변형 속성 값이다(정규화한 이름).
const PAGES = ['post', 'new-tab', 'search-results', 'not-found'] as const;
const LAYOUTS = ['wide', 'narrow'] as const;

// 본문은 크기를 갖지 않고 창이 정하므로 피그마 원본 크기(size/1278×711, size/388×720)로 감싸 그린다.
const SIZE_CLASS_NAMES = { wide: 'w-1278 h-711', narrow: 'w-388 h-720' } as const;

type ParityArgs = {
  page: (typeof PAGES)[number];
  layout: (typeof LAYOUTS)[number];
};

/**
 * 피그마 조립의 글 본문 자리를 채운 모습이다. Notion 글 렌더링(content/)을 만들기 전이라 스토리에서 같은 글자로 그린다.
 * 좁은 창은 피그마 조립처럼 코드 블록까지만 넣는다.
 * @param props
 * @param props.layout 피그마 Layout
 * @returns 본문 블록들
 */
function PostBody({ layout }: { layout: ChromePageLayout }): JSX.Element {
  return (
    <>
      <p className="w-full type-body-large text-text-fill-primary">{POST_BODY.intro}</p>
      <h2 className="w-full type-subtitle text-text-fill-primary">{POST_BODY.useHeading}</h2>
      <p className="w-full type-body-large text-text-fill-primary">
        {POST_BODY.useParagraph.before}
        <a
          href="#react-docs"
          className="type-body-large-link text-accent-text-fill-primary underline"
        >
          {POST_BODY.useParagraph.link}
        </a>
        {POST_BODY.useParagraph.after}
      </p>
      <CodeBlock language={POST_BODY.code.language} code={POST_BODY.code.code} className="w-full" />
      {layout === 'wide' && (
        <>
          <h2 className="w-full type-subtitle text-text-fill-primary">
            {POST_BODY.actionStateHeading}
          </h2>
          <p className="w-full type-body-large text-text-fill-primary">
            {POST_BODY.actionStateParagraph}
          </p>
        </>
      )}
    </>
  );
}

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
          meta={POST_PAGE.meta}
          title={POST_PAGE.title}
          toc={POST_PAGE.toc}
          previousTitle={POST_PAGE.previousTitle}
          nextTitle={POST_PAGE.nextTitle}
        >
          <PostBody layout={args.layout} />
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
