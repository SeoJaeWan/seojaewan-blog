import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

type TocItemProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Active 변형. 지금 읽는 목차 항목인지 정한다. 표시줄과 글자 색이 바뀐다 */
  active?: boolean;
  /** 피그마 Label 속성. 목차 항목 글자다 */
  label?: string;
};

/**
 * 글 목차의 항목 하나(피그마 TocItem)를 그린다. Toc의 Items 슬롯에 쓴다.
 * 너비는 글자에 맞춘다. 왼쪽 표시줄은 Active일 때만 강조색이다.
 * @codocs [[컴포넌트 목록:상태]]
 * @param props
 */
export function TocItem(props: TocItemProps): JSX.Element {
  const { active: isActive = false, label = '목차 항목', className, ...divProps } = props;
  return (
    <div
      {...divProps}
      aria-current={isActive ? 'location' : undefined}
      className={cn('flex h-20 items-start gap-8 overflow-clip', className)}
    >
      <div
        className={cn(
          'h-full w-stroke-indicator shrink-0',
          isActive ? 'bg-accent-fill-default' : 'bg-divider-stroke-default',
        )}
      />
      <p
        className={cn(
          'shrink-0 type-body whitespace-nowrap',
          isActive ? 'text-accent-text-fill-primary' : 'text-text-fill-secondary',
        )}
      >
        {label}
      </p>
    </div>
  );
}
