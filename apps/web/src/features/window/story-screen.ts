import { spyOn } from 'storybook/test';

/**
 * 스토리 `play`에서 화면 크기를 정한다. 창 자리는 화면 크기에서 나오므로 값을 고정하거나 크기가 바뀌는 경우를 볼 때 쓴다.
 * 작업 영역 계산이 읽는 `innerWidth`·`innerHeight`만 바꾸고 `resize`를 보낸다. `matchMedia`는 그대로라 화면 방식은 실제 브라우저를 따른다.
 * 스토리의 `beforeEach`에서 부르고 돌려받은 함수를 돌려주면 스토리가 끝날 때 되돌린다. 다시 부르면 크기만 바꾼다.
 * @param width 화면 너비(px)
 * @param height 화면 높이(px)
 * @returns 실제 화면 크기로 되돌리는 함수
 * @codocs [[테스트 작성 규칙:스토리 테스트]]
 */
export function setStoryScreen(width: number, height: number): () => void {
  const widthSpy = spyOn(window, 'innerWidth', 'get').mockReturnValue(width);
  const heightSpy = spyOn(window, 'innerHeight', 'get').mockReturnValue(height);
  window.dispatchEvent(new Event('resize'));
  return () => {
    widthSpy.mockRestore();
    heightSpy.mockRestore();
    window.dispatchEvent(new Event('resize'));
  };
}
