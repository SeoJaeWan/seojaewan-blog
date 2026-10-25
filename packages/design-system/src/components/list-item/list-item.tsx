import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type ListItemCommonProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 피그마 State=Selected. 지금 고른 항목이면 바탕을 깐다. Hover는 CSS hover로 그린다 */
  selected?: boolean;
  /** 피그마 TEXT 속성 Title. 항목 제목이다. 길면 한 줄로 말줄임한다 */
  title?: string;
  /** 피그마 INSTANCE_SWAP 속성 Icon. 제목 앞 아이콘이다. 항목마다 다르므로 필수이며, 자리 크기(16 또는 32)는 컴포넌트가 정한다 */
  icon: ReactNode;
  /** 피그마 BOOLEAN 속성 Show trailing. 오른쪽 보조 글자를 보일지 정한다 */
  showTrailing?: boolean;
  /** 피그마 TEXT 속성 Trailing. 오른쪽 보조 글자다 */
  trailing?: string;
};

type ListItemProps = ListItemCommonProps &
  (
    | {
        /** 피그마 Size=Compact. 제목만 있는 한 줄(높이 36, 아이콘 16)이다 */
        size?: 'compact';
        /** 부제는 size="two-line"에서만 받는다 */
        subtitle?: never;
        /** 부제 표시 여부는 size="two-line"에서만 받는다 */
        showSubtitle?: never;
      }
    | {
        /** 피그마 Size=Two-line. 제목과 부제 두 줄(높이 52, 아이콘 32)이다 */
        size: 'two-line';
        /** 피그마 TEXT 속성 Subtitle. 제목 아래 부제다. two-line에서만 받는다 */
        subtitle?: string;
        /** 피그마 BOOLEAN 속성 Show subtitle. 부제를 보일지 정한다 */
        showSubtitle?: boolean;
      }
  );

/**
 * 아이콘·제목·보조 정보가 있는 목록 한 줄(피그마 ListItem)을 그린다. Start 목록·검색 결과·주소창 추천에 쓴다.
 * 너비는 쓰는 곳이 정한다(피그마 원본은 400). Rest·Hover·Selected 모양은 selected와 CSS hover로 바꾼다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param props
 */
export function ListItem(props: ListItemProps): JSX.Element {
  const {
    selected: isSelected = false,
    title = '항목 이름',
    icon,
    showTrailing: isTrailingShown = false,
    trailing = '부가 정보',
    size = 'compact',
    subtitle = '보조 설명',
    showSubtitle: isSubtitleShown = true,
    className,
    ...divProps
  } = props;
  const isTwoLine = size === 'two-line';
  return (
    <div
      {...divProps}
      aria-selected={isSelected}
      className={cn(
        'flex items-center gap-12 rounded-control px-12 py-4 select-none',
        isTwoLine ? 'h-52' : 'h-36',
        'transition-colors duration-faster ease-fade',
        isSelected
          ? 'bg-control-alt-fill-tertiary'
          : 'bg-subtle-fill-transparent hover:bg-subtle-fill-secondary',
        className,
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center',
          isTwoLine ? 'size-icon-32' : 'size-icon-16',
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col items-start overflow-clip">
        <p className="w-full truncate type-body text-text-fill-primary">{title}</p>
        {isTwoLine && isSubtitleShown && (
          <p className="w-full truncate type-caption text-text-fill-secondary">{subtitle}</p>
        )}
      </div>
      {isTrailingShown && (
        <p className="shrink-0 type-caption whitespace-nowrap text-text-fill-tertiary">
          {trailing}
        </p>
      )}
    </div>
  );
}
