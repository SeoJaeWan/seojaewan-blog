import type { JSX } from 'react';

import { CodeBlock } from '@seojaewan/design-system';

import { POST_BODY } from './post';

type PostBodyProps = {
  /** 피그마 Chrome/Page Layout. narrow는 피그마 조립처럼 코드 블록까지만 그린다 */
  layout: 'wide' | 'narrow';
};

/**
 * 피그마 조립 Chrome/Page `Page=Post`의 글 본문 자리를 채운 모습을 그리는 스토리 도우미다.
 * Notion 글 렌더링(content/)을 만들기 전이라 같은 글자로 그린다. Chrome 글 화면과 Chrome 창, 창 축소 화면 스토리가 함께 쓴다.
 * @param props
 * @returns 본문 블록들
 */
export function PostBody(props: PostBodyProps): JSX.Element {
  const { layout } = props;
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
