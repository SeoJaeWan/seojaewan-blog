import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHoverPreview } from './use-hover-preview';

/**
 * 포인터 종류만 가진 가짜 포인터 이벤트를 만든다.
 * @param pointerType 포인터 종류
 * @returns 포인터 이벤트
 */
function pointer(pointerType: string): { pointerType: string } {
  return { pointerType };
}

/**
 * 훅을 그리고 알림 함수를 돌려준다.
 * @returns 훅 결과와 알림 함수
 */
function setup(): {
  result: ReturnType<
    typeof renderHook<ReturnType<typeof useHoverPreview<string>>, unknown>
  >['result'];
  onOpen: ReturnType<typeof vi.fn<(target: string) => void>>;
  onClose: ReturnType<typeof vi.fn<() => void>>;
} {
  const onOpen = vi.fn<(target: string) => void>();
  const onClose = vi.fn<() => void>();
  const { result } = renderHook(() => useHoverPreview<string>({ onOpen, onClose }));
  return { result, onOpen, onClose };
}

// @codocs [[작업 표시줄:창 미리보기]]
describe('작업 표시줄:창 미리보기', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('마우스를 올리고 400ms가 지나면 미리보기를 연다', () => {
    const { result, onOpen } = setup();
    act(() => {
      result.current.handlePointerEnter('chrome', pointer('mouse'));
    });
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(onOpen).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onOpen).toHaveBeenCalledExactlyOnceWith('chrome');
  });

  it('400ms 전에 나가면 열지 않는다', () => {
    const { result, onOpen } = setup();
    act(() => {
      result.current.handlePointerEnter('chrome', pointer('mouse'));
    });
    act(() => {
      vi.advanceTimersByTime(300);
      result.current.handlePointerLeave(pointer('mouse'));
      vi.advanceTimersByTime(1000);
    });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('버튼과 미리보기 밖으로 나가 300ms가 지나면 닫는다', () => {
    const { result, onClose } = setup();
    act(() => {
      result.current.handlePointerLeave(pointer('mouse'));
      vi.advanceTimersByTime(299);
    });
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('300ms 안에 다시 들어오면(버튼에서 미리보기로 옮겨 가면) 닫지 않는다', () => {
    const { result, onClose } = setup();
    act(() => {
      result.current.handlePointerLeave(pointer('mouse'));
      vi.advanceTimersByTime(200);
      result.current.handlePointerEnter('chrome', pointer('mouse'));
      vi.advanceTimersByTime(1000);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('마우스가 아닌 터치·펜은 세지 않는다', () => {
    const { result, onOpen, onClose } = setup();
    act(() => {
      result.current.handlePointerEnter('chrome', pointer('touch'));
      result.current.handlePointerLeave(pointer('pen'));
      vi.advanceTimersByTime(1000);
    });
    expect(onOpen).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('취소하면 기다리던 열기와 닫기가 일어나지 않는다', () => {
    const { result, onOpen, onClose } = setup();
    act(() => {
      result.current.handlePointerEnter('chrome', pointer('mouse'));
      result.current.cancel();
      result.current.handlePointerLeave(pointer('mouse'));
      result.current.cancel();
      vi.advanceTimersByTime(1000);
    });
    expect(onOpen).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
