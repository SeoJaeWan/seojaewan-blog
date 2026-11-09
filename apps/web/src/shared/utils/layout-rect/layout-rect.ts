// 움직이는 중인 요소(순서 바꾸기 끌기·미끄러짐)의 원래 자리를 재는 규칙이다.

/** 화면 위 자리(px, 화면 왼쪽 위 기준) */
export type LayoutPoint = {
  x: number;
  y: number;
};

/**
 * 계산된 `translate` 값(`none`, `10px`, `10px 20px`, `10px 20px 0px`)을 가로·세로 거리로 읽는다. 읽지 못하는 값은 0이다.
 * @param value 계산된 `translate` 값
 * @returns 가로·세로 거리(px)
 */
export function parseTranslate(value: string): LayoutPoint {
  const [x = '0', y = '0'] = value.trim().split(/\s+/);
  return { x: parsePixels(x), y: parsePixels(y) };
}

/**
 * 계산된 `scale` 값(`none`, `1.1`, `1.1 1.1`)을 가로·세로 배율로 읽는다. 읽지 못하는 값은 1이다.
 * @param value 계산된 `scale` 값
 * @returns 가로·세로 배율
 */
export function parseScale(value: string): LayoutPoint {
  const [x, y] = value.trim().split(/\s+/);
  const scaleX = parseFactor(x);
  return { x: scaleX, y: y === undefined ? scaleX : parseFactor(y) };
}

/**
 * 요소의 원래 자리(배치가 정한 자리)를 화면 기준으로 잰다. 요소 자신의 `translate`·`scale`(순서 바꾸기 끌기의 포인터 따라가기,
 * 커짐, 미끄러짐)은 빼고 잰다. 끄는 동안 놓일 자리를 찾을 때 움직이는 중인 모습이 아니라 자리로 찾기 위해서다.
 * 움직이는 중인 자리로 찾으면 미끄러지는 항목 위에서 순서가 앞뒤로 오간다.
 * @codocs [[항목 조작:순서 바꾸기 끌기]]
 * @param element 잴 요소
 * @returns 원래 자리
 */
export function getLayoutRect(element: Element): DOMRect {
  const rect = element.getBoundingClientRect();
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  const translate = parseTranslate(style?.translate ?? '');
  const scale = parseScale(style?.scale ?? '');
  // scale은 요소 가운데를 기준으로 커지므로 가운데는 그대로 두고 크기만 되돌린다.
  const width = rect.width / scale.x;
  const height = rect.height / scale.y;
  const centerX = rect.x + rect.width / 2 - translate.x;
  const centerY = rect.y + rect.height / 2 - translate.y;
  return new DOMRect(centerX - width / 2, centerY - height / 2, width, height);
}

/**
 * 자리의 가운데를 돌려준다.
 * @param rect 자리
 * @returns 가운데
 */
export function getRectCenter(rect: DOMRect): LayoutPoint {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/**
 * `12.5px` 같은 길이를 숫자로 읽는다. 읽지 못하면 0이다.
 * @param value 길이
 * @returns 숫자(px)
 */
function parsePixels(value: string): number {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * 배율을 숫자로 읽는다. 읽지 못하거나 0이면 1이다.
 * @param value 배율
 * @returns 배율
 */
function parseFactor(value: string | undefined): number {
  const number = Number.parseFloat(value ?? '');
  return Number.isFinite(number) && number !== 0 ? number : 1;
}
