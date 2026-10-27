import type { PointerEvent as ReactPointerEvent } from 'react';
import { useState } from 'react';

import type { PointerPoint } from '@/features/desktop/hooks/use-pointer-drag/use-pointer-drag';
import { usePointerDrag } from '@/features/desktop/hooks/use-pointer-drag/use-pointer-drag';
import type { SelectionRect } from '@/features/desktop/utils/selection-rules/selection-rules';
import { getRectFromPoints } from '@/features/desktop/utils/selection-rules/selection-rules';

type UseMarqueeSelectionOptions = {
  /** 빈 곳을 누를 때 부른다. Ctrl(맥은 Cmd)을 누른 채면 더하기다 */
  onStart: (isAdditive: boolean) => void;
  /** 끄는 사각형이 바뀔 때 부른다. 사각형은 영역 왼쪽 위 기준이다 */
  onChange: (rect: SelectionRect) => void;
};

/** 끄는 사각형과 시작 핸들러 */
type MarqueeControls = {
  /** 지금 끄는 사각형(영역 왼쪽 위 기준). 끌지 않으면 null */
  marquee: SelectionRect | null;
  /** 영역의 빈 곳을 누르면 부른다. 받지 않는 누르기(터치, 오른쪽 버튼)면 false */
  startMarquee: (event: ReactPointerEvent<HTMLElement>) => boolean;
};

/**
 * 영역의 빈 곳에서 끌어 사각형으로 항목을 고른다(바탕화면). 사각형은 누른 요소(영역) 왼쪽 위를 원점으로 잰다.
 * 누르면 `onStart`로 선택을 비우거나(더하기가 아니면) 끌기 전 선택을 기억하게 하고, 끄는 동안 사각형을 알린다.
 * 그리는 것은 쓰는 곳이 디자인 시스템 `SelectionMarquee`로 한다.
 * @codocs [[바탕화면:아이콘 조작]]
 * @param options 시작과 바뀔 때 부를 함수
 * @returns 끄는 사각형과 시작 핸들러
 */
export function useMarqueeSelection(options: UseMarqueeSelectionOptions): MarqueeControls {
  const { onStart, onChange } = options;
  const startPointerDrag = usePointerDrag();
  const [marquee, setMarquee] = useState<SelectionRect | null>(null);

  /**
   * 빈 곳을 누르면 끄는 사각형을 시작한다.
   * @param event 누르기 이벤트
   * @returns 받은 누르기면 true
   */
  function startMarquee(event: ReactPointerEvent<HTMLElement>): boolean {
    const area = event.currentTarget.getBoundingClientRect();
    /**
     * 화면 자리를 영역 기준 자리로 바꾼다.
     * @param point 화면 자리
     * @returns 영역 기준 자리
     */
    function toLocal(point: PointerPoint): PointerPoint {
      return { x: point.x - area.left, y: point.y - area.top };
    }
    let start: PointerPoint = toLocal({ x: event.clientX, y: event.clientY });
    const isStarted = startPointerDrag(event, {
      onStart: (origin) => {
        start = toLocal(origin);
      },
      onMove: (point) => {
        const rect = getRectFromPoints(start, toLocal(point));
        setMarquee(rect);
        onChange(rect);
      },
      onDrop: () => {
        setMarquee(null);
      },
      onCancel: () => {
        setMarquee(null);
      },
    });
    if (isStarted) {
      onStart(event.ctrlKey || event.metaKey);
    }
    return isStarted;
  }

  return { marquee, startMarquee };
}
