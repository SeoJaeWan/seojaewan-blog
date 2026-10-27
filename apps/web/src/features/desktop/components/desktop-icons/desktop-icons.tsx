import type { ComponentProps, JSX, ReactNode } from 'react';

import { FileItem } from '@seojaewan/design-system';

import { DesktopIconImage } from '@/features/desktop/components/desktop-icon-image/desktop-icon-image';
import { getCellOrigin } from '@/features/desktop/utils/desktop-grid/desktop-grid';
import type { GridCell } from '@/shared/utils/workspace-rules/workspace-rules';

/** 바탕화면 아이콘 종류. 폴더·글·외부 링크는 종류로, 휴지통은 찬 모양인지로 아이콘이 정해진다 */
export type DesktopIconKind = 'recycle-bin' | 'folder' | 'post' | 'link';

/** 바탕화면 아이콘 크기. 피그마 FileItem View(큰·보통·작은 아이콘)다 */
export type DesktopIconView = 'large' | 'medium' | 'small';

/** 바탕화면 아이콘 하나 */
export type DesktopIcon = {
  /** 항목 id */
  id: string;
  /** 아이콘 아래 이름 */
  name: string;
  /** 아이콘 종류 */
  kind: DesktopIconKind;
  /** 휴지통에 항목이 있으면 찬 모양으로 그린다. 휴지통에만 쓴다 */
  full?: boolean;
  /** 선택된 아이콘이면 선택 바탕을 깐다. 끌어 올린 놓을 곳(폴더·휴지통)의 강조도 이 모양이다 */
  selected?: boolean;
  /** 선택된 채 키보드 포커스를 받았으면 선을 그린다(피그마 FileItem `State=Selected focus`) */
  focused?: boolean;
  /** 이름 바꾸기 중이면 이름 대신 입력창을 그린다(피그마 FileItem `State=Rename`) */
  renaming?: boolean;
  /** 격자 칸. 모든 아이콘에 있으면 아이콘을 그 칸에 놓는다. 없으면 격자 순서대로 흘려 놓는다 */
  cell?: GridCell;
};

/** 아이콘(FileItem)마다 더하는 동작·접근성 속성 */
export type DesktopIconProps = Omit<
  ComponentProps<typeof FileItem>,
  'icon' | 'name' | 'surface' | 'view' | 'selected' | 'focused' | 'renaming' | 'cut' | 'className'
> & {
  /** 아이콘을 찾거나 놓을 곳을 표시하는 data 속성 */
  [attribute: `data-${string}`]: string | undefined;
};

type DesktopIconsProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 피그마 icons 프레임의 아이콘. 칸이 없으면 격자 순서(위에서 아래, 그다음 왼쪽에서 오른쪽)대로 놓는다 */
  icons: readonly DesktopIcon[];
  /** 아이콘 크기. 피그마 조립은 보통 아이콘이다 */
  iconView?: DesktopIconView;
  /** 아이콘을 열었을 때 부른다. 데스크톱은 더블클릭, 모바일은 탭(클릭)으로 연다(`iconOpenGesture`) */
  onIconOpen?: (icon: DesktopIcon) => void;
  /** 아이콘을 여는 동작. 데스크톱은 double-click, 모바일은 click이다 */
  iconOpenGesture?: 'double-click' | 'click';
  /** 아이콘마다 더할 동작·접근성 속성(선택, 끌기, 키보드, 이름 바꾸기 입력창). 앱의 층이 넘긴다 */
  getIconProps?: (icon: DesktopIcon) => DesktopIconProps;
  /** 아이콘 위에 겹쳐 그릴 것(끄는 사각형, 끄는 복제본, 툴팁, 말풍선) */
  overlay?: ReactNode;
};

/**
 * 바탕화면 아이콘 격자(피그마 `Desktop/Scene`의 icons 프레임)를 그린다. 놓인 영역을 꽉 채운다.
 * 아이콘에 격자 칸이 있으면 그 칸 자리에 놓고(앱), 없으면 열 우선 격자 순서로 채우며 한 열이 차면 다음 열로 넘어간다(조립 스토리).
 * 두 방법은 칸 크기와 간격이 같아 같은 차례면 같은 자리에 놓인다. 선택된 아이콘은 펼친 이름이 옆 아이콘을 덮게 위로 올린다.
 * 아이콘을 열면(데스크톱은 더블클릭, 모바일은 탭) `onIconOpen`으로 알린다. 선택·끌기·우클릭 같은 동작은 쓰는 곳이
 * 영역 속성과 `getIconProps`로 붙인다. 영역의 크기와 위치는 쓰는 곳(화면 배치)이 정한다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[모바일:차이]]
 * @codocs [[바탕화면:아이콘 배치]]
 * @param props
 */
export function DesktopIcons(props: DesktopIconsProps): JSX.Element {
  const {
    icons,
    iconView = 'medium',
    onIconOpen,
    iconOpenGesture = 'double-click',
    getIconProps,
    overlay,
    className,
    ...divProps
  } = props;
  const isPlaced = icons.length > 0 && icons.every((icon) => icon.cell !== undefined);
  return (
    <div
      {...divProps}
      className={[
        'size-full',
        // 칸에 놓을 때는 선택된 아이콘을 위로 올리는 쌓임 순서가 이 영역 안에서만 정해지게 한다(창 층 위로 올라오지 않게).
        isPlaced
          ? 'relative isolate'
          : 'flex flex-col flex-wrap content-start items-start gap-16 p-8',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icons.map(
        /**
         * 아이콘 하나를 그린다.
         * @param icon 바탕화면 아이콘
         * @returns FileItem
         */
        (icon) => {
          /** 아이콘을 열면 쓰는 곳에 알린다. */
          function handleOpen(): void {
            onIconOpen?.(icon);
          }
          const hasOpen = onIconOpen !== undefined;
          const handleDoubleClick =
            hasOpen && iconOpenGesture === 'double-click' ? handleOpen : undefined;
          const handleClick = hasOpen && iconOpenGesture === 'click' ? handleOpen : undefined;
          const origin = icon.cell === undefined ? null : getCellOrigin(icon.cell, iconView);
          return (
            <FileItem
              key={icon.id}
              onDoubleClick={handleDoubleClick}
              onClick={handleClick}
              {...getIconProps?.(icon)}
              surface="desktop"
              view={iconView}
              name={icon.name}
              icon={<DesktopIconImage kind={icon.kind} full={icon.full} />}
              selected={icon.selected}
              focused={icon.focused}
              renaming={icon.renaming}
              className={
                origin === null ? undefined : icon.selected === true ? 'absolute z-1' : 'absolute'
              }
              style={origin === null ? undefined : { left: origin.x, top: origin.y }}
            />
          );
        },
      )}
      {overlay}
    </div>
  );
}
