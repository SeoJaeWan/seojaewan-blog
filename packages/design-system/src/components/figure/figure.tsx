import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type FigureProps = Omit<ComponentProps<'figure'>, 'children'> & {
  /** 피그마 `image` 속성(인스턴스 교체). 글의 이미지다. 틀의 너비를 채우고 모서리를 둥글게 잘라 그린다 */
  image: ReactNode;
  /** 피그마 `Caption` 속성. 이미지 아래 글이다 */
  caption?: string;
  /** 피그마 `Show caption` 속성. 캡션을 보일지 정한다 */
  showCaption?: boolean;
};

/**
 * 글 본문의 이미지와 캡션(피그마 Figure)을 그린다. 글 페이지에 쓴다. 이미지는 `image`로 받고
 * 실제 Notion 이미지 제공은 나중 기능이 맡는다. 너비는 쓰는 곳이 `className`으로 정한다
 * (@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @codocs [[Chrome:Notion 블록]]
 * @param props
 */
export function Figure(props: FigureProps): JSX.Element {
  const {
    image,
    caption = '캡션',
    showCaption: hasCaption = true,
    className,
    ...figureProps
  } = props;
  return (
    <figure {...figureProps} className={cn('m-0 flex flex-col items-start gap-8', className)}>
      <div className="flex w-full flex-col items-start overflow-hidden rounded-overlay [&>*]:block [&>*]:w-full [&>*]:object-cover">
        {image}
      </div>
      {hasCaption && (
        <figcaption className="w-full type-body text-text-fill-secondary">{caption}</figcaption>
      )}
    </figure>
  );
}
