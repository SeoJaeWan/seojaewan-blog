/**
 * CSS 시간 값(`2500ms`, `0.25s`)을 밀리초로 바꾼다. 값이 비었거나 시간이 아니면 0이다.
 * jsdom처럼 토큰 CSS가 없는 곳에서는 CSS 변수가 빈 글자로 읽히므로 기다림 없이 바로 넘어가게 0으로 둔다.
 * @param value CSS 시간 값. 앞뒤 공백은 무시한다
 * @returns 밀리초
 */
export function parseCssTime(value: string): number {
  const match = /^(-?\d*\.?\d+)(ms|s)$/i.exec(value.trim());
  if (match === null) {
    return 0;
  }
  const [, amount = '0', unit = 'ms'] = match;
  const milliseconds = unit.toLowerCase() === 's' ? Number(amount) * 1000 : Number(amount);
  return Math.max(0, milliseconds);
}

/**
 * 시간 토큰(`--motion-delay-boot-screen` 같은 CSS 변수)을 실행 중에 읽어 밀리초로 바꾼다.
 * 토큰 하나를 기준으로 삼으려고 숫자를 코드에 옮겨 적지 않고 CSS에서 읽는다(재부팅 화면을 보여 주는 시간).
 * @param name CSS 변수 이름(`--`로 시작)
 * @param element 변수를 읽을 요소. 없으면 문서 루트다
 * @returns 밀리초. 변수가 없으면 0
 */
export function readCssTimeVariable(
  name: `--${string}`,
  element: Element = document.documentElement,
): number {
  return parseCssTime(getComputedStyle(element).getPropertyValue(name));
}
