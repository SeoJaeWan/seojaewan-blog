import type { JSX } from 'react';

import type { DesktopIcon } from '@/features/desktop/components/desktop-icons/desktop-icons';
import { DesktopIcons } from '@/features/desktop/components/desktop-icons/desktop-icons';
import { useDevice } from '@/shared/hooks/use-device/use-device';
import { useOpenItem } from '@/shared/hooks/use-open-item/use-open-item';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';
import { getDesktopItems, isRecycleBinFull } from '@/shared/utils/workspace-rules/workspace-rules';

// 데스크톱은 아이콘을 더블클릭해서, 모바일은 탭해서 연다.
const ICON_OPEN_GESTURES = { desktop: 'double-click', mobile: 'click' } as const;

/**
 * 바탕화면 아이콘(`DesktopIcons`)을 작업 공간 저장소에 잇는 층이다. 상위 폴더가 없는 항목과 휴지통을 저장소의 차례대로 보여 주고,
 * 휴지통은 항목이 하나라도 있으면 찬 모양이다. 아이콘 크기는 바탕화면 설정을 따른다.
 * 아이콘을 열면 `useOpenItem`으로 그 항목을 연다(폴더·휴지통은 탐색기, 글은 Chrome, 외부 링크는 실제 브라우저의 새 탭).
 * 선택·드래그·격자 칸·우클릭 메뉴는 바탕화면 단계에서 붙인다.
 * @codocs [[바탕화면:표시하는 항목]]
 * @codocs [[창 동작:열기 규칙]]
 * @codocs [[모바일:차이]]
 * @returns 바탕화면 아이콘
 */
export function DesktopIconsLayer(): JSX.Element {
  const device = useDevice();
  const openItem = useOpenItem();
  const items = useWorkspaceStore((state) => state.items);
  const iconSize = useWorkspaceStore((state) => state.desktop.iconSize);
  const isFull = isRecycleBinFull({ items });
  const icons: DesktopIcon[] = getDesktopItems({ items }).map(
    /**
     * 작업 공간 항목을 바탕화면 아이콘으로 바꾼다.
     * @param item 바탕화면 항목
     * @returns 바탕화면 아이콘
     */
    (item) => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      full: item.kind === 'recycle-bin' ? isFull : undefined,
    }),
  );

  /**
   * 바탕화면 아이콘을 열면 그 항목을 연다.
   * @param icon 연 아이콘
   */
  function handleIconOpen(icon: DesktopIcon): void {
    openItem(icon.id);
  }

  return (
    <DesktopIcons
      icons={icons}
      iconView={iconSize}
      iconOpenGesture={ICON_OPEN_GESTURES[device]}
      onIconOpen={handleIconOpen}
    />
  );
}
