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
export const MOBILE_PREVIEW_MARGIN = 12;

/** 창 미리보기 카드의 원래 너비(px). 디자인 시스템 WindowPreview가 정한 값이다 */
export const PREVIEW_CARD_WIDTH = 208;

// 목록 판의 바깥 여백(안쪽 여백 4 + 테두리 1을 양쪽에), 카드 사이 간격이다.
const PREVIEW_LIST_CHROME = 10;
const PREVIEW_CARD_GAP = 4;

/** 모바일 창 미리보기 목록의 크기 */
export type MobilePreviewLayout = {
  /** 목록 판의 너비 */
  listWidth: number;
  /** 카드 하나의 너비. 카드가 많으면 같은 비율로 줄어든다 */
  cardWidth: number;
};

/**
 * 모바일 창 미리보기 목록의 크기를 구한다. 카드를 원래 너비(208)로 놓은 목록이 화면 폭에서 좌우 12px 여백을 뺀 폭에 들어가면
 * 그대로 두고, 넘치면 목록을 그 폭에 맞추고 카드를 같은 너비로 줄인다.
 * @codocs [[모바일:차이]]
 * @param screenWidth 화면 폭
 * @param count 카드 개수
 * @returns 목록 판과 카드 너비
 */
export function getMobilePreviewLayout(screenWidth: number, count: number): MobilePreviewLayout {
  const cards = Math.max(count, 1);
  const gaps = PREVIEW_CARD_GAP * (cards - 1);
  const naturalWidth = PREVIEW_CARD_WIDTH * cards + gaps + PREVIEW_LIST_CHROME;
  const listWidth = Math.max(0, Math.min(naturalWidth, screenWidth - MOBILE_PREVIEW_MARGIN * 2));
  const cardWidth = Math.max(0, Math.floor((listWidth - PREVIEW_LIST_CHROME - gaps) / cards));
  return { listWidth, cardWidth };
}
