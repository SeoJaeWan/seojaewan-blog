/** 피그마 색. 채널은 0–1이고 알파가 없으면 불투명이다. */
export type FigmaColor = {
  r: number;
  g: number;
  b: number;
  a?: number;
};

/**
 * 피그마 색을 소문자 16진수로 바꾼다. 알파가 1보다 작으면 `#rrggbbaa`, 아니면 `#rrggbb`다.
 * 채널은 0–255로 반올림한다.
 * @param color 바꿀 색
 * @returns `#rrggbb` 또는 `#rrggbbaa`
 */
export function colorToHex(color: FigmaColor): string {
  const alpha = color.a ?? 1;
  const channels = [color.r, color.g, color.b];
  if (alpha < 1) {
    channels.push(alpha);
  }
  return `#${channels.map(channelHex).join('')}`;
}

/**
 * 0–1 채널 값을 두 자리 16진수로 바꾼다.
 * @param value 채널 값(0–1)
 * @returns 두 자리 16진수
 */
function channelHex(value: number): string {
  const byte = Math.round(Math.min(Math.max(value, 0), 1) * 255);
  return byte.toString(16).padStart(2, '0');
}
