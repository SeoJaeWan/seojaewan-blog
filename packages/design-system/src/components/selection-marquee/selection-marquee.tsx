import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

type SelectionMarqueeProps = Omit<ComponentProps<'div'>, 'children'>;

/**
 * 끌어서 여러 항목을 고르는 선택 사각형(피그마 SelectionMarquee)을 그린다.
 * 크기는 끄는 범위가 정하므로 쓰는 곳이 `className`으로 정한다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
 * @param props
 */
export function SelectionMarquee(props: SelectionMarqueeProps): JSX.Element {
  const { className, ...divProps } = props;
  return (
    <div
      aria-hidden="true"
      {...divProps}
      className={cn(
        'border-default border-selection-marquee-stroke bg-selection-marquee-fill',
        className,
      )}
    />
  );
}
