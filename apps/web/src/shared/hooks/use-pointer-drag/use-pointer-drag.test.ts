import { fireEvent, renderHook } from '@testing-library/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PointerDragCallbacks } from './use-pointer-drag';
import { usePointerDrag } from './use-pointer-drag';

const pointer = { pointerId: 1, pointerType: 'mouse', button: 0 };

/**
 * 문서에 붙은 손잡이 요소를 만들고, 그 요소를 누른 것으로 끌기를 시작한다.
 * @param callbacks 끌기에서 부를 함수
 * @returns 손잡이 요소와 훅 해제 함수
 */
function startDrag(callbacks: PointerDragCallbacks): {
  handle: HTMLElement;
  unmount: () => void;
} {
  const handle = document.createElement('button');
  document.body.append(handle);
  const { result, unmount } = renderHook(() => usePointerDrag());
  const downEvent = { ...pointer, clientX: 0, clientY: 0, currentTarget: handle };
  result.current(downEvent as unknown as ReactPointerEvent, callbacks);
  return { handle, unmount };
}

afterEach(() => {
  document.body.replaceChildren();
});

// @codocs [[항목 조작:끌기]]
describe('항목 조작:끌기 - 끌기 따라가기', () => {
  it('끄는 도중 붙잡은 포인터가 풀려도 요소가 문서에 있으면 끌기를 이어 간다', () => {
    const onMove = vi.fn();
    const { handle } = startDrag({ onMove });
    fireEvent.pointerMove(handle, { ...pointer, clientX: 10, clientY: 0 });
    fireEvent.lostPointerCapture(handle, pointer);
    fireEvent.pointerMove(document.body, { ...pointer, clientX: 20, clientY: 0 });
    expect(onMove).toHaveBeenLastCalledWith({ x: 20, y: 0 });
  });

  it('끄는 도중 요소가 사라지면 끌기를 취소한다', () => {
    const onCancel = vi.fn();
    const { handle, unmount } = startDrag({ onCancel });
    fireEvent.pointerMove(handle, { ...pointer, clientX: 10, clientY: 0 });
    unmount();
    expect(onCancel).toHaveBeenCalled();
  });
});
