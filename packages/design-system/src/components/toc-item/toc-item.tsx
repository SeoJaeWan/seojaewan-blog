import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

// 피그마 Level마다 왼쪽 안쪽 여백이다. 단계는 막대 없이 이 여백(들여 쓰기)으로만 나타낸다.
const LEVEL_PADDING_CLASS_NAMES = {
  1: 'pl-spacing-sm',
  2: 'pl-spacing-2xl',
  3: 'pl-spacing-4xl',
} as const;

type TocItemProps = Omit<ComponentProps<'div'>, 'children'> & {
  isActive?: boolean;
  level?: 1 | 2 | 3;
  label?: string;
};

/**
 * 글 목차의 항목 하나(피그마 TocItem)를 그린다. Toc의 Items 슬롯에 쓴다.
 * 너비는 쓰는 곳이 정하고(피그마 원본은 220), 긴 제목은 그 너비 안에서 끝을 …로 줄인다.
 * 단계(Level)는 왼쪽 여백으로만 들여 쓴다. 글에서 가장 높은 제목 단계를 1로 맞추는 것은 쓰는 곳이 한다.
 * Rest·Hover 모양은 CSS hover로 바꾼다. Hover는 목록 항목과 같은 옅은 바탕이다.
 * @codocs [[컴포넌트 목록:상태]]
 * @codocs [[Chrome:글 화면]]
 * @param props 컴포넌트 속성
 * @param props.isActive 피그마 Active 변형. 지금 읽는 목차 항목인지 정한다. 글자 색이 강조색으로 바뀐다
 * @param props.level 피그마 Level 변형. 목차 들여 쓰기 단계다. 단계가 낮을수록 왼쪽 여백이 넓다
 * @param props.label 피그마 Label 속성. 목차 항목 글자다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function TocItem({
  isActive = false,
  level = 1,
  label = '목차 항목',
  className,
  ...divProps
}: TocItemProps): JSX.Element {
  return (
    <div
      {...divProps}
      aria-current={isActive ? 'location' : undefined}
      className={cn(
        // 긴 제목이 항목 너비를 늘리지 않고 줄어들게 최소 너비를 0으로 둔다.
        'flex h-size-toc-item-height min-w-size-none items-center overflow-clip rounded-radius-control pr-spacing-sm',
        LEVEL_PADDING_CLASS_NAMES[level],
        'bg-color-white-0 motion-control-state hover:bg-color-black-4',
        className,
      )}
    >
      <p
        className={cn(
          'min-w-size-none flex-flex-fill truncate type-body',
          isActive ? 'text-color-blue-72' : 'text-color-black-61',
        )}
      >
        {label}
      </p>
    </div>
  );
}
