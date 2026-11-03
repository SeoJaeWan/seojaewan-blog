// 키보드로 포커스할 수 있는 요소다. 이런 요소가 안에 있으면 그 요소에 포커스해 스크롤할 수 있다.
const focusableSelector = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * 스크롤 영역 자신이 키보드 포커스를 받아야 하는지 정한다.
 * 넘치는데 안에 포커스할 요소가 없으면 키보드로 스크롤할 길이 없으므로 영역이 포커스를 받는다.
 * 포커스할 요소가 있으면 Tab 차례를 늘리지 않도록 받지 않는다.
 * @codocs [[접근성:Tab]]
 * @param viewport 스크롤하는 요소
 * @param isOverflowing 내용이 넘치는지
 * @returns 영역이 포커스를 받아야 하면 true
 */
export function needsScrollFocus(
  viewport: Pick<Element, 'querySelector'>,
  isOverflowing: boolean,
): boolean {
  return isOverflowing && viewport.querySelector(focusableSelector) === null;
}
