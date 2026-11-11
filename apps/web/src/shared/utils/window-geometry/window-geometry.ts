/** 화면 위 사각형(px). `DOMRect`와 같은 이름을 쓴다 */
export type ScreenRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * 최소화·작업 표시줄에서 복원 모션(`motion-window-minimize`·`motion-window-restore`)이 창을 옮길 거리를 구한다.
 * 두 클래스는 `translate` 다음에 `scale`을 걸고 원점이 가운데라, 창 중심에서 작업 표시줄 앱 버튼 중심까지의 차이가
 * 줄어든 창이 버튼 위에 놓이는 거리다. 앱은 이 값을 `--motion-window-taskbar-offset-x`·`-y`로 넘긴다.
 * @codocs [[피그마 연동:모션 클래스]]
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

/** 모바일 창 미리보기 목록의 좌우 화면 여백(px) */
const MOBILE_PREVIEW_MARGIN = 12;

// 창 미리보기 카드(디자인 시스템 WindowPreview)의 치수다. 최대 너비 size/window-preview/width, 축소 화면 높이
// size/window-preview/thumbnail-height, 카드 안쪽 여백 spacing/sm이다. 카드 너비 계산은 WindowPreview가 CSS로 하고,
// 여기서는 축소 화면 자리 크기를 같은 규칙으로 구한다.
const PREVIEW_CARD_MAX_WIDTH = 208;
const PREVIEW_THUMBNAIL_HEIGHT = 108;
const PREVIEW_CARD_PADDING = 8;

/**
 * 창 비율(너비 ÷ 높이)을 구한다. WindowPreview의 `aspectRatio`로 넘겨 카드 너비를 정한다.
 * @param size 창이 화면에서 차지한 크기
 * @param size.width 창 너비
 * @param size.height 창 높이
 * @returns 창 비율. 크기가 0이면 최대 너비가 되는 넓은 비율(16:9)
 */
export function getWindowAspectRatio(size: { width: number; height: number }): number {
  if (size.width <= 0 || size.height <= 0) {
    return (PREVIEW_CARD_MAX_WIDTH - PREVIEW_CARD_PADDING * 2) / PREVIEW_THUMBNAIL_HEIGHT;
  }
  return size.width / size.height;
}

/**
 * 창 미리보기 카드 너비를 구한다. 축소 화면 높이 × 창 비율 + 좌우 여백이고 최대 208이다. WindowPreview가 CSS로 그리는 너비와 같다.
 * @codocs [[작업 표시줄:창 미리보기]]
 * @param aspectRatio 창 비율(너비 ÷ 높이)
 * @returns 카드 너비(px)
 */
export function getPreviewCardWidth(aspectRatio: number): number {
  return Math.min(
    PREVIEW_THUMBNAIL_HEIGHT * aspectRatio + PREVIEW_CARD_PADDING * 2,
    PREVIEW_CARD_MAX_WIDTH,
  );
}

/**
 * 카드 너비에서 축소 화면 자리 크기를 구한다. 자리 높이는 일정하고 너비는 카드 너비에서 좌우 여백을 뺀 것이다.
 * 창 비율 그대로의 카드면 창 그림이 자리를 꽉 채운다.
 * @codocs [[작업 표시줄:창 미리보기]]
 * @param cardWidth 카드 너비(px)
 * @returns 축소 화면 자리 크기
 */
export function getPreviewThumbnailBox(cardWidth: number): { width: number; height: number } {
  return {
    width: Math.max(0, cardWidth - PREVIEW_CARD_PADDING * 2),
    height: PREVIEW_THUMBNAIL_HEIGHT,
  };
}

/**
 * 모바일 창 미리보기 목록의 너비를 구한다. 화면 폭에서 좌우 12px 여백을 뺀 폭이고, 제목 줄이 이 너비를 채운다.
 * @codocs [[작업 표시줄:모바일]]
 * @param screenWidth 화면 폭
 * @returns 목록 판 너비(px)
 */
export function getMobilePreviewListWidth(screenWidth: number): number {
  return Math.max(0, screenWidth - MOBILE_PREVIEW_MARGIN * 2);
}
