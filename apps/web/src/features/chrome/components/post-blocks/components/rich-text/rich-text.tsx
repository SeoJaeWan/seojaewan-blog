import { Fragment, type JSX, type MouseEvent, type ReactNode } from 'react';

import type { ChromeTabPage } from '@/shared/utils/chrome-tabs/chrome-tabs';
import type { RichText as RichTextPart } from '@/shared/utils/post-body/post-body';

import {
  getRichTextLinkTarget,
  getRichTextMarks,
  type RichTextMark,
} from './utils/rich-text-format/rich-text-format';

type RichTextProps = {
  /** Notion에서 온 글자 조각들 */
  richText: readonly RichTextPart[];
  /**
   * 링크 글자 크기. `body-large`는 본문 글자(Body Large Link) 자리, `inherit`는 둘레 글자 크기를 따르는 자리(표 칸)다.
   * 없으면 `body-large`다
   */
  linkSize?: 'body-large' | 'inherit';
  /** 링크 주소가 블로그 안의 페이지면 그 페이지를 돌려준다. 외부 주소면 null이다. 없으면 모든 링크가 외부 주소다 */
  resolveLink?: (href: string) => ChromeTabPage | null;
  /** 블로그 글 링크를 눌렀을 때. 같은 탭에서 그 페이지로 간다 */
  onPageOpen?: (page: ChromeTabPage) => void;
};

// 글자 서식의 모양이다(피그마 Chrome/PostBlocks `paragraph with formatting`). 서식마다 굵기·기울임·줄·서체 하나씩만 바꾼다.
const LINK_CLASS_NAMES = {
  'body-large': 'type-body-large-link text-accent-text-fill-primary underline',
  inherit: 'text-accent-text-fill-primary underline',
} as const;

/**
 * 서식 하나로 글자를 감싼다. 인라인 코드는 배경 없이 `Code/Inline` 글자 스타일과 `post/inline-code` 글자색이다.
 * @param mark 서식
 * @param content 감쌀 글자
 * @returns 감싼 글자
 */
function wrapMark(mark: RichTextMark, content: ReactNode): JSX.Element {
  switch (mark) {
    case 'bold':
      return <strong className="font-font-weight-semibold">{content}</strong>;
    case 'italic':
      return <em className="italic">{content}</em>;
    case 'underline':
      return <u className="underline">{content}</u>;
    case 'strikethrough':
      return <s className="line-through">{content}</s>;
    case 'code':
      return <code className="type-code-inline text-post-inline-code">{content}</code>;
  }
}

/**
 * Notion에서 온 글자 조각(rich text)을 그린다. 글 본문 블록(문단, 제목, 목록, 인용, 콜아웃, 토글 제목, 표 칸)이 모두 이것을 쓴다.
 * 글자 서식은 굵게·기울임·밑줄·취소선·인라인 코드이고, 한 조각에 여럿 걸리면 Notion처럼 모두 겹쳐 그린다.
 * Notion 색 지정(글자색, 형광펜)은 따르지 않는다. 링크는 블로그 안의 페이지면 같은 탭에서 그 페이지로 가고,
 * 외부 주소면 실제 브라우저의 새 탭(noopener)에서 연다.
 * @codocs [[Notion 블록:모양]]
 * @codocs [[Chrome:글 화면]]
 * @param props
 */
export function RichText(props: RichTextProps): JSX.Element {
  const { richText, linkSize = 'body-large', resolveLink, onPageOpen: handlePageOpen } = props;
  const linkClassName = LINK_CLASS_NAMES[linkSize];

  return (
    <>
      {richText.map(
        /**
         * 글자 조각 하나를 서식대로 감싸고, 링크가 있으면 링크로 그린다.
         * @param part 글자 조각
         * @param index 차례
         * @returns 글자나 링크
         */
        (part, index) => {
          const content = getRichTextMarks(part.annotations).reduce<ReactNode>(
            (inner, mark) => wrapMark(mark, inner),
            part.text,
          );
          const target = getRichTextLinkTarget(part.link, resolveLink);
          switch (target.kind) {
            case 'none':
              return <Fragment key={index}>{content}</Fragment>;
            case 'external':
              return (
                <a
                  key={index}
                  href={target.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClassName}
                >
                  {content}
                </a>
              );
            case 'page':
              return (
                <a
                  key={index}
                  href={target.href}
                  onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                    event.preventDefault();
                    handlePageOpen?.(target.page);
                  }}
                  className={linkClassName}
                >
                  {content}
                </a>
              );
          }
        },
      )}
    </>
  );
}
