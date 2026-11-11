import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { RenameField } from '../rename-field/rename-field';

type FileItemProps = Omit<ComponentProps<'div'>, 'children'> & {
  surface?: 'desktop' | 'explorer';
  size?: 'large' | 'medium' | 'small';
  name?: string;
  icon: ReactNode;
  isSelected?: boolean;
  isCut?: boolean;
  isRenaming?: boolean;
  isCurrent?: boolean;
  isListFocused?: boolean;
  renameFieldProps?: Omit<ComponentProps<typeof RenameField>, 'text' | 'className' | 'isMultiline'>;
};

const WIDTH_CLASS_NAMES = {
  desktop: {
    large: 'w-size-file-item-large-width',
    medium: 'w-size-file-item-desktop-width',
    small: 'w-size-file-item-desktop-width',
  },
  explorer: {
    large: 'w-size-file-item-large-width',
    medium: 'w-size-file-item-explorer-width',
    small: 'w-size-file-item-explorer-width',
  },
} as const;

const ICON_SIZE_CLASS_NAMES = {
  large: 'size-size-icon-4xl',
  medium: 'size-size-icon-2xl',
  small: 'size-size-icon-xl',
} as const;

/**
 * 바탕화면 항목의 바탕 클래스를 고른다. 이름을 바꾸는 중이면 선택돼 있어도 바탕 없이 입력창만 보인다(피그마 State=Rename).
 * @codocs [[항목과 폴더:폴더 이름]]
 * @param isSelected 선택 여부
 * @param isRenaming 이름 바꾸기 여부
 * @returns 바탕 클래스
 */
function desktopBackgroundClassName(isSelected: boolean, isRenaming: boolean): string {
  if (isRenaming) return 'bg-color-white-0';
  if (isSelected) return 'bg-color-white-25';
  return 'bg-color-white-0 hover:bg-color-white-15';
}

/**
 * 탐색기 항목의 바탕 클래스를 고른다. 선택 바탕(이름 바꾸는 중 포함)은 항목을 담은 목록(`role="listbox"`)에 포커스가 있으면
 * 파랑(피그마 State=Selected), 없으면 회색(State=Selected unfocused)이다. 목록 밖에 그리는 항목은 `isListFocused`로 파랑을 고른다.
 * @codocs [[컴포넌트 목록:상태]]
 * @param hasSelectionBackground 선택 바탕을 깔지 여부
 * @param isListFocused 목록에 포커스가 있는 모습으로 그릴지 여부
 * @returns 바탕 클래스
 */
function explorerBackgroundClassName(
  hasSelectionBackground: boolean,
  isListFocused: boolean,
): string {
  if (!hasSelectionBackground) return 'bg-color-white-0 hover:bg-color-blue-5';
  if (isListFocused) return 'bg-color-blue-9';
  return 'bg-color-gray-13 in-[[role=listbox]:focus-within]:bg-color-blue-9';
}

/**
 * 탐색기 현재 항목의 1px 안쪽 선 클래스를 고른다. 색은 선택 바탕과 같이 목록 포커스로 고른다(검정·회색).
 * @codocs [[파일 탐색기:조작]]
 * @param isListFocused 목록에 포커스가 있는 모습으로 그릴지 여부
 * @returns 선 클래스
 */
function explorerCurrentLineClassName(isListFocused: boolean): string {
  if (isListFocused) return 'inner-border-color-black-89 inner-border-w-stroke-width-default';
  return 'inner-border-color-gray-39 inner-border-w-stroke-width-default in-[[role=listbox]:focus-within]:inner-border-color-black-89';
}

