import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { RenameField } from '../rename-field/rename-field';

type FileRowProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 View. 휴지통(recycle-bin)이면 날짜·유형·위치 대신 원래 위치·삭제한 날짜 칸을 그린다 */
  view?: 'default' | 'recycle-bin';
  /** 피그마 TEXT 속성 Name. 파일 이름이다 */
  name?: string;
  /** 피그마 TEXT 속성 Date. 수정한 날짜다 */
  date?: string;
  /** 피그마 TEXT 속성 Type. 파일 유형이다 */
  type?: string;
  /** 피그마 TEXT 속성 Location. showLocation이 켜져 있을 때 보이는 위치다 */
  location?: string;
  /** 피그마 BOOLEAN 속성 Show location. 위치 칸을 보인다(View=Default에만 있다) */
  showLocation?: boolean;
  /** 피그마 TEXT 속성 Original location. View=Recycle bin에서 지우기 전 위치다 */
  originalLocation?: string;
  /** 피그마 TEXT 속성 Deleted date. View=Recycle bin에서 지운 날짜다 */
  deletedDate?: string;
  /** 피그마 INSTANCE_SWAP 속성 Icon. 이름 앞 16px 아이콘이다. 파일·폴더 아이콘은 쓰는 곳마다 달라 꼭 넘긴다 */
  icon: ReactNode;
  /** 피그마 State=Selected. 선택된 줄이면 바탕을 깐다 */
  selected?: boolean;
  /** 피그마 State=Selected focus. 선택된 채 포커스를 받으면 선을 그린다(selected와 함께 쓴다) */
  focused?: boolean;
  /** 피그마 State=Cut·Cut selected. 잘라낸 줄이면 아이콘과 이름을 흐리게 그린다 */
  cut?: boolean;
  /** 피그마 State=Rename. 이름 대신 이름 바꾸기 입력 상자를 그리고 선택 바탕을 깐다 */
  renaming?: boolean;
};

/**
 * 탐색기 자세히 보기의 파일 한 줄(피그마 FileRow)을 그린다. 이름·수정한 날짜·유형·위치 칸을 가진다.
 * 휴지통 보기(view='recycle-bin')는 이름·원래 위치·삭제한 날짜 칸을 가진다.
 * 너비는 쓰는 곳이 정한다(피그마 원본은 840). 칸 너비는 DetailsHeader의 열과 맞춰 고정한다.
 * Rest·Hover는 CSS hover로 바꾸고, 선택·포커스·잘라냄·이름 바꾸기는 prop으로 바꾼다.
 * 선은 피그마에서 레이아웃에 들어가므로 실제 border로 그린다.
 * @codocs [[컴포넌트 목록:상태]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param props
 */
export function FileRow(props: FileRowProps): JSX.Element {
  const {
    view = 'default',
    name = '파일 이름',
    date = '수정한 날짜',
    type = '유형',
    location = '위치',
    showLocation: isLocationShown = false,
    originalLocation = '원래 위치',
    deletedDate = '삭제한 날짜',
    icon,
    selected: isSelected = false,
    focused: isFocused = false,
    cut: isCut = false,
    renaming: isRenaming = false,
    className,
    ...divProps
  } = props;
  const dim = isCut ? 'opacity-cut' : undefined;
  return (
    <div
      {...divProps}
      className={cn(
        'flex h-control-height items-center gap-8 rounded-control px-8 py-0 select-none',
        isSelected || isRenaming
          ? 'bg-file-item-explorer-fill-selected'
          : 'bg-subtle-fill-transparent hover:bg-file-item-explorer-fill-hover',
        isSelected && isFocused && 'border-default border-file-item-explorer-stroke-selected-focus',
        className,
      )}
    >
      <div className="flex h-20 w-300 shrink-0 items-center gap-8 overflow-clip">
        <span className={cn('flex size-icon-16 shrink-0 items-center justify-center', dim)}>
          {icon}
        </span>
        {isRenaming ? (
          <RenameField text={name} aria-label="이름 바꾸기" />
        ) : (
          <span className={cn('min-w-px flex-1 truncate type-caption text-text-fill-primary', dim)}>
            {name}
          </span>
        )}
      </div>
      {view === 'recycle-bin' ? (
        <>
          <span className="w-180 shrink-0 truncate type-caption text-text-fill-secondary">
            {originalLocation}
          </span>
          <span className="w-140 shrink-0 truncate type-caption text-text-fill-secondary">
            {deletedDate}
          </span>
        </>
      ) : (
        <>
          <span className="w-180 shrink-0 truncate type-caption text-text-fill-secondary">
            {date}
          </span>
          <span className="w-140 shrink-0 truncate type-caption text-text-fill-secondary">
            {type}
          </span>
          {isLocationShown && (
            <span className="w-180 shrink-0 truncate type-caption text-text-fill-secondary">
              {location}
            </span>
          )}
        </>
      )}
    </div>
  );
}
