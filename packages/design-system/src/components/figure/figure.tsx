import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

export type FigureState = 'loaded' | 'loading' | 'failed';

type FigureProps = Omit<ComponentProps<'figure'>, 'children'> & {
  image: ReactNode;
  state?: FigureState;
  caption?: string;
  hasCaption?: boolean;
};

/**
 * 글 본문의 이미지와 캡션(피그마 Figure)을 그린다. 글 페이지에 쓴다. 이미지는 `image`로 받고
 * 실제 Notion 이미지 제공은 나중 기능이 맡는다. 너비는 쓰는 곳이 `className`으로 정한다
 * (@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * 받는 중(Loading)과 실패(Failed)에는 이미지 대신 16:9 회색 칸을 그린다. 받는 중에는 그 위에 반짝임 칠을 얹는다.
 * 반짝임은 받는 중에 늘 붙는 움직임이라 여기서 모션 클래스(motion-image-skeleton)를 붙이고, 상태를 바꾸는 일은 쓰는 곳이 한다.
 * @codocs [[Notion 블록:모양]]
 * @codocs [[Notion 이미지 제공:로딩 표시]]
 * @codocs [[피그마 연동:PR 흐름]]
 * @param props 컴포넌트 속성
 * @param props.image 피그마 `Image` 속성(인스턴스 교체). 글의 이미지다. 틀의 너비를 채우고 모서리를 둥글게 잘라 그린다. `State=Loaded`에서만 그린다
 * @param props.state 피그마 `State` 변형. 이미지를 다 받았는지(`loaded`), 받는 중인지(`loading`), 받지 못했는지(`failed`)다
 * @param props.caption 피그마 `Caption` 속성. 이미지 아래 글이다
 * @param props.hasCaption 피그마 `Has caption` 속성. 캡션을 보일지 정한다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function Figure({
  image,
  state = 'loaded',
  caption = '캡션',
  hasCaption = true,
  className,
  ...figureProps
}: FigureProps): JSX.Element {
  return (
    <figure
      {...figureProps}
      aria-busy={state === 'loading' ? true : undefined}
      className={cn('m-spacing-none flex flex-col items-start gap-spacing-sm', className)}
    >
      <div className="flex w-full flex-col items-start overflow-hidden rounded-radius-overlay [&>*]:block [&>*]:w-full [&>*]:object-cover">
        {state === 'loaded' ? (
          image
        ) : (
          // 피그마 placeholder다. 크기를 모르는 이미지의 자리(ratio/video)로 그린다.
          <div className="relative aspect-ratio-video overflow-hidden bg-color-gray-4">
            {/* 피그마 shimmer다. 정지 모양은 반짝임이 칸 왼쪽 밖(한 칸 너비만큼)에 놓인 자리라 보이지 않는다.
                자리는 이동(translate) 대신 위치(right)로 잡아, 늘 붙는 반짝임 움직임(motion-image-skeleton)의 이동이
                피그마처럼 그 자리에서 더해지게 한다. */}
            {state === 'loading' && (
              <div
                aria-hidden
                className="absolute inset-y-spacing-none right-position-full w-full bg-gradient-skeleton-shimmer motion-image-skeleton"
              />
            )}
          </div>
        )}
      </div>
      {hasCaption && (
        <figcaption className="w-full type-body text-color-black-61">{caption}</figcaption>
      )}
    </figure>
  );
}
