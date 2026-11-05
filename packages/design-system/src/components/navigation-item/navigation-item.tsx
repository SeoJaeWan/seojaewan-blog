import type { ComponentProps, JSX, MouseEvent, ReactNode } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

// 피그마 Level별 들여쓰기(indent) 너비다. 한 단계가 16px이다.
const INDENT_CLASS_NAMES = ['', 'w-spacing-lg', 'w-spacing-3xl', 'w-spacing-5xl'] as const;

type NavigationItemProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  level?: 0 | 1 | 2 | 3;
  expand?: 'none' | 'collapsed' | 'expanded';
  isSelected?: boolean;
  label?: string;
  icon: ReactNode;
  chevron?: ReactNode;
  onChevronClick?: (event: MouseEvent<HTMLSpanElement>) => void;
};

/**
 * 탐색기 NavigationPane의 폴더 트리 항목(피그마 NavigationItem)을 그린다.
 * 너비는 쓰는 곳이 정한다(피그마 원본은 240). Rest·Hover·Selected 모양은 isSelected와 CSS hover로 바꾼다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param props 컴포넌트 속성
 * @param props.level 피그마 Level. 폴더 트리 깊이(0~3)이며 깊을수록 들여 쓴다
 * @param props.expand 피그마 Expand. none은 꺾쇠 자리만 비우고, collapsed는 오른쪽, expanded는 아래를 가리키는 꺾쇠를 그린다
 * @param props.isSelected 피그마 State=Selected. 지금 고른 항목이면 바탕을 깐다. Hover는 CSS hover로 그린다
 * @param props.label 피그마 TEXT 속성 Label. 항목 이름이다
 * @param props.icon 피그마 INSTANCE_SWAP 속성 Item icon. 이름 앞 16px 아이콘이다. 항목마다 다르므로 필수다
 * @param props.chevron 피그마 INSTANCE_SWAP 속성 Chevron. expand가 none이 아닐 때 보이는 꺾쇠이며 기본은 꺾쇠 자산이다
 * @param props.onChevronClick 꺾쇠를 눌렀을 때 부른다(펼치기·접기). 항목 자체의 onClick은 부르지 않는다. expand가 none이면 부르지 않는다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function NavigationItem({
  level = 0,
  expand = 'none',
  isSelected = false,
  label = '항목 이름',
  icon,
  chevron,
  onChevronClick,
  className,
  ...divProps
}: NavigationItemProps): JSX.Element {
  /**
   * 꺾쇠 누르기를 받아 항목 누르기로 올라가지 않게 하고 콜백을 부른다. 꺾쇠가 없거나 콜백이 없으면 항목 누르기로 둔다.
   * @param event 누르기 이벤트
   */
  function handleChevronClick(event: MouseEvent<HTMLSpanElement>): void {
    if (expand === 'none' || onChevronClick === undefined) {
      return;
    }
    event.stopPropagation();
    onChevronClick(event);
  }
  const defaultChevron = (
    <Asset
      name="icons/ic_fluent_chevron_right_16_regular.svg"
      className={cn('text-color-black-61', expand === 'expanded' && 'rotate-rotate-quarter')}
    />
  );
  return (
    <div
      {...divProps}
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={expand === 'none' ? undefined : expand === 'expanded'}
      className={cn(
        'flex h-size-control-height items-center gap-spacing-xs rounded-radius-control py-spacing-none select-none',
        level === 0 ? 'px-spacing-sm' : 'pr-spacing-sm pl-spacing-xs',
        'motion-control-state',
        isSelected ? 'bg-color-black-6' : 'bg-color-white-0 hover:bg-color-black-4',
        className,
      )}
    >
      {level > 0 && (
        <span className={cn('h-spacing-lg shrink-shrink-none', INDENT_CLASS_NAMES[level])} />
      )}
      <span
        onClick={handleChevronClick}
        className="flex size-size-icon-sm shrink-shrink-none items-center justify-center [&>*]:size-full [&>*]:object-contain"
      >
        {expand !== 'none' && (chevron ?? defaultChevron)}
      </span>
      {/* 피그마 Item icon 자리. 한 가지 색 아이콘(바탕 화면 등)은 text/fill/primary로 칠한다. */}
      <span className="flex size-size-icon-sm shrink-shrink-none items-center justify-center text-color-black-89 [&>*]:size-full [&>*]:object-contain">
        {icon}
      </span>
      <span className="min-w-size-none flex-flex-fill truncate type-caption text-color-black-89">
        {label}
      </span>
    </div>
  );
}
