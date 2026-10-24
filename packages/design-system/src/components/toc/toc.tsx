import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';
import { SectionTitle } from '../section-title/section-title';

type TocProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 피그마 State 변형. 펼치면 제목과 항목 목록, 접으면 제목과 아래 꺾쇠만 보인다 */
  state?: 'expanded' | 'collapsed';
  /** 제목 글자다 */
  title?: string;
  /** 피그마 `Items` 슬롯. 펼친 상태에서 TocItem을 세로로 넣는다 */
  children?: ReactNode;
};

/**
 * 글 페이지의 목차(피그마 Toc)를 그린다. 넓은 창에서는 펼치고 좁은 창에서는 접어 쓴다.
 * 항목은 `children` 슬롯으로 채우고, 너비는 쓰는 곳이 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @codocs [[컴포넌트 목록:상태]]
 * @param props
 */
export function Toc(props: TocProps): JSX.Element {
  const { state = 'expanded', title = '목차', children, className, ...divProps } = props;
  if (state === 'collapsed') {
    return (
      <div
        {...divProps}
        className={cn(
          'flex items-center overflow-clip rounded-control border-default border-card-stroke-default bg-card-background-fill-secondary px-12 py-8',
          className,
        )}
      >
        <p className="min-w-px flex-1 type-body-strong text-text-fill-primary">{title}</p>
        <Asset
          name="icons/ic_fluent_chevron_down_20_regular.svg"
          className="size-icon-20 shrink-0 text-text-fill-primary"
        />
      </div>
    );
  }
  return (
    <div {...divProps} className={cn('flex flex-col items-start gap-8 pt-4', className)}>
      <SectionTitle title={title} className="w-full shrink-0" />
      <div className="w-full shrink-0">{children}</div>
    </div>
  );
}
