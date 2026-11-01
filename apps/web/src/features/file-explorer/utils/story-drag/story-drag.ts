import { fireEvent, spyOn } from 'storybook/test';

/** 화면 위 포인터 자리 */
type StoryPoint = {
  /** 가로(px) */
  x: number;
  /** 세로(px) */
  y: number;
};

/** 놓지 않고 붙들고 있는 끌기 */
type HeldStoryDrag = {
  /** 포인터를 옮긴다 */
  moveTo: (point: StoryPoint) => Promise<void>;
  /** 포인터를 놓고 끌기를 끝낸다 */
  release: () => Promise<void>;
};

const POINTER_INIT = { pointerId: 1, button: 0, pointerType: 'mouse' } as const;

/**
 * 요소의 가운데 자리.
 * @param element 요소
 * @returns 화면 위 자리
 */
export function getStoryCenter(element: Element): StoryPoint {
  const box = element.getBoundingClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * 요소를 누른 채 `path`를 따라 움직이되 놓지 않는다. 끄는 도중의 모습(툴팁, 강조, 커서)을 볼 때 쓴다.
 * 실제 브라우저의 `setPointerCapture`는 합성 포인터 id를 받지 않으므로 `release`까지 빈 함수로 바꾼다.
 * @param target 누를 요소
 * @param path 누른 자리부터 마지막으로 옮긴 자리까지
 * @returns 이어서 옮기거나 놓는 함수
 * @codocs [[테스트 작성 규칙:스토리 테스트]]
 */
export async function holdStoryDrag(
  target: Element,
  path: readonly StoryPoint[],
): Promise<HeldStoryDrag> {
  const capture = spyOn(Element.prototype, 'setPointerCapture').mockImplementation(() => undefined);
  let last = path[0] ?? { x: 0, y: 0 };
  for (const [index, point] of path.entries()) {
    const init = { ...POINTER_INIT, clientX: point.x, clientY: point.y };
    if (index === 0) {
      await fireEvent.pointerDown(target, init);
    } else {
      await fireEvent.pointerMove(target, init);
    }
    last = point;
  }
  return {
    moveTo: async (point) => {
      await fireEvent.pointerMove(target, { ...POINTER_INIT, clientX: point.x, clientY: point.y });
      last = point;
    },
    release: async () => {
      await fireEvent.pointerUp(target, { ...POINTER_INIT, clientX: last.x, clientY: last.y });
      capture.mockRestore();
    },
  };
}
