import type { ReactNode } from 'react';

import { Asset, ImageAsset } from '@seojaewan/design-system';

import type { ItemIconSource, StartApp } from '@/features/start-menu/utils/start-items/start-items';

// 앱별 아이콘(피그마 app/File Explorer, app/Chrome)이다.
const appIconNames = {
  'file-explorer': 'images/app-file-explorer',
  chrome: 'images/app-chrome',
} as const satisfies Record<StartApp, string>;

/**
 * 항목 아이콘(피그마 file/Folder, file/Document, file/Link, app/*)을 그린다. 크기는 담는 자리(ListItem, PinnedTile 등)가 정한다.
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param source 항목 종류(앱이면 어느 앱인지)
 * @returns 아이콘
 */
export function renderItemIcon(source: ItemIconSource): ReactNode {
  switch (source.kind) {
    case 'folder':
      return <ImageAsset name="images/file-folder" />;
    case 'post':
      return <ImageAsset name="images/file-document" />;
    case 'link':
      return <Asset name="illustrations/file-link.svg" />;
    case 'app':
      return <ImageAsset name={appIconNames[source.app]} />;
  }
}
