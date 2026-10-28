import { createElement, type JSX, type MouseEvent, type ReactNode } from 'react';

import { CodeBlock } from '@seojaewan/design-system';

import type { ChromeTabPage } from '@/shared/utils/chrome-tabs/chrome-tabs';
import {
  getHeadingId,
  type HeadingBlock,
  type PostBlock,
  type RichText,
} from '@/shared/utils/post-body/post-body';

type PostBlocksProps = {
  /** 본문 블록 */
  blocks: readonly PostBlock[];
  /**
   * 링크 주소가 블로그 안의 페이지면 그 페이지를 돌려준다. 외부 주소면 null이다
   */
  resolveLink: (href: string) => ChromeTabPage | null;
  /** 블로그 글 링크를 눌렀을 때. 같은 탭에서 그 페이지로 간다 */
  onPageOpen: (page: ChromeTabPage) => void;
};

// 제목 단계마다의 요소다. 글 제목이 h1이라 본문 제목은 h2부터다.
const HEADING_TAGS = { heading_1: 'h2', heading_2: 'h3', heading_3: 'h4' } as const;

// 본문 글자와 링크의 모양이다(피그마 Chrome/Page `Page=Post` 본문 자리).
const PARAGRAPH_CLASS_NAME = 'w-full type-body-large text-text-fill-primary';
const HEADING_CLASS_NAME = 'w-full type-subtitle text-text-fill-primary';
const LINK_CLASS_NAME = 'type-body-large-link text-accent-text-fill-primary underline';

/**
 * 글 본문 블록(제목, 문단, 코드 블록)을 그린다. 피그마 Chrome/Page `Page=Post`의 본문 자리 모양이다.
 * 제목은 단계와 상관없이 디자인에 있는 하나의 제목 모양으로 그리고, 목차가 찾도록 id를 단다.
 * 링크는 블로그 글이면 같은 탭에서 그 글로 가고, 외부 주소면 실제 브라우저의 새 탭(noopener)에서 연다.
 * 코드 블록은 디자인 시스템 CodeBlock(복사 단추 포함)이고 문법 강조는 없다.
 * @codocs [[Chrome:글 화면]]
 * @codocs [[Chrome:Notion 블록]]
 * @param props
 */
export function PostBlocks(props: PostBlocksProps): JSX.Element {
  const { blocks, resolveLink, onPageOpen: handlePageOpen } = props;

  /**
   * 글자 조각들을 그린다. 링크가 있는 조각은 링크다.
   * @param richText 글자 조각
   * @returns 글자와 링크
   */
  function renderRichText(richText: readonly RichText[]): ReactNode {
    return richText.map(
      /**
       * 글자 조각 하나를 그린다.
       * @param part 글자 조각
       * @param index 차례
       * @returns 글자나 링크
       */
      (part, index) => {
        if (part.link === null) {
          return <span key={index}>{part.text}</span>;
        }
        const page = resolveLink(part.link);
        if (page === null) {
          return (
            <a
              key={index}
              href={part.link}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS_NAME}
            >
              {part.text}
            </a>
          );
        }
        return (
          <a
            key={index}
            href={part.link}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              event.preventDefault();
              handlePageOpen(page);
            }}
            className={LINK_CLASS_NAME}
          >
            {part.text}
          </a>
        );
      },
    );
  }

  /**
   * 제목 블록을 그린다.
   * @param block 제목 블록
   * @param index 본문 안 차례
   * @returns 제목
   */
  function renderHeading(block: HeadingBlock, index: number): JSX.Element {
    return createElement(
      HEADING_TAGS[block.type],
      { key: index, id: getHeadingId(index), className: HEADING_CLASS_NAME },
      renderRichText(block.richText),
    );
  }

  return (
    <>
      {blocks.map(
        /**
         * 블록 하나를 그린다.
         * @param block 블록
         * @param index 차례
         * @returns 블록
         */
        (block, index) => {
          switch (block.type) {
            case 'heading_1':
            case 'heading_2':
            case 'heading_3':
              return renderHeading(block, index);
            case 'paragraph':
              return (
                <p key={index} className={PARAGRAPH_CLASS_NAME}>
                  {renderRichText(block.richText)}
                </p>
              );
            case 'code':
              return (
                <CodeBlock key={index} language={block.language} className="w-full">
                  {block.code}
                </CodeBlock>
              );
          }
        },
      )}
    </>
  );
}
