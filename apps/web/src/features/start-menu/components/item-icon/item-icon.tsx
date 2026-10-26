import type { ReactNode } from 'react';

import { Asset, ImageAsset } from '@seojaewan/design-system';

/** Start와 검색에 보이는 앱 */
export type StartApp = 'file-explorer' | 'chrome';

/** 아이콘을 정하는 항목 종류. 폴더·글·외부 링크는 종류만으로, 앱은 어느 앱인지로 아이콘이 정해진다 */
export type ItemIconSource = { kind: 'folder' | 'post' | 'link' } | { kind: 'app'; app: StartApp };

// 앱별 아이콘(피그마 app/File Explorer, app/Chrome)이다.
const appIconNames = {
  'file-explorer': 'images/app-file-explorer.png',
  chrome: 'images/app-chrome.png',
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
      return <ImageAsset name="images/file-folder.png" className="size-full object-contain" />;
    case 'post':
      return <ImageAsset name="images/file-document.png" className="size-full object-contain" />;
    case 'link':
      return <Asset name="illustrations/file-link.svg" className="size-full" />;
    case 'app':
      return <ImageAsset name={appIconNames[source.app]} className="size-full object-contain" />;
  }
}
