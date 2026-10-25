/** 화면 위 사각형(px). `DOMRect`와 같은 이름을 쓴다 */
export type ScreenRect = {
  /** 왼쪽 끝 */
  left: number;
  /** 위쪽 끝 */
  top: number;
  /** 너비 */
  width: number;
  /** 높이 */
  height: number;
};

/**
 * 최소화·작업 표시줄에서 복원 모션(`motion-window-minimize`·`motion-window-restore`)이 창을 옮길 거리를 구한다.
 * 두 클래스는 `translate` 다음에 `scale`을 걸고 원점이 가운데라, 창 중심에서 작업 표시줄 앱 버튼 중심까지의 차이가
 * 줄어든 창이 버튼 위에 놓이는 거리다. 앱은 이 값을 `--motion-window-taskbar-offset-x`·`-y`로 넘긴다.
 * @codocs [[디자인 기반:모션 클래스]]
 * @param windowRect 창 자리
 * @param buttonRect 작업 표시줄 앱 버튼 자리
 * @returns 옮길 거리(px)
 */
export function getTaskbarOffset(
  windowRect: ScreenRect,
  buttonRect: ScreenRect,
): { x: number; y: number } {
  return {
    x: buttonRect.left + buttonRect.width / 2 - (windowRect.left + windowRect.width / 2),
    y: buttonRect.top + buttonRect.height / 2 - (windowRect.top + windowRect.height / 2),
  };
}

/**
 * 창 축소 화면(`WindowThumbnail`)의 비율을 구한다. 창 전체가 자리 안에 들어가도록 가로·세로 가운데 작은 비율을 쓴다.
 * @param size 실제 창 크기
 * @param size.width 실제 창 너비
 * @param size.height 실제 창 높이
 * @param box 넣을 자리 크기
 * @param box.width 자리 너비
 * @param box.height 자리 높이
 * @returns 줄이는 비율
 */
export function getThumbnailScale(
  size: { width: number; height: number },
  box: { width: number; height: number },
): number {
  if (size.width <= 0 || size.height <= 0) {
    return 1;
  }
  return Math.min(box.width / size.width, box.height / size.height);
}
