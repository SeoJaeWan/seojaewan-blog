import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom에는 ResizeObserver가 없다. ScrollArea 같은 크기를 재는 컴포넌트가 만들 수 있게, 크기를 알리지 않는 것으로 둔다.
if (typeof globalThis.ResizeObserver === 'undefined') {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  });
}

// jsdom에는 포인터 붙잡기(pointer capture)가 없다. 창 끌기처럼 setPointerCapture를 부르는 코드가 돌 수 있게,
// 아무것도 붙잡지 않는 것으로 둔다. 시험은 이벤트를 누른 요소에 바로 보낸다.
if (typeof Element.prototype.setPointerCapture === 'undefined') {
  Object.defineProperties(Element.prototype, {
    setPointerCapture: { configurable: true, writable: true, value: () => undefined },
    releasePointerCapture: { configurable: true, writable: true, value: () => undefined },
    hasPointerCapture: { configurable: true, writable: true, value: () => false },
  });
}
