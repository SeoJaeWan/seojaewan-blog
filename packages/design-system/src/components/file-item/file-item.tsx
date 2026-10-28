import type { ComponentProps, JSX, ReactNode } from 'react';

import { cn } from '../../cn';
import { RenameField } from '../rename-field/rename-field';

type FileItemProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 Surface. 바탕화면(기본)이나 탐색기 */
  surface?: 'desktop' | 'explorer';
  /** 피그마 View. 탐색기에는 작은 아이콘(small) 보기가 없다 */
  view?: 'large' | 'medium' | 'small';
  /** 피그마 TEXT 속성 Name. 항목 이름이다 */
  name?: string;
  /** 피그마 INSTANCE_SWAP 속성 Icon. 파일·폴더 아이콘은 쓰는 곳마다 달라 꼭 넘긴다. 크기는 View가 정한 칸에 맞춘다 */
  icon: ReactNode;
  /** 피그마 State=Selected. 선택된 항목이면 바탕을 깔고 이름을 모두 보인다 */
  selected?: boolean;
  /** 피그마 State=Focused. 포커스를 받으면 선택과 상관없이 1px 선을 겹쳐 그린다. 선은 크기에 넣지 않는다 */
  focused?: boolean;
  /** 피그마 State=Cut·Cut selected. 잘라낸 항목이면 아이콘과 이름을 흐리게 그린다 */
  cut?: boolean;
  /** 피그마 State=Rename. 이름 대신 이름 바꾸기 입력 상자를 그린다. 탐색기에서는 선택 바탕을 함께 깐다 */
  renaming?: boolean;
  /**
   * 이름 바꾸기 입력창(RenameField)에 넘길 값·동작·접근성 속성(`value`, `onValueChange`, `onKeyDown`, `onBlur`, `aria-label` 등).
   * 생김새는 바꾸지 않는다. `renaming`일 때만 쓴다
   */
  renameFieldProps?: Omit<ComponentProps<typeof RenameField>, 'text' | 'className'>;
};

const WIDTHS = {
  desktop: { large: 'w-112', medium: 'w-76', small: 'w-76' },
  explorer: { large: 'w-112', medium: 'w-88', small: 'w-88' },
} as const;

const ICON_SIZES = { large: 'size-96', medium: 'size-48', small: 'size-32' } as const;

/**
 * 바탕화면과 탐색기의 큰 아이콘·보통 아이콘·작은 아이콘 보기에서 파일이나 폴더 하나(피그마 FileItem)를 그린다.
 * 너비는 Windows가 정한 크기로 고정하고 높이는 내용에 맞춘다(HUG). Rest·Hover는 CSS hover로 바꾸고,
 * 선택·포커스·잘라냄·이름 바꾸기는 prop으로 바꾼다. 포커스 선은 안쪽에 겹쳐 그려 크기를 바꾸지 않는다.
 * @codocs [[컴포넌트 목록:상태]]
 * @codocs [[컴포넌트 목록:Windows 화면 요소]]
 * @param props
 */
export function FileItem(props: FileItemProps): JSX.Element {
  const {
    surface = 'desktop',
    view = 'large',
    name = '파일 이름',
    icon,
    selected: isSelected = false,
    focused: isFocused = false,
    cut: isCut = false,
    renaming: isRenaming = false,
    renameFieldProps,
    className,
    ...divProps
  } = props;
  const isDesktop = surface === 'desktop';
  const dim = isCut ? 'opacity-cut' : undefined;
  return (
    <div
      {...divProps}
      className={cn(
        // 포커스 표시는 `focused`로 그리므로 브라우저 기본 외곽선은 그리지 않는다.
        'relative flex flex-col items-center rounded-control outline-none select-none',
        isDesktop ? 'gap-2 px-2 py-4' : 'gap-4 p-4',
        WIDTHS[surface][view],
        isSelected || (isRenaming && !isDesktop)
          ? isDesktop
            ? 'bg-file-item-desktop-fill-selected'
            : 'bg-file-item-explorer-fill-selected'
          : isRenaming
            ? 'bg-subtle-fill-transparent'
            : isDesktop
              ? 'bg-subtle-fill-transparent hover:bg-file-item-desktop-fill-hover'
              : 'bg-subtle-fill-transparent hover:bg-file-item-explorer-fill-hover',
        isFocused &&
          (isDesktop
            ? 'inner-border-file-item-desktop-stroke-focus inner-border-w-default'
            : 'inner-border-file-item-explorer-stroke-focus inner-border-w-default'),
        className,
      )}
    >
      <div className={cn('flex shrink-0 items-center justify-center', ICON_SIZES[view], dim)}>
        {icon}
      </div>
      {isRenaming ? (
        <RenameField {...renameFieldProps} text={name} />
      ) : (
        <span
          className={cn(
            'w-full text-center type-caption wrap-break-word',
            isDesktop
              ? 'text-file-item-desktop-label text-shadow-elevation-desktop-label'
              : 'text-text-fill-primary',
            isSelected ? undefined : 'line-clamp-2',
            dim,
          )}
        >
          {name}
        </span>
      )}
    </div>
  );
}
