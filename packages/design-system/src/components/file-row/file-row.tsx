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
  isCurrent?: boolean;
  renameFieldProps?: Omit<ComponentProps<typeof RenameField>, 'text' | 'className'>;
};

// 이름 칸을 뺀 칸(날짜·유형·위치)의 틀이다. 너비 토큰과 좌우 여백은 열 제목(DetailsHeader)과 같다.
const CELL_CLASS_NAME =
  'flex shrink-shrink-none items-center px-spacing-sm type-caption text-color-black-61';
const CELL_TEXT_CLASS_NAME = 'min-w-size-none flex-flex-fill truncate';

/**
 * 줄의 상태를 피그마 State 이름으로 돌려준다. 겉모습이 상태에 따라 바뀌므로 `data-state`로도 알린다.
 * 포커스 유무(Selected unfocused)는 목록 포커스로 정해지므로 여기서는 나누지 않는다.
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
 * 줄 너비는 칸 너비의 합이다(`inline-flex w-fit`). 칸 너비와 좌우 여백은 열 제목(DetailsHeader)과 같은 토큰이라,
 * 칸 글자가 열 제목 글자와 같은 x에서 시작하고 선택 바탕이 마지막 열 끝까지만 칠해진다.
 * Rest·Hover는 CSS hover로 바꾸고, 선택·잘라냄·이름 바꾸기·현재 항목은 prop으로 바꾼다.
 * 선택 바탕과 현재 항목 선의 색은 prop이 아니라 목록 포커스로 고른다. 줄을 담은 목록(`role="listbox"`)을 기준으로
 * (`in-[[role=listbox]:focus-within]:`) 포커스가 목록 안에 있을 때 파란 바탕·검은 선(피그마 State=Selected), 아닐 때 회색 바탕·회색 선(State=Selected unfocused)이다.
 * 현재 항목 선은 1px 안쪽 선으로 겹쳐 그려 크기를 바꾸지 않는다.
 * @codocs [[피그마 작업 검수:5. FileRow]]
 * @codocs [[바탕화면 검수:12. 탐색기 항목의 포커스 테두리]]
 * @codocs [[바탕화면 검수:13. 포커스가 없는 선택은 회색]]
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
 * @param props.isSelected 피그마 State=Selected·Selected unfocused. 선택된 줄이면 바탕을 깐다
 * @param props.isCut 피그마 State=Cut·Cut selected. 잘라낸 줄이면 아이콘과 이름을 흐리게 그린다
 * @param props.isRenaming 피그마 State=Rename. 이름 대신 이름 바꾸기 입력 상자를 그리고 선택 바탕을 깐다
 * @param props.isCurrent 피그마 Current. 목록의 현재 항목이면 1px 안쪽 선을 그린다
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
  isCurrent = false,
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
        // 현재 항목은 아래 안쪽 선 고리로 그리므로 브라우저 기본 외곽선은 그리지 않는다.
        'relative isolate inline-flex h-size-file-row-height w-fit items-center gap-spacing-none rounded-radius-control p-spacing-none outline-none select-none',
        isSelected || isRenaming
          ? 'bg-color-gray-13 in-[[role=listbox]:focus-within]:bg-color-blue-9'
          : 'bg-color-white-0 hover:bg-color-blue-5',
        isCurrent &&
          'inner-border-color-gray-39 inner-border-w-stroke-width-default in-[[role=listbox]:focus-within]:inner-border-color-black-89',
        className,
      )}
    >
      <div className="flex h-size-file-row-name-height w-size-details-header-name-width shrink-shrink-none items-center gap-spacing-sm overflow-clip px-spacing-sm">
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
          <div className={cn(CELL_CLASS_NAME, 'w-size-details-header-wide-width')}>
            <span className={CELL_TEXT_CLASS_NAME}>{originalLocation}</span>
          </div>
          <div className={cn(CELL_CLASS_NAME, 'w-size-details-header-narrow-width')}>
            <span className={CELL_TEXT_CLASS_NAME}>{deletedDate}</span>
          </div>
        </>
      ) : (
        <>
          <div className={cn(CELL_CLASS_NAME, 'w-size-details-header-wide-width')}>
            <span className={CELL_TEXT_CLASS_NAME}>{date}</span>
          </div>
          <div className={cn(CELL_CLASS_NAME, 'w-size-details-header-narrow-width')}>
            <span className={CELL_TEXT_CLASS_NAME}>{type}</span>
          </div>
          {hasLocation && (
            <div className={cn(CELL_CLASS_NAME, 'w-size-details-header-wide-width')}>
              <span className={CELL_TEXT_CLASS_NAME}>{location}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
