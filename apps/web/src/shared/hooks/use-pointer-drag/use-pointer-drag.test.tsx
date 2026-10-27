import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PointerDragCallbacks } from './use-pointer-drag';
import { usePointerDrag } from './use-pointer-drag';

const pointer = { pointerId: 1, pointerType: 'mouse', button: 0 };

/**
 * 누르면 끌기를 따라가는 버튼을 그린다.
 * @param props
 * @param props.callbacks 끌기에서 부를 함수
 */
function Handle(props: { callbacks: PointerDragCallbacks }) {
  const startPointerDrag = usePointerDrag();
  return (
    <button
      type="button"
      onPointerDown={(event) => {
        startPointerDrag(event, props.callbacks);
      }}
    >
      손잡이
    </button>
  );
}

// @codocs [[바탕화면:아이콘 조작]]
describe('바탕화면:아이콘 조작 - 끌기 따라가기', () => {
  it('끄는 도중 붙잡은 포인터가 풀려도 요소가 문서에 있으면 끌기를 이어 간다', () => {
    const onMove = vi.fn();
    render(<Handle callbacks={{ onMove }} />);
    const handle = screen.getByRole('button', { name: '손잡이' });
    fireEvent.pointerDown(handle, { ...pointer, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(handle, { ...pointer, clientX: 10, clientY: 0 });
    fireEvent.lostPointerCapture(handle, pointer);
    fireEvent.pointerMove(document.body, { ...pointer, clientX: 20, clientY: 0 });
    expect(onMove).toHaveBeenLastCalledWith({ x: 20, y: 0 });
  });

  it('끄는 도중 요소가 사라지면 끌기를 취소한다', () => {
    const onCancel = vi.fn();
    const { unmount } = render(<Handle callbacks={{ onCancel }} />);
    const handle = screen.getByRole('button', { name: '손잡이' });
    fireEvent.pointerDown(handle, { ...pointer, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(handle, { ...pointer, clientX: 10, clientY: 0 });
    unmount();
    expect(onCancel).toHaveBeenCalled();
  });
});
