import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// 훅 단위 테스트(renderHook)가 만든 트리를 시험마다 치운다.
afterEach(() => {
  cleanup();
});

// jsdom에는 포인터 붙잡기(pointer capture)가 없다. `usePointerDrag`가 부르는 setPointerCapture 등이 돌 수 있게,
// 아무것도 붙잡지 않는 것으로 둔다. 시험은 이벤트를 누른 요소에 바로 보낸다.
if (typeof Element.prototype.setPointerCapture === 'undefined') {
  Object.defineProperties(Element.prototype, {
    setPointerCapture: { configurable: true, writable: true, value: () => undefined },
    releasePointerCapture: { configurable: true, writable: true, value: () => undefined },
    hasPointerCapture: { configurable: true, writable: true, value: () => false },
  });
}
