import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

type PostNavCardProps = Omit<ComponentProps<'div'>, 'children'> & {
  direction?: 'prev' | 'next';
  device?: 'desktop' | 'mobile';
  title?: string;
};

const LABELS = { prev: '이전 글', next: '다음 글' } as const;

/**
 * 글 끝의 이전 글·다음 글 이동 카드(피그마 PostNavCard)를 그린다. 글 페이지 아래에 쓴다.
 * 너비는 쓰는 곳이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props 컴포넌트 속성
 * @param props.direction 피그마 Direction 변형. 이전 글이면 prev, 다음 글이면 next다
 * @param props.device 피그마 Device 변형. mobile의 next는 왼쪽 정렬이다
 * @param props.title 피그마 Title 속성. 이동할 글의 제목이다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function PostNavCard({
  direction = 'prev',
  device = 'desktop',
  title = '글 제목',
  className,
  ...divProps
}: PostNavCardProps): JSX.Element {
  return (
    <div
      {...divProps}
      className={cn(
        'flex flex-col gap-spacing-xs overflow-clip rounded-radius-overlay border-stroke-width-default border-color-black-6 bg-color-gray-3-50 px-spacing-lg py-spacing-md',
        direction === 'next' && device === 'desktop' ? 'items-end' : 'items-start',
        className,
      )}
    >
      <p className="shrink-shrink-none type-caption text-color-black-61">{LABELS[direction]}</p>
      <p className="shrink-shrink-none type-body-strong text-color-black-89">{title}</p>
    </div>
  );
}
