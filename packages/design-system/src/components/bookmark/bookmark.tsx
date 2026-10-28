import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

type BookmarkProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 피그마 Title 속성. 링크 카드의 제목이다 */
  title?: string;
  /** 피그마 Description 속성. 링크 대상의 설명이다 */
  description?: string;
  /** 피그마 Url 속성. 링크 주소다 */
  url?: string;
};

/**
 * 글 본문의 링크 카드(피그마 Bookmark)를 그린다. 글 페이지에 쓴다.
 * 너비는 쓰는 곳이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @codocs [[Chrome:Notion 블록]]
 * @param props
 */
export function Bookmark(props: BookmarkProps): JSX.Element {
  const { title = '제목', description = '설명', url = '주소', className, ...divProps } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'flex flex-col items-start gap-4 rounded-overlay border-default border-card-stroke-default bg-card-background-fill-secondary px-16 py-12',
        className,
      )}
    >
      <p className="w-full shrink-0 type-body-strong text-text-fill-primary">{title}</p>
      <p className="w-full shrink-0 type-caption text-text-fill-secondary">{description}</p>
      <div className="flex w-full shrink-0 items-center gap-6">
        <Asset
          name="icons/ic_fluent_link_20_regular.svg"
          className="size-icon-16 shrink-0 text-text-fill-primary"
        />
        <p className="min-w-0 flex-1 type-caption text-text-fill-secondary">{url}</p>
      </div>
    </div>
  );
}
