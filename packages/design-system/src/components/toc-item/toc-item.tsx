import type { ComponentProps, JSX } from 'react';

import { cn } from '../../cn';

// 피그마 Level 2·3의 indent 칸 너비다. Level 1은 칸이 없다.
const INDENT_CLASS_NAMES = { 2: 'w-spacing-sm', 3: 'w-spacing-2xl' } as const;

type TocItemProps = Omit<ComponentProps<'div'>, 'children'> & {
  isActive?: boolean;
  level?: 1 | 2 | 3;
  label?: string;
};

/**
 * 글 목차의 항목 하나(피그마 TocItem)를 그린다. Toc의 Items 슬롯에 쓴다.
 * 너비는 글자에 맞춘다. 왼쪽 표시줄은 Active일 때만 강조색이다.
 * 단계(Level)가 낮을수록 표시줄과 글자 사이에 빈 칸을 넣어 들여 쓴다. 글에서 가장 높은 제목 단계를 1로 맞추는 것은 쓰는 곳이 한다.
 * @codocs [[컴포넌트 목록:상태]]
 * @codocs [[Chrome:글 화면]]
 * @param props 컴포넌트 속성
 * @param props.isActive 피그마 Active 변형. 지금 읽는 목차 항목인지 정한다. 표시줄과 글자 색이 바뀐다
 * @param props.level 피그마 Level 변형. 목차 들여 쓰기 단계다. 1은 들이지 않고 2·3은 indent 칸만큼 들인다
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
        'flex h-size-toc-item-height items-start gap-spacing-sm overflow-clip',
        className,
      )}
    >
      <div
        className={cn(
          'h-full w-stroke-stroke-width-indicator shrink-shrink-none',
          isActive ? 'bg-color-blue-59' : 'bg-color-black-8',
        )}
      />
      {level !== 1 && (
        <div aria-hidden className={cn('h-full shrink-shrink-none', INDENT_CLASS_NAMES[level])} />
      )}
      <p
        className={cn(
          'shrink-shrink-none type-body whitespace-nowrap',
          isActive ? 'text-color-blue-72' : 'text-color-black-61',
        )}
      >
        {label}
      </p>
    </div>
  );
}
