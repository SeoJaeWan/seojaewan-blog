import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';

type ListItemCommonProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  isSelected?: boolean;
  title?: string;
  icon: ReactNode;
  hasTrailing?: boolean;
  trailing?: string;
};

type ListItemProps = ListItemCommonProps &
  (
    | {
        size?: 'compact';
        subtitle?: never;
        hasSubtitle?: never;
      }
    | {
        size: 'two-line';
        subtitle?: string;
        hasSubtitle?: boolean;
      }
  );

/**
 * 아이콘·제목·보조 정보가 있는 목록 한 줄(피그마 ListItem)을 그린다. Start 목록·검색 결과·주소창 추천에 쓴다.
 * 너비는 쓰는 곳이 정한다(피그마 원본은 400). Rest·Hover·Selected 모양은 isSelected와 CSS hover로 바꾼다.
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param props 컴포넌트 속성
 * @param props.isSelected 피그마 State=Selected. 지금 고른 항목이면 바탕을 깐다. Hover는 CSS hover로 그린다
 * @param props.title 피그마 TEXT 속성 Title. 항목 제목이다. 길면 한 줄로 말줄임한다
 * @param props.icon 피그마 INSTANCE_SWAP 속성 Icon. 제목 앞 아이콘이다. 항목마다 다르므로 필수이며, 자리 크기(16 또는 32)는 컴포넌트가 정한다
 * @param props.hasTrailing 피그마 BOOLEAN 속성 Has trailing. 오른쪽 보조 글자를 보일지 정한다
 * @param props.trailing 피그마 TEXT 속성 Trailing. 오른쪽 보조 글자다
 * @param props.size 피그마 Size. `compact`는 제목만 있는 한 줄(높이 36, 아이콘 16), `two-line`은 제목과 부제 두 줄(높이 52,
 *   아이콘 32)이다
 * @param props.subtitle (two-line) 피그마 TEXT 속성 Subtitle. 제목 아래 부제다
 * @param props.hasSubtitle (two-line) 피그마 BOOLEAN 속성 Has subtitle. 부제를 보일지 정한다
 * @param props.role 줄의 접근성 역할. `option`이면 선택 상태를 `aria-selected`로 알린다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function ListItem({
  isSelected = false,
  title = '항목 이름',
  icon,
  hasTrailing = false,
  trailing = '부가 정보',
  size = 'compact',
  subtitle = '보조 설명',
  hasSubtitle = true,
  role,
  className,
  ...divProps
}: ListItemProps): JSX.Element {
  const isTwoLine = size === 'two-line';
  return (
    <div
      role={role}
      // aria-selected는 option 역할에서만 뜻이 있다. 다른 역할의 줄은 쓰는 곳이 aria-current 등으로 알린다.
      aria-selected={role === 'option' ? isSelected : undefined}
      {...divProps}
      className={cn(
        'flex items-center gap-spacing-md rounded-radius-control px-spacing-md py-spacing-xs select-none',
        isTwoLine ? 'h-size-list-item-two-line-height' : 'h-size-list-item-compact-height',
        'motion-control-state',
        isSelected ? 'bg-color-black-6' : 'bg-color-white-0 hover:bg-color-black-4',
        className,
      )}
    >
      <span
        className={cn(
          'flex shrink-shrink-none items-center justify-center [&>*]:size-full [&>*]:object-contain',
          isTwoLine ? 'size-size-icon-xl' : 'size-size-icon-sm',
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-size-none flex-flex-fill flex-col items-start overflow-clip">
        <p className="w-full truncate type-body text-color-black-89">{title}</p>
        {isTwoLine && hasSubtitle && (
          <p className="w-full truncate type-caption text-color-black-61">{subtitle}</p>
        )}
      </div>
      {hasTrailing && (
        <p className="shrink-shrink-none type-caption whitespace-nowrap text-color-black-56">
          {trailing}
        </p>
      )}
    </div>
  );
}
