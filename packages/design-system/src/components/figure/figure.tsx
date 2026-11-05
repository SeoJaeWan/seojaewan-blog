import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type FigureProps = Omit<ComponentProps<'figure'>, 'children'> & {
  image: ReactNode;
  caption?: string;
  hasCaption?: boolean;
};

/**
 * 글 본문의 이미지와 캡션(피그마 Figure)을 그린다. 글 페이지에 쓴다. 이미지는 `image`로 받고
 * 실제 Notion 이미지 제공은 나중 기능이 맡는다. 너비는 쓰는 곳이 `className`으로 정한다
 * (@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @codocs [[Notion 블록:모양]]
 * @param props 컴포넌트 속성
 * @param props.image 피그마 `image` 속성(인스턴스 교체). 글의 이미지다. 틀의 너비를 채우고 모서리를 둥글게 잘라 그린다
 * @param props.caption 피그마 `Caption` 속성. 이미지 아래 글이다
 * @param props.hasCaption 피그마 `Has caption` 속성. 캡션을 보일지 정한다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function Figure({
  image,
  caption = '캡션',
  hasCaption = true,
  className,
  ...figureProps
}: FigureProps): JSX.Element {
  return (
    <figure
      {...figureProps}
      className={cn('m-spacing-none flex flex-col items-start gap-spacing-sm', className)}
    >
      <div className="flex w-full flex-col items-start overflow-hidden rounded-radius-overlay [&>*]:block [&>*]:w-full [&>*]:object-cover">
        {image}
      </div>
      {hasCaption && (
        <figcaption className="w-full type-body text-color-black-61">{caption}</figcaption>
      )}
    </figure>
  );
}
