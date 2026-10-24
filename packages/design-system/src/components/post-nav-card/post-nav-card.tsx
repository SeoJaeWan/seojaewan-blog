import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

type PostNavCardProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Direction 변형. 이전 글이면 prev, 다음 글이면 next다 */
  direction?: 'prev' | 'next';
  /** 피그마 Device 변형. mobile의 next는 왼쪽 정렬이다 */
  device?: 'desktop' | 'mobile';
  /** 피그마 Title 속성. 이동할 글의 제목이다 */
  title?: string;
};

const LABELS = { prev: '이전 글', next: '다음 글' } as const;

/**
 * 글 끝의 이전 글·다음 글 이동 카드(피그마 PostNavCard)를 그린다. 글 페이지 아래에 쓴다.
 * 너비는 쓰는 곳이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function PostNavCard(props: PostNavCardProps): JSX.Element {
  const {
    direction = 'prev',
    device = 'desktop',
    title = '글 제목',
    className,
    ...divProps
  } = props;
  return (
    <div
      {...divProps}
      className={cn(
        'flex flex-col gap-4 overflow-clip rounded-overlay border-default border-card-stroke-default bg-card-background-fill-secondary px-16 py-12',
        direction === 'next' && device === 'desktop' ? 'items-end' : 'items-start',
        className,
      )}
    >
      <p className="shrink-0 type-caption text-text-fill-secondary">{LABELS[direction]}</p>
      <p className="shrink-0 type-body-strong text-text-fill-primary">{title}</p>
    </div>
  );
}
