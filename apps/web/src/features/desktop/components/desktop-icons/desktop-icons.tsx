import type { JSX, ReactNode } from 'react';

import { Asset, FileItem, ImageAsset } from '@seojaewan/design-system';

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
  /** 선택된 아이콘이면 선택 바탕을 깐다 */
  selected?: boolean;
};

type DesktopIconsProps = {
  /** 피그마 icons 프레임의 아이콘. 격자 순서(위에서 아래, 그다음 왼쪽에서 오른쪽)대로 놓는다 */
  icons: readonly DesktopIcon[];
  /** 아이콘 크기. 피그마 조립은 보통 아이콘이다 */
  iconView?: DesktopIconView;
  /** 아이콘을 열었을 때 부른다. 데스크톱은 더블클릭, 모바일은 탭(클릭)으로 연다(`iconOpenGesture`) */
  onIconOpen?: (icon: DesktopIcon) => void;
  /** 아이콘을 여는 동작. 데스크톱은 double-click, 모바일은 click이다 */
  iconOpenGesture?: 'double-click' | 'click';
};

/**
 * 아이콘 종류에 맞는 자산(피그마 file/Recycle Bin Empty·Full, file/Folder, file/Document, file/Link)을 그린다.
 * 크기는 FileItem의 아이콘 칸이 정한다.
 * @codocs [[바탕화면:표시하는 항목]]
 * @param icon 바탕화면 아이콘
 * @returns 아이콘
 */
function renderDesktopIcon(icon: DesktopIcon): ReactNode {
  switch (icon.kind) {
    case 'recycle-bin':
      return (
        <ImageAsset
          name={
            icon.full === true
              ? 'images/file-recycle-bin-full.png'
              : 'images/file-recycle-bin-empty.png'
          }
          className="size-full object-contain"
        />
      );
    case 'folder':
      return <ImageAsset name="images/file-folder.png" className="size-full object-contain" />;
    case 'post':
      return <ImageAsset name="images/file-document.png" className="size-full object-contain" />;
    case 'link':
      return <Asset name="illustrations/file-link.svg" className="size-full" />;
  }
}

/**
 * 바탕화면 아이콘 격자(피그마 `Desktop/Scene`의 icons 프레임)를 그린다. 놓인 영역을 꽉 채우고,
 * 아이콘은 열 우선 격자 순서로 채우며 한 열이 차면 다음 열로 넘어간다. 영역의 크기와 위치는 쓰는 곳(화면 배치)이 정한다.
 * 아이콘을 열면(데스크톱은 더블클릭, 모바일은 탭) `onIconOpen`으로 알린다.
 * 아이콘 선택·드래그·격자 칸 지정, 우클릭 메뉴 같은 동작은 기능을 구현할 때 붙인다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[모바일:차이]]
 * @codocs [[바탕화면:아이콘 배치]]
 * @param props
 */
export function DesktopIcons(props: DesktopIconsProps): JSX.Element {
  const { icons, iconView = 'medium', onIconOpen, iconOpenGesture = 'double-click' } = props;
  return (
    <div className="flex size-full flex-col flex-wrap content-start items-start gap-16 p-8">
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
          return (
            <FileItem
              key={icon.id}
              surface="desktop"
              view={iconView}
              name={icon.name}
              icon={renderDesktopIcon(icon)}
              selected={icon.selected}
              onDoubleClick={handleDoubleClick}
              onClick={handleClick}
            />
          );
        },
      )}
    </div>
  );
}
