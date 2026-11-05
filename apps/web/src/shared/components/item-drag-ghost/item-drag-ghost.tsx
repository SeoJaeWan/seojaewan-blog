import type { ComponentProps, JSX, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { FileItem, Tooltip } from '@seojaewan/design-system';

import type { PointerPoint } from '@/shared/hooks/use-pointer-drag/use-pointer-drag';

/** 끄는 항목 하나의 복제본. origin은 끌기 시작 때 항목의 화면 자리(px, 왼쪽 위)다. */
export type ItemDragGhostItem = {
  id: string;
  name: string;
  icon: ReactNode;
  origin: PointerPoint;
};

type ItemDragGhostProps = {
  items: readonly ItemDragGhostItem[];
  surface: NonNullable<ComponentProps<typeof FileItem>['surface']>;
  view: NonNullable<ComponentProps<typeof FileItem>['size']>;
  delta: PointerPoint;
  pointer: PointerPoint;
  targetName: string | null;
};

// `○○(으)로 이동` 툴팁을 포인터에서 떨어뜨리는 거리(px). Windows처럼 포인터 오른쪽 아래에 띄운다.
const TOOLTIP_OFFSET = 16;

/**
 * 항목을 끄는 동안 포인터를 따라가는 반투명한 복제본과 `○○(으)로 이동` 툴팁을 그린다. 바탕화면 아이콘과 탐색기 항목이 쓴다.
 * 끄는 항목마다 끌기 시작 때의 화면 자리에서 움직인 거리만큼 옮겨 그리고, 반투명한 모양은 디자인 시스템 FileItem의 잘라낸 항목 모양(`cut`)을 쓴다.
 * 창 위로 끌어도 가려지지 않게 문서 끝(body)에 포털해 화면 기준으로 그리고, 포인터 아래의 놓을 곳을 찾을 수 있게 포인터를 받지 않는다.
 * @codocs [[항목 조작:끌기]]
 * @codocs [[파일 탐색기:조작]]
 * @param props 컴포넌트 속성
 * @param props.items 끄는 항목
 * @param props.surface 복제본의 FileItem Surface. 바탕화면 아이콘이면 desktop, 탐색기 항목이면 explorer다
 * @param props.view 복제본의 FileItem Size
 * @param props.delta 누른 자리에서 움직인 거리(px)
 * @param props.pointer 지금 포인터 자리(화면 기준)
 * @param props.targetName 포인터 아래 놓을 곳의 이름. 있으면 `○○(으)로 이동` 툴팁을 띄운다
 */
export function ItemDragGhost({
  items,
  surface,
  view,
  delta,
  pointer,
  targetName,
}: ItemDragGhostProps): JSX.Element {
  return createPortal(
    <div className="pointer-events-none fixed inset-spacing-none z-layer-drag-ghost">
      {items.map(
        /**
         * 끄는 항목 하나의 복제본을 그린다.
         * @param item 끄는 항목
         * @returns 복제본
         */
        (item) => (
          <FileItem
            key={item.id}
            surface={surface}
            size={view}
            name={item.name}
            icon={item.icon}
            isCut
            aria-hidden="true"
            className="absolute"
            style={{ left: item.origin.x + delta.x, top: item.origin.y + delta.y }}
          />
        ),
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
