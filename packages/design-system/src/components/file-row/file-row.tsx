import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { RenameField } from '../rename-field/rename-field';

type FileRowProps = Omit<ComponentProps<'div'>, 'children'> & {
  view?: 'default' | 'recycle-bin';
  name?: string;
  date?: string;
  type?: string;
  location?: string;
  hasLocation?: boolean;
  originalLocation?: string;
  deletedDate?: string;
  icon: ReactNode;
  isSelected?: boolean;
  isCut?: boolean;
  isRenaming?: boolean;
  renameFieldProps?: Omit<ComponentProps<typeof RenameField>, 'text' | 'className'>;
};

/**
 * 줄의 상태를 피그마 State 이름으로 돌려준다. 겉모습이 상태에 따라 바뀌므로 `data-state`로도 알린다.
 * @param flags 상태 플래그
 * @param flags.isSelected 선택 여부
 * @param flags.isCut 잘라냄 여부
 * @param flags.isRenaming 이름 바꾸기 여부
 * @returns 상태 이름
 */
function fileRowState({
  isSelected,
  isCut,
  isRenaming,
}: {
  isSelected: boolean;
  isCut: boolean;
  isRenaming: boolean;
}): 'rest' | 'selected' | 'cut' | 'cut-selected' | 'rename' {
  if (isRenaming) return 'rename';
  if (isCut) return isSelected ? 'cut-selected' : 'cut';
  return isSelected ? 'selected' : 'rest';
}

/**
 * 탐색기 자세히 보기의 파일 한 줄(피그마 FileRow)을 그린다. 이름·수정한 날짜·유형·위치 칸을 가진다.
 * 휴지통 보기(view='recycle-bin')는 이름·원래 위치·삭제한 날짜 칸을 가진다.
 * 너비는 쓰는 곳이 정한다(피그마 원본은 840). 칸 너비는 DetailsHeader의 열과 맞춰 고정한다.
 * Rest·Hover는 CSS hover로 바꾸고, 선택·잘라냄·이름 바꾸기는 prop으로 바꾼다.
 * 포커스(State=Focused)는 prop 없이 키보드 포커스(`:focus-visible`)일 때 선택과 상관없이 1px 선을 안쪽에 겹쳐 그려
 * 크기를 바꾸지 않는다.
 * @codocs [[컴포넌트 목록:상태]]
 * @codocs [[피그마 연동:컨트롤 테두리 구현]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param props 컴포넌트 속성
 * @param props.view 피그마 View. 휴지통(recycle-bin)이면 날짜·유형·위치 대신 원래 위치·삭제한 날짜 칸을 그린다
 * @param props.name 피그마 TEXT 속성 Name. 파일 이름이다
 * @param props.date 피그마 TEXT 속성 Date. 수정한 날짜다
 * @param props.type 피그마 TEXT 속성 Type. 파일 유형이다
 * @param props.location 피그마 TEXT 속성 Location. hasLocation이 켜져 있을 때 보이는 위치다
 * @param props.hasLocation 피그마 BOOLEAN 속성 Has location. 위치 칸을 보인다(View=Default에만 있다)
 * @param props.originalLocation 피그마 TEXT 속성 Original location. View=Recycle bin에서 지우기 전 위치다
 * @param props.deletedDate 피그마 TEXT 속성 Deleted date. View=Recycle bin에서 지운 날짜다
 * @param props.icon 피그마 INSTANCE_SWAP 속성 Icon. 이름 앞 16px 아이콘이다. 파일·폴더 아이콘은 쓰는 곳마다 달라 꼭 넘긴다
 * @param props.isSelected 피그마 State=Selected. 선택된 줄이면 바탕을 깐다
 * @param props.isCut 피그마 State=Cut·Cut selected. 잘라낸 줄이면 아이콘과 이름을 흐리게 그린다
 * @param props.isRenaming 피그마 State=Rename. 이름 대신 이름 바꾸기 입력 상자를 그리고 선택 바탕을 깐다
 * @param props.renameFieldProps 이름 바꾸기 입력창(RenameField)에 넘길 값·동작·접근성 속성(`value`, `onValueChange`, `onKeyDown`, `onBlur`, `aria-label` 등).
 *   생김새는 바꾸지 않는다. `isRenaming`일 때만 쓴다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function FileRow({
  view = 'default',
  name = '파일 이름',
  date = '수정한 날짜',
  type = '유형',
  location = '위치',
  hasLocation = false,
  originalLocation = '원래 위치',
  deletedDate = '삭제한 날짜',
  icon,
  isSelected = false,
  isCut = false,
  isRenaming = false,
  renameFieldProps,
  className,
  ...divProps
}: FileRowProps): JSX.Element {
  const dimClassName = isCut ? 'opacity-opacity-cut' : undefined;
  return (
    <div
      data-state={fileRowState({ isSelected, isCut, isRenaming })}
      {...divProps}
      className={cn(
        // 포커스 선은 아래 `focus-visible:` 고리로 그리므로 브라우저 기본 외곽선은 그리지 않는다.
        'relative flex h-size-control-height items-center gap-spacing-sm rounded-radius-control px-spacing-sm py-spacing-none outline-none select-none',
        isSelected || isRenaming ? 'bg-color-blue-9' : 'bg-color-white-0 hover:bg-color-blue-5',
        'focus-visible:inner-border-color-blue-18 focus-visible:inner-border-w-stroke-width-default',
        className,
      )}
    >
      <div className="flex h-size-file-row-name-height w-size-file-row-name-width shrink-shrink-none items-center gap-spacing-sm overflow-clip">
        <span
          className={cn(
            'flex size-size-icon-sm shrink-shrink-none items-center justify-center [&>*]:size-full [&>*]:object-contain',
            dimClassName,
          )}
        >
          {icon}
        </span>
        {isRenaming ? (
          <RenameField aria-label="이름 바꾸기" {...renameFieldProps} text={name} />
        ) : (
          <span
            className={cn(
              'min-w-size-none flex-flex-fill truncate type-caption text-color-black-89',
              dimClassName,
            )}
          >
            {name}
          </span>
        )}
      </div>
      {view === 'recycle-bin' ? (
        <>
          <span className="w-size-file-row-wide-cell-width shrink-shrink-none truncate type-caption text-color-black-61">
            {originalLocation}
          </span>
          <span className="w-size-file-row-narrow-cell-width shrink-shrink-none truncate type-caption text-color-black-61">
            {deletedDate}
          </span>
        </>
      ) : (
        <>
          <span className="w-size-file-row-wide-cell-width shrink-shrink-none truncate type-caption text-color-black-61">
            {date}
          </span>
          <span className="w-size-file-row-narrow-cell-width shrink-shrink-none truncate type-caption text-color-black-61">
            {type}
          </span>
          {hasLocation && (
            <span className="w-size-file-row-wide-cell-width shrink-shrink-none truncate type-caption text-color-black-61">
              {location}
            </span>
          )}
        </>
      )}
    </div>
  );
}
