import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { Asset } from '../asset/asset';

// 피그마 Level별 들여쓰기(indent) 너비다. 한 단계가 16px이다.
const INDENT_CLASS_NAMES = ['', 'w-16', 'w-32', 'w-48'] as const;

type NavigationItemProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 피그마 Level. 폴더 트리 깊이(0~3)이며 깊을수록 들여 쓴다 */
  level?: 0 | 1 | 2 | 3;
  /** 피그마 Expand. none은 꺾쇠 자리만 비우고, collapsed는 오른쪽, expanded는 아래를 가리키는 꺾쇠를 그린다 */
  expand?: 'none' | 'collapsed' | 'expanded';
  /** 피그마 State=Selected. 지금 고른 항목이면 바탕을 깐다. Hover는 CSS hover로 그린다 */
  selected?: boolean;
  /** 피그마 TEXT 속성 Label. 항목 이름이다 */
  label?: string;
  /** 피그마 INSTANCE_SWAP 속성 Item icon. 이름 앞 16px 아이콘이다. 항목마다 다르므로 필수다 */
  icon: ReactNode;
  /** 피그마 INSTANCE_SWAP 속성 Chevron. expand가 none이 아닐 때 보이는 꺾쇠이며 기본은 꺾쇠 자산이다 */
  chevron?: ReactNode;
};

/**
 * 탐색기 NavigationPane의 폴더 트리 항목(피그마 NavigationItem)을 그린다.
 * 너비는 쓰는 곳이 정한다(피그마 원본은 240). Rest·Hover·Selected 모양은 selected와 CSS hover로 바꾼다.
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param props
 */
export function NavigationItem(props: NavigationItemProps): JSX.Element {
  const {
    level = 0,
    expand = 'none',
    selected: isSelected = false,
    label = '항목 이름',
    icon,
    chevron,
    className,
    ...divProps
  } = props;
  const defaultChevron = (
    <Asset
      name="icons/ic_fluent_chevron_right_16_regular.svg"
      className={cn('size-icon-16 text-text-fill-secondary', expand === 'expanded' && 'rotate-90')}
    />
  );
  return (
    <div
      {...divProps}
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={expand === 'none' ? undefined : expand === 'expanded'}
      className={cn(
        'flex h-control-height items-center gap-4 rounded-control py-0 select-none',
        level === 0 ? 'px-8' : 'pr-8 pl-4',
        'transition-colors duration-faster ease-fade',
        isSelected
          ? 'bg-control-alt-fill-tertiary'
          : 'bg-subtle-fill-transparent hover:bg-subtle-fill-secondary',
        className,
      )}
    >
      {level > 0 && <span className={cn('h-16 shrink-0', INDENT_CLASS_NAMES[level])} />}
      <span className="flex size-icon-16 shrink-0 items-center justify-center">
        {expand !== 'none' && (chevron ?? defaultChevron)}
      </span>
      <span className="flex size-icon-16 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1 truncate type-caption text-text-fill-primary">{label}</span>
    </div>
  );
}
