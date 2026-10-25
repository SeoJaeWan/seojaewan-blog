import type { RefObject } from 'react';
import { useLayoutEffect, useRef } from 'react';

import type { WindowBounds } from './window-rules';
import { getSnapFlip } from './window-rules';

// 최대화·복원·스냅 모션 클래스와 그 실행 중 값(motion.css)이다.
const SNAP_CLASS = 'motion-window-snap';
const SNAP_FROM_X = '--motion-window-snap-from-x';
const SNAP_FROM_Y = '--motion-window-snap-from-y';
const SNAP_FROM_SCALE_X = '--motion-window-snap-from-scale-x';
const SNAP_FROM_SCALE_Y = '--motion-window-snap-from-scale-y';

/** 마지막으로 그린 창 모습 */
type SnapMotionFrame = {
  /** 자리 */
  rect: WindowBounds;
  /** 배치를 가리키는 값(배치와 스냅 칸). 이 값이 바뀌면 최대화·복원·스냅이다 */
  layoutKey: string;
};

/**
 * 창이 최대화·복원·스냅으로 자리를 바꾸면 `motion-window-snap`을 FLIP으로 재생한다.
 * 창은 이미 새 자리로 바뀌어 있으므로, 이전 자리·크기에 맞추는 이동과 배율을 CSS 변수로 넣고 클래스를 뗐다가 다시 붙여
 * 같은 애니메이션을 처음부터 재생한다(뗀 뒤 `getBoundingClientRect`로 스타일을 다시 계산시켜야 다시 붙인 것이 새 재생이 된다).
 * - 이전 자리는 DOM을 재지 않고 지난번에 그린 계산값을 쓴다. 진행 중인 transform이 재는 값에 섞이지 않게 하기 위해서다.
 * - 작업 영역 크기만 바뀐 경우(배치가 그대로)는 움직이지 않는다.
 * - 클래스는 이 요소의 className prop에 두지 않고 classList로만 다룬다. React가 다시 그릴 때 덮어쓰지 않게 하기 위해서다.
 * - 열기·최소화 클래스는 바깥 요소가 갖고, 이 훅은 안쪽 요소에만 쓴다. 같은 요소에 두면 animation이 서로 덮는다.
 * @codocs [[디자인 기반:모션 클래스]]
 * @param ref 움직일 안쪽 요소
 * @param rect 지금 창 자리
 * @param layoutKey 배치를 가리키는 값
 * @param isEnabled 움직임을 켤지. 모바일, 끌기·크기 조절 중에는 끈다
 */
export function useWindowSnapMotion(
  ref: RefObject<HTMLElement | null>,
  rect: WindowBounds,
  layoutKey: string,
  isEnabled: boolean,
): void {
  const previousRef = useRef<SnapMotionFrame | null>(null);
  const { x, y, width, height } = rect;

  useLayoutEffect(
    /** 배치가 바뀌었으면 이전 자리에서 이어지게 재생하고, 지금 모습을 기억한다. */
    () => {
      const previous = previousRef.current;
      const current = { x, y, width, height };
      previousRef.current = { rect: current, layoutKey };
      const element = ref.current;
      if (element === null || previous === null || !isEnabled || previous.layoutKey === layoutKey) {
        return;
      }
      const flip = getSnapFlip(previous.rect, current);
      element.style.setProperty(SNAP_FROM_X, `${String(flip.x)}px`);
      element.style.setProperty(SNAP_FROM_Y, `${String(flip.y)}px`);
      element.style.setProperty(SNAP_FROM_SCALE_X, String(flip.scaleX));
      element.style.setProperty(SNAP_FROM_SCALE_Y, String(flip.scaleY));
      element.classList.remove(SNAP_CLASS);
      element.getBoundingClientRect();
      element.classList.add(SNAP_CLASS);
    },
    [ref, x, y, width, height, layoutKey, isEnabled],
  );
}
