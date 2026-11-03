import { describe, expect, it } from 'vitest';

import { needsScrollFocus } from './scroll-focus';

/**
 * 주어진 HTML을 담은 요소를 만든다.
 * @param html 안쪽 HTML
 * @returns 요소
 */
function viewportWith(html: string): HTMLElement {
  const element = document.createElement('div');
  element.innerHTML = html;
  return element;
}

// @codocs [[접근성:Tab]]
describe('스크롤 영역의 키보드 포커스', () => {
  it('넘치는데 안에 포커스할 요소가 없으면 영역이 포커스를 받는다', () => {
    expect(needsScrollFocus(viewportWith('<p>항목</p>'), true)).toBe(true);
  });

  it('넘치지 않으면 영역이 포커스를 받지 않는다', () => {
    expect(needsScrollFocus(viewportWith('<p>항목</p>'), false)).toBe(false);
  });

  it('안에 포커스할 요소가 있으면 Tab 차례를 늘리지 않는다', () => {
    expect(needsScrollFocus(viewportWith('<button>항목</button>'), true)).toBe(false);
    expect(needsScrollFocus(viewportWith('<div tabindex="0">항목</div>'), true)).toBe(false);
  });

  it('비활성 버튼과 tabindex -1 요소는 포커스할 요소로 보지 않는다', () => {
    expect(
      needsScrollFocus(
        viewportWith('<button disabled>항목</button><div tabindex="-1"></div>'),
        true,
      ),
    ).toBe(true);
  });
});
