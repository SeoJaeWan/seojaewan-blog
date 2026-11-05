import { fireEvent, spyOn } from 'storybook/test';

/** 화면 위 포인터 자리 */
type StoryPoint = {
  x: number;
  y: number;
};

/** 포인터 종류 */
type StoryPointerType = 'mouse' | 'pen' | 'touch';

/**
 * 포인터 이벤트 초기값을 만든다. 끌기 취소처럼 도우미 밖에서 이벤트를 보낼 때도 같은 값을 쓴다.
 * @param point 자리
 * @param pointerType 포인터 종류
 * @returns 이벤트 초기값
 */
export function storyPointerInit(
  point: StoryPoint,
  pointerType: StoryPointerType = 'mouse',
): { pointerId: number; button: number; pointerType: string; clientX: number; clientY: number } {
  return { pointerId: 1, button: 0, pointerType, clientX: point.x, clientY: point.y };
}

/**
 * 스토리 `play`에서 요소를 누르고 지나는 자리들로 움직인다. 놓지는 않는다. 끄는 도중의 모습을 볼 때 쓴다.
 * 실제 브라우저의 `setPointerCapture`는 합성 포인터 id를 받지 않고 오류를 내므로 누르는 동안만 빈 함수로 바꾼다.
 * @param target 누를 요소
 * @param path 누른 자리부터 지나는 자리까지
 * @param pointerType 포인터 종류
 * @codocs [[테스트 작성 규칙:스토리 테스트]]
 */
export async function pressStoryPointer(
  target: Element,
  path: readonly StoryPoint[],
  pointerType: StoryPointerType = 'mouse',
): Promise<void> {
  const capture = spyOn(Element.prototype, 'setPointerCapture').mockImplementation(() => undefined);
  for (const [index, point] of path.entries()) {
    const init = storyPointerInit(point, pointerType);
    if (index === 0) {
      await fireEvent.pointerDown(target, init);
    } else {
      await fireEvent.pointerMove(target, init);
    }
  }
  capture.mockRestore();
}

/**
 * 스토리 `play`에서 요소를 끌어 놓는다. 지나는 자리를 정확히 주기 위해 포인터 이벤트를 직접 보낸다.
 * @param target 누를 요소
 * @param path 누른 자리부터 놓는 자리까지
 * @param pointerType 포인터 종류
 * @codocs [[테스트 작성 규칙:스토리 테스트]]
 */
export async function dragStoryPointer(
  target: Element,
  path: readonly StoryPoint[],
  pointerType: StoryPointerType = 'mouse',
): Promise<void> {
  await pressStoryPointer(target, path, pointerType);
  const end = path.at(-1);
  if (end !== undefined) {
    await fireEvent.pointerUp(target, storyPointerInit(end, pointerType));
  }
}
