// Chrome 페이지 본문 배율(확대/축소)의 단계와 단계 사이 이동 규칙이다.

/** 배율 단계(%). 실제 Chrome과 같다 */
export const ZOOM_LEVELS = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200] as const;

/** 처음 배율(%) */
export const DEFAULT_ZOOM = 100;

/**
 * 한 단계 키운 배율. 끝 단계면 그대로다. 단계에 없는 값이면 그보다 큰 첫 단계다.
 * @codocs [[Chrome:확대/축소]]
 * @param zoom 지금 배율(%)
 * @returns 키운 배율(%)
 */
export function zoomIn(zoom: number): number {
  return ZOOM_LEVELS.find((level) => level > zoom) ?? zoom;
}

/**
 * 한 단계 줄인 배율. 끝 단계면 그대로다. 단계에 없는 값이면 그보다 작은 마지막 단계다.
 * @codocs [[Chrome:확대/축소]]
 * @param zoom 지금 배율(%)
 * @returns 줄인 배율(%)
 */
export function zoomOut(zoom: number): number {
  return ZOOM_LEVELS.findLast((level) => level < zoom) ?? zoom;
}

/**
 * 더 키울 수 있는지. 마지막 단계(200%)에서는 키우기 버튼이 비활성이다.
 * @codocs [[Chrome:확대/축소]]
 * @param zoom 지금 배율(%)
 * @returns 키울 수 있으면 true
 */
export function canZoomIn(zoom: number): boolean {
  return zoomIn(zoom) !== zoom;
}

/**
 * 더 줄일 수 있는지. 첫 단계(50%)에서는 줄이기 버튼이 비활성이다.
 * @codocs [[Chrome:확대/축소]]
 * @param zoom 지금 배율(%)
 * @returns 줄일 수 있으면 true
 */
export function canZoomOut(zoom: number): boolean {
  return zoomOut(zoom) !== zoom;
}

/**
 * ⋮ 메뉴에 보이는 배율 글자. 예: `110%`
 * @codocs [[Chrome:확대/축소]]
 * @param zoom 배율(%)
 * @returns 배율 글자
 */
export function formatZoom(zoom: number): string {
  return `${String(zoom)}%`;
}
