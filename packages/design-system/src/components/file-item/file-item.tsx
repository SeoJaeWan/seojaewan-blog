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
  renameFieldProps?: Omit<ComponentProps<typeof RenameField>, 'text' | 'className'>;
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
 * 바탕화면과 탐색기의 큰 아이콘·보통 아이콘·작은 아이콘 보기에서 파일이나 폴더 하나(피그마 FileItem)를 그린다.
 * 너비는 Windows가 정한 크기로 고정하고 높이는 내용에 맞춘다(HUG). Rest·Hover는 CSS hover로 바꾸고,
 * 선택·잘라냄·이름 바꾸기는 prop으로 바꾼다. 포커스(State=Focused)는 prop 없이 키보드 포커스(`:focus-visible`)일 때
 * 선택과 상관없이 1px 선을 안쪽에 겹쳐 그려 크기를 바꾸지 않는다.
 * @codocs [[컴포넌트 목록:상태]]
 * @codocs [[피그마 연동:컨트롤 테두리 구현]]
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @param props 컴포넌트 속성
 * @param props.surface 피그마 Surface. 바탕화면(기본)이나 탐색기
 * @param props.size 피그마 Size. 탐색기에는 작은 아이콘(small) 보기가 없다
 * @param props.name 피그마 TEXT 속성 Name. 항목 이름이다
 * @param props.icon 피그마 INSTANCE_SWAP 속성 Icon. 파일·폴더 아이콘은 쓰는 곳마다 달라 꼭 넘긴다. 크기는 Size가 정한 칸에 맞춘다
 * @param props.isSelected 피그마 State=Selected. 선택된 항목이면 바탕을 깔고 이름을 모두 보인다
 * @param props.isCut 피그마 State=Cut·Cut selected. 잘라낸 항목이면 아이콘과 이름을 흐리게 그린다
 * @param props.isRenaming 피그마 State=Rename. 이름 대신 이름 바꾸기 입력 상자를 그린다. 탐색기에서는 선택 바탕을 함께 깐다
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
        // 포커스 선은 아래 `focus-visible:` 고리로 그리므로 브라우저 기본 외곽선은 그리지 않는다.
        'relative flex flex-col items-center rounded-radius-control outline-none select-none',
        isDesktop ? 'gap-spacing-2xs px-spacing-2xs py-spacing-xs' : 'gap-spacing-xs p-spacing-xs',
        WIDTH_CLASS_NAMES[surface][size],
        isSelected || (isRenaming && !isDesktop)
          ? isDesktop
            ? 'bg-color-white-25'
            : 'bg-color-blue-9'
          : isRenaming
            ? 'bg-color-white-0'
            : isDesktop
              ? 'bg-color-white-0 hover:bg-color-white-15'
              : 'bg-color-white-0 hover:bg-color-blue-5',
        'focus-visible:inner-border-w-stroke-width-default',
        isDesktop
          ? 'focus-visible:inner-border-color-white-50'
          : 'focus-visible:inner-border-color-blue-18',
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
        <RenameField {...renameFieldProps} text={name} />
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