/**
 * 바탕화면과 탐색기의 큰 아이콘·보통 아이콘·작은 아이콘 보기에서 파일이나 폴더 하나(피그마 FileItem)를 그린다.
 * 너비는 Windows가 정한 크기로 고정하고 높이는 내용에 맞춘다(HUG). Rest·Hover는 CSS hover로 바꾸고,
 * 선택·잘라냄·이름 바꾸기·현재 항목은 prop으로 바꾼다. 선은 1px 안쪽 선으로 겹쳐 그려 크기를 바꾸지 않는다.
 * - 바탕화면: 포커스(State=Focused) 선은 prop 없이 키보드 포커스(`:focus-visible`)일 때 선택과 상관없이 그린다.
 *   이름을 바꾸는 중이면 선택·호버 바탕을 그리지 않는다.
 * - 탐색기: 현재 항목(`isCurrent`, 피그마 Current=True)이면 포커스와 상관없이 선을 늘 그린다. 선택 바탕과 선의 색은
 *   prop이 아니라 항목을 담은 목록(`role="listbox"`)의 포커스로 고른다(`in-[[role=listbox]:focus-within]:`).
 *   포커스가 목록 안에 있으면 파란 바탕·검은 선(State=Selected), 아니면 회색 바탕·회색 선(State=Selected unfocused)이다.
 *   목록 밖에 그리는 항목(끄는 복제본)은 `isListFocused`로 늘 파란 모습을 고른다.
 * 이름 바꾸기 입력창은 여러 줄 RenameField라 항목 너비 안에서 줄을 바꾸며 아래로 길어진다.
 * @codocs [[컴포넌트 목록:상태]]
 * @codocs [[피그마 연동:컨트롤 테두리 구현]]
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @codocs [[항목과 폴더:폴더 이름]]
 * @codocs [[항목 조작:끌기]]
 * @param props 컴포넌트 속성
 * @param props.surface 피그마 Surface. 바탕화면(기본)이나 탐색기
 * @param props.size 피그마 Size. 탐색기에는 작은 아이콘(small) 보기가 없다
 * @param props.name 피그마 TEXT 속성 Name. 항목 이름이다
 * @param props.icon 피그마 INSTANCE_SWAP 속성 Icon. 파일·폴더 아이콘은 쓰는 곳마다 달라 꼭 넘긴다. 크기는 Size가 정한 칸에 맞춘다
 * @param props.isSelected 피그마 State=Selected. 선택된 항목이면 바탕을 깔고 이름을 모두 보인다
 * @param props.isCut 피그마 State=Cut·Cut selected. 잘라낸 항목이면 아이콘과 이름을 흐리게 그린다
 * @param props.isRenaming 피그마 State=Rename. 이름 대신 이름 바꾸기 입력 상자를 그린다. 탐색기에서는 선택 바탕을 함께 깔고,
 *   바탕화면에서는 선택돼 있어도 바탕을 깔지 않는다
 * @param props.isCurrent 피그마 Current. 탐색기에서 목록의 현재 항목이면 1px 안쪽 선을 그린다. 바탕화면에서는 쓰지 않는다
 * @param props.isListFocused 탐색기 항목을 목록에 포커스가 있는 모습(파란 선택 바탕·검은 선)으로 늘 그린다.
 *   목록(`role="listbox"`) 밖에 그리는 끄는 복제본이 쓴다. 바탕화면에서는 쓰지 않는다
 * @param props.renameFieldProps 이름 바꾸기 입력창(RenameField)에 넘길 값·동작·접근성 속성(`value`, `onValueChange`, `onKeyDown`, `onBlur`, `aria-label` 등).
 *   생김새는 바꾸지 않는다. `isRenaming`일 때만 쓴다
 * @param props.className 덧붙이거나 덮어쓸 클래스
 */
export function FileItem({
  surface = 'desktop',
  size = 'large',
  name = '파일 이름',
  icon,
  isSelected = false,
  isCut = false,
  isRenaming = false,
  isCurrent = false,
  isListFocused = false,
  renameFieldProps,
  className,
  ...divProps
}: FileItemProps): JSX.Element {
  const isDesktop = surface === 'desktop';
  const dimClassName = isCut ? 'opacity-opacity-cut' : undefined;
  return (
    <div
      {...divProps}
      // 선택·잘라냄 상태를 속성으로 알린다. 바탕, 이름 줄임, 흐림이 이 값을 따른다.
      data-selected={isSelected}
      data-cut={isCut}
      className={cn(
        // 선은 아래 안쪽 선 고리로 그리므로 브라우저 기본 외곽선은 그리지 않는다.
        'relative isolate flex flex-col items-center rounded-radius-control outline-none select-none',
        isDesktop ? 'gap-spacing-2xs px-spacing-2xs py-spacing-xs' : 'gap-spacing-xs p-spacing-xs',
        WIDTH_CLASS_NAMES[surface][size],
        isDesktop
          ? desktopBackgroundClassName(isSelected, isRenaming)
          : explorerBackgroundClassName(isSelected || isRenaming, isListFocused),
        isDesktop
          ? 'focus-visible:inner-border-color-white-50 focus-visible:inner-border-w-stroke-width-default'
          : isCurrent && explorerCurrentLineClassName(isListFocused),
        className,
      )}
    >
      <div
        className={cn(
          'flex shrink-shrink-none items-center justify-center [&>*]:size-full [&>*]:object-contain',
          ICON_SIZE_CLASS_NAMES[size],
          dimClassName,
        )}
      >
        {icon}
      </div>
      {isRenaming ? (
        <RenameField {...renameFieldProps} text={name} isMultiline />
      ) : (
        <span
          className={cn(
            'w-full text-center type-caption wrap-break-word',
            isDesktop
              ? 'text-color-white text-shadow-elevation-desktop-label'
              : 'text-color-black-89',
            isSelected ? undefined : 'line-clamp-line-clamp-two',
            dimClassName,
          )}
        >
          {name}
        </span>
      )}
    </div>
  );
}
