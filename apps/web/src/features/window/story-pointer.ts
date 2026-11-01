import { fireEvent, spyOn } from 'storybook/test';

/** 화면 위 포인터 자리 */
type StoryPoint = {
  /** 가로(px) */
  x: number;
  /** 세로(px) */
  y: number;
};

/**
 * 스토리 `play`에서 요소를 마우스로 끌어 놓는다. 지나는 자리를 정확히 주기 위해 포인터 이벤트를 직접 보낸다.
 * 실제 브라우저의 `setPointerCapture`는 합성 포인터 id를 받지 않고 오류를 내므로 끄는 동안만 빈 함수로 바꾼다.
 * @param target 누를 요소
 * @param path 누른 자리부터 놓는 자리까지
 * @codocs [[테스트 작성 규칙:스토리 테스트]]
 */
export async function dragStoryPointer(
  target: Element,
  path: readonly StoryPoint[],
): Promise<void> {
  const capture = spyOn(Element.prototype, 'setPointerCapture').mockImplementation(() => undefined);
  for (const [index, point] of path.entries()) {
    const init = {
      pointerId: 1,
      button: 0,
      pointerType: 'mouse',
      clientX: point.x,
      clientY: point.y,
    };
    if (index === 0) {
      await fireEvent.pointerDown(target, init);
    } else {
      await fireEvent.pointerMove(target, init);
    }
    if (index === path.length - 1) {
      await fireEvent.pointerUp(target, init);
    }
  }
  capture.mockRestore();
}
