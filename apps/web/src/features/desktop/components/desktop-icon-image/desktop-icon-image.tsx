import type { JSX } from 'react';

import { Asset, ImageAsset } from '@seojaewan/design-system';

type DesktopIconImageProps = {
  /** 아이콘 종류 */
  kind: 'recycle-bin' | 'folder' | 'post' | 'link';
  /** 휴지통에 항목이 있으면 찬 모양으로 그린다. 휴지통에만 쓴다 */
  full?: boolean;
};

/**
 * 바탕화면 아이콘 종류에 맞는 자산(피그마 file/Recycle Bin Empty·Full, file/Folder, file/Document, file/Link)을 그린다.
 * 크기는 FileItem의 아이콘 칸이 정한다. 바탕화면 아이콘과 끄는 복제본이 함께 쓴다.
 * @codocs [[바탕화면:표시하는 항목]]
 * @param props
 */
export function DesktopIconImage(props: DesktopIconImageProps): JSX.Element {
  switch (props.kind) {
    case 'recycle-bin':
      return (
        <ImageAsset
          name={
            props.full === true ? 'images/file-recycle-bin-full' : 'images/file-recycle-bin-empty'
          }
          className="size-full object-contain"
        />
      );
    case 'folder':
      return <ImageAsset name="images/file-folder" className="size-full object-contain" />;
    case 'post':
      return <ImageAsset name="images/file-document" className="size-full object-contain" />;
    case 'link':
      return <Asset name="illustrations/file-link.svg" className="size-full" />;
  }
}
