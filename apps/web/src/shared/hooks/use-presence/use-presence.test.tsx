import { act, render, screen } from '@testing-library/react';
import { type ReactNode, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type PresenceOptions, usePresence } from './use-presence';

type FakeAnimation = {
  animation: Animation;
  /** 애니메이션이 끝나는 약속 */
  promise: Promise<Animation>;
  /** 애니메이션을 끝낸다 */
  finish: () => void;
  /** 애니메이션을 취소한다(finished 거부) */
  cancel: () => void;
};

/**
 * 끝나는 때를 테스트가 정하는 가짜 애니메이션을 만든다.
 * @param iterations 반복 횟수
 * @returns 가짜 애니메이션과 끝내기·취소하기
 */
function createFakeAnimation(iterations = 1): FakeAnimation {
  const settle: { resolve?: (value: Animation) => void; reject?: (reason: unknown) => void } = {};
  const promise = new Promise<Animation>((resolve, reject) => {
    settle.resolve = resolve;
    settle.reject = reject;
  });
  const animation = new EventTarget() as Animation;
  Object.assign(animation, {
    finished: promise,
    effect: { getTiming: () => ({ iterations }) },
  });
  return {
    animation,
    promise,
    finish: () => settle.resolve?.(animation),
    cancel: () => settle.reject?.(new DOMException('취소됨', 'AbortError')),
  };
}

/**
 * jsdom에 없는 getAnimations를 넣어, 모든 요소가 주어진 애니메이션을 돌려주게 한다.
 * @param animations 돌려줄 애니메이션
 * @returns getAnimations 가짜 함수
 */
function stubGetAnimations(animations: Animation[]): ReturnType<typeof vi.fn> {
  const getAnimations = vi.fn(() => animations);
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    writable: true,
    value: getAnimations,
  });
  return getAnimations;
}

/**
 * usePresence로 패널 하나를 그린다.
 * @param props
 * @param props.open 보여야 하는지
 * @param props.options usePresence 설정
 */
function Panel(props: { open: boolean; options?: PresenceOptions }): ReactNode {
  const panelRef = useRef<HTMLDivElement>(null);
  const presence = usePresence(panelRef, props.open, props.options);
  if (!presence.isMounted) {
    return null;
  }
  return (
    <div
      ref={panelRef}
      data-testid="panel"
      data-status={presence.status}
      hidden={presence.isHidden}
      {...presence.presenceProps}
    />
  );
}

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, 'getAnimations');
});

// @codocs [[디자인 기반:모션 클래스]]
describe('usePresence', () => {
  it('getAnimations가 없으면(jsdom) 열자마자 entered, 닫자마자 빠진다', () => {
    const handleExitComplete = vi.fn();
    const { rerender } = render(<Panel open options={{ onExitComplete: handleExitComplete }} />);
    expect(screen.getByTestId('panel')).toHaveAttribute('data-status', 'entered');

    rerender(<Panel open={false} options={{ onExitComplete: handleExitComplete }} />);

    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
    expect(handleExitComplete).toHaveBeenCalledTimes(1);
  });

  it('처음에 닫혀 있으면 그리지 않고 onExitComplete도 부르지 않는다', () => {
    const handleExitComplete = vi.fn();
    render(<Panel open={false} options={{ onExitComplete: handleExitComplete }} />);
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
    expect(handleExitComplete).not.toHaveBeenCalled();
  });

  it('사라지는 애니메이션이 끝날 때까지 data-ending-style을 달고 남았다가 빠진다', async () => {
    const { rerender } = render(<Panel open />);
    const exit = createFakeAnimation();
    stubGetAnimations([exit.animation]);

    rerender(<Panel open={false} />);
    const panel = screen.getByTestId('panel');
    expect(panel).toHaveAttribute('data-status', 'exiting');
    expect(panel).toHaveAttribute('data-ending-style', '');

    await act(async () => {
      exit.finish();
      await exit.promise;
    });
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
  });

  it('들어가는 애니메이션이 끝나야 entered가 되고, 첫 프레임까지만 data-starting-style을 단다', async () => {
    const enter = createFakeAnimation();
    stubGetAnimations([enter.animation]);
    render(<Panel open />);
    const panel = screen.getByTestId('panel');
    expect(panel).toHaveAttribute('data-status', 'entering');
    expect(panel).toHaveAttribute('data-starting-style', '');

    await act(async () => {
      await new Promise(requestAnimationFrame);
    });
    expect(panel).not.toHaveAttribute('data-starting-style');

    await act(async () => {
      enter.finish();
      await enter.promise;
    });
    expect(panel).toHaveAttribute('data-status', 'entered');
  });

  it('취소된 애니메이션(finished 거부)은 끝난 것으로 본다', async () => {
    const { rerender } = render(<Panel open />);
    const exit = createFakeAnimation();
    stubGetAnimations([exit.animation]);

    rerender(<Panel open={false} />);
    await act(async () => {
      exit.cancel();
      await exit.promise.catch(() => undefined);
    });
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
  });

  it('무한 반복 애니메이션은 기다리지 않는다', () => {
    const { rerender } = render(<Panel open />);
    stubGetAnimations([createFakeAnimation(Infinity).animation]);

    rerender(<Panel open={false} />);
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
  });

  it('subtree를 켜면 안쪽 요소의 애니메이션까지 묻는다', () => {
    const { rerender } = render(<Panel open options={{ subtree: true }} />);
    const getAnimations = stubGetAnimations([]);

    rerender(<Panel open={false} options={{ subtree: true }} />);
    expect(getAnimations).toHaveBeenCalledWith({ subtree: true });
  });

  it('사라지는 중에 다시 열면 남고, 앞서 기다리던 애니메이션이 끝나도 빠지지 않는다', async () => {
    const handleExitComplete = vi.fn();
    const { rerender } = render(<Panel open options={{ onExitComplete: handleExitComplete }} />);
    const exit = createFakeAnimation();
    stubGetAnimations([exit.animation]);

    rerender(<Panel open={false} options={{ onExitComplete: handleExitComplete }} />);
    stubGetAnimations([]);
    rerender(<Panel open options={{ onExitComplete: handleExitComplete }} />);
    await act(async () => {
      exit.finish();
      await exit.promise;
    });

    expect(screen.getByTestId('panel')).toHaveAttribute('data-status', 'entered');
    expect(handleExitComplete).not.toHaveBeenCalled();
  });

  it('keepMounted면 사라진 뒤에도 빼지 않고 isHidden으로 알린다', () => {
    const { rerender } = render(<Panel open options={{ keepMounted: true }} />);

    rerender(<Panel open={false} options={{ keepMounted: true }} />);

    const panel = screen.getByTestId('panel');
    expect(panel).toHaveAttribute('data-status', 'exited');
    expect(panel).not.toBeVisible();
  });
});
