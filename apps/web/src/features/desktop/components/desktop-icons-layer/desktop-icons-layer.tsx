import type { JSX } from 'react';

import { useOpenApp } from '@/core/window/window';
import type { DesktopIcon } from '@/features/desktop/components/desktop-icons/desktop-icons';
import { DesktopIcons } from '@/features/desktop/components/desktop-icons/desktop-icons';
import { INITIAL_DESKTOP_ITEMS } from '@/features/desktop/data/desktop-items/desktop-items';
import { useDevice } from '@/shared/hooks/use-device/use-device';

// 데스크톱은 아이콘을 더블클릭해서, 모바일은 탭해서 연다.
const ICON_OPEN_GESTURES = { desktop: 'double-click', mobile: 'click' } as const;

/**
 * 바탕화면 아이콘(`DesktopIcons`)을 그리고 창 저장소에 잇는 층이다. 아이콘을 열면 그 항목을 연다.
 * 폴더(`Blog`)는 새 탐색기 창이다. 휴지통과 외부 링크는 다음 단계에서 붙인다.
 * @codocs [[바탕화면:표시하는 항목]]
 * @codocs [[창 동작:열기 규칙]]
 * @codocs [[모바일:차이]]
 * @returns 바탕화면 아이콘
 */
export function DesktopIconsLayer(): JSX.Element {
  const device = useDevice();
  const openApp = useOpenApp();

  /**
   * 바탕화면 아이콘을 열면 그 항목을 연다.
   * @param icon 연 아이콘
   */
  function handleIconOpen(icon: DesktopIcon): void {
    if (icon.kind === 'folder') {
      openApp('file-explorer');
    }
  }

  return (
    <DesktopIcons
      icons={INITIAL_DESKTOP_ITEMS}
      iconOpenGesture={ICON_OPEN_GESTURES[device]}
      onIconOpen={handleIconOpen}
    />
  );
}
