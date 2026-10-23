import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';
import { useState } from 'react';

import { ContextMenu, type ContextMenuEntry } from './context-menu';

// 피그마 조립 Menu/Folder와 같은 데이터다([[피그마 연동:스토리 규칙]]).
const folderItems: readonly ContextMenuEntry[] = [
  { label: '열기', icon: 'icons/ic_fluent_open_20_regular.svg' },
  { label: '새 창에서 열기', icon: 'icons/ic_fluent_window_20_regular.svg' },
  { label: '시작 화면에 고정', icon: 'icons/ic_fluent_pin_20_regular.svg' },
  { separator: true },
  {
    label: '이름 바꾸기',
    icon: 'icons/ic_fluent_rename_20_regular.svg',
    shortcut: 'F2',
  },
  {
    label: '삭제',
    icon: 'icons/ic_fluent_delete_20_regular.svg',
    shortcut: 'Delete',
  },
];

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 캡처 도구가 이 제목으로 피그마 조립과 짝짓는다.
const meta = {
  title: 'Patterns/Menu/Folder',
  render: () => <OpenFolderMenu />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * 스토리 루트 안에 열린 폴더 메뉴를 그린다. 메뉴 바탕을 캡처 대상으로 표시한다.
 */
function OpenFolderMenu(): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setAnchor}>
      {anchor !== null && (
        <ContextMenu
          items={folderItems}
          open
          anchor={anchor}
          container={anchor}
          data-parity-target
        />
      )}
    </div>
  );
}
