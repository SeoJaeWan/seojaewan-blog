import type { JSX } from 'react';
import { createPortal } from 'react-dom';

import { FileItem, Tooltip } from '@seojaewan/design-system';

import { DesktopIconImage } from '@/features/desktop/components/desktop-icon-image/desktop-icon-image';
import type {
  DesktopIcon,
  DesktopIconView,
} from '@/features/desktop/components/desktop-icons/desktop-icons';
import type { GridPoint } from '@/features/desktop/utils/desktop-grid/desktop-grid';
import { getCellOrigin } from '@/features/desktop/utils/desktop-grid/desktop-grid';

type DesktopDragGhostProps = {
  /** 끄는 아이콘. 칸이 있는 아이콘만 그린다 */
  icons: readonly DesktopIcon[];
  /** 아이콘 크기 */
  iconView: DesktopIconView;
  /** 아이콘 영역 왼쪽 위의 화면 자리(px). 칸 자리를 화면 자리로 바꾸는 데 쓴다 */
  areaOrigin: GridPoint;
  /** 누른 자리에서 움직인 거리(px) */
  delta: GridPoint;
  /** 지금 포인터 자리(화면 기준) */
  pointer: GridPoint;
  /** 포인터 아래 놓을 곳(폴더·휴지통)의 이름. 있으면 `○○(으)로 이동` 툴팁을 띄운다 */
  targetName: string | null;
};

// `○○(으)로 이동` 툴팁을 포인터에서 떨어뜨리는 거리(px). Windows처럼 포인터 오른쪽 아래에 띄운다.
const TOOLTIP_OFFSET = 16;

/**
 * 아이콘을 끄는 동안 포인터를 따라가는 반투명한 복제본과 `○○(으)로 이동` 툴팁을 그린다.
 * 끄는 아이콘마다 원래 칸 자리에서 움직인 거리만큼 옮겨 그리고, 반투명한 모양은 디자인 시스템 FileItem의 잘라낸 항목 모양(`cut`)을 쓴다.
 * 창 위로 끌어도 가려지지 않게 문서 끝(body)에 포털해 화면 기준으로 그리고, 포인터 아래의 놓을 곳을 찾을 수 있게 포인터를 받지 않는다.
 * @codocs [[바탕화면:아이콘 조작]]
 * @param props
 */
export function DesktopDragGhost(props: DesktopDragGhostProps): JSX.Element {
  const { icons, iconView, areaOrigin, delta, pointer, targetName } = props;
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-10">
      {icons.map(
        /**
         * 끄는 아이콘 하나의 복제본을 그린다.
         * @param icon 끄는 아이콘
         * @returns 복제본. 칸이 없으면 그리지 않는다
         */
        (icon) => {
          if (icon.cell === undefined) {
            return null;
          }
          const origin = getCellOrigin(icon.cell, iconView);
          return (
            <FileItem
              key={icon.id}
              surface="desktop"
              view={iconView}
              name={icon.name}
              icon={<DesktopIconImage kind={icon.kind} full={icon.full} />}
              cut
              aria-hidden="true"
              className="absolute"
              style={{
                left: areaOrigin.x + origin.x + delta.x,
                top: areaOrigin.y + origin.y + delta.y,
              }}
            />
          );
        },
      )}
      {targetName !== null && (
        <Tooltip
          text={`${targetName}(으)로 이동`}
          className="absolute"
          style={{ left: pointer.x + TOOLTIP_OFFSET, top: pointer.y + TOOLTIP_OFFSET }}
        />
      )}
    </div>,
    document.body,
  );
}
