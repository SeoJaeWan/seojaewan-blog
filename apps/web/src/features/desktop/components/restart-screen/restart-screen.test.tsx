import { act, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWindowStore } from '@/core/window/window';
import { Workspace } from '@/features/desktop/components/workspace/workspace';
import { useWorkspaceStore } from '@/features/desktop/stores/workspace-store/workspace-store';
import { useStartMenuStore } from '@/features/start-menu/start-menu';

// 테스트에서 재부팅 화면을 보여 주는 시간. jsdom에는 토큰 CSS가 없어 문서 루트에 직접 넣는다.
const BOOT_SCREEN_DELAY_MS = 2500;

type User = ReturnType<typeof userEvent.setup>;

/**
 * 재부팅 화면의 진행 링을 찾는다.
 * @returns 진행 링, 없으면 null
 */
function queryBootScreen(): HTMLElement | null {
  return screen.queryByRole('progressbar', { name: '다시 시작하는 중' });
}

/**
 * Chrome 창을 찾는다.
 * @returns Chrome 창, 없으면 null
 */
function queryChromeWindow(): HTMLElement | null {
  return screen.queryByRole('region', { name: '새 탭 - Chrome' });
}

/**
 * Start 메뉴를 열고 전원 메뉴의 `다시 시작`을 고른다.
 * @param user 사용자 동작
 */
async function clickRestart(user: User): Promise<void> {
  await user.click(screen.getByRole('button', { name: '시작' }));
  const startPanel = screen.getByRole('dialog', { name: '시작' });
  // jsdom에서는 Base UI 메뉴가 포인터 클릭으로 열리지 않아 키보드로 연다
  within(startPanel).getByRole('button', { name: '전원' }).focus();
  await user.keyboard('{Enter}');
  await user.click(screen.getByRole('menuitem', { name: '다시 시작' }));
}

/**
 * 재부팅 화면의 나타나는 애니메이션만 테스트가 끝내게 한다. jsdom에 없는 getAnimations를 넣어,
 * `motion-boot-screen-enter`가 붙은 요소만 끝나지 않은 애니메이션을 돌려주고 나머지는 애니메이션이 없게 한다.
 * @returns 나타나는 애니메이션을 끝내는 함수
 */
function stubBootScreenEnterAnimation(): () => void {
  const settle: { resolve?: (animation: Animation) => void } = {};
  const finished = new Promise<Animation>((resolve) => {
    settle.resolve = resolve;
  });
  const animation = Object.assign(new EventTarget(), {
    finished,
    effect: { getTiming: () => ({ iterations: 1 }) },
  });
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    writable: true,
    value(this: Element) {
      return this.classList.contains('motion-boot-screen-enter') ? [animation] : [];
    },
  });
  return () => {
    settle.resolve?.(animation as unknown as Animation);
  };
}

/**
 * 가짜 타이머를 앞으로 돌린다.
 * @param ms 돌릴 시간
 */
function advanceTimers(ms: number): void {
  vi.advanceTimersByTime(ms);
}

beforeEach(() => {
  vi.useFakeTimers();
  // Testing Library는 `jest` 전역이 있을 때만 가짜 타이머를 알아보고, 없으면 진짜 setTimeout을 기다리다 멈춘다.
  vi.stubGlobal('jest', { advanceTimersByTime: advanceTimers });
  document.documentElement.style.setProperty(
    '--motion-delay-boot-screen',
    `${String(BOOT_SCREEN_DELAY_MS)}ms`,
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty('--motion-delay-boot-screen');
  Reflect.deleteProperty(Element.prototype, 'getAnimations');
  useWindowStore.getState().reset();
  useStartMenuStore.getState().reset();
  useWorkspaceStore.setState({ phase: 'idle' });
});

// @codocs [[작업 공간:다시 시작]]
describe('작업 공간:다시 시작', () => {
  it('다시 시작하면 메뉴와 Start가 닫히고 재부팅 화면이 덮은 뒤 열린 창이 모두 닫힌다', async () => {
    const user = userEvent.setup({ advanceTimers });
    render(<Workspace />);
    await user.click(screen.getByRole('button', { name: 'Chrome' }));
    expect(queryChromeWindow()).toBeInTheDocument();

    await clickRestart(user);
    expect(screen.queryByRole('menuitem', { name: '다시 시작' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '시작' })).not.toBeInTheDocument();
    expect(queryBootScreen()).toBeInTheDocument();
    expect(queryChromeWindow()).not.toBeInTheDocument();
  });

  it('재부팅 화면이 다 덮기 전에는 창이 남아 있고, 다 덮은 뒤에 지운다', async () => {
    const finishEnter = stubBootScreenEnterAnimation();
    const user = userEvent.setup({ advanceTimers });
    render(<Workspace />);
    await user.click(screen.getByRole('button', { name: 'Chrome' }));

    await clickRestart(user);
    expect(queryBootScreen()).toBeInTheDocument();
    expect(queryChromeWindow()).toBeInTheDocument();

    await act(async () => {
      finishEnter();
      await Promise.resolve();
    });
    expect(queryChromeWindow()).not.toBeInTheDocument();
    expect(useWindowStore.getState().order).toHaveLength(0);
  });

  it('재부팅 화면은 정해진 시간 동안 보이다가 사라지고, 처음 상태의 바탕화면이 남는다', async () => {
    const user = userEvent.setup({ advanceTimers });
    render(<Workspace />);
    await clickRestart(user);
    expect(queryBootScreen()).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(BOOT_SCREEN_DELAY_MS - 1);
    });
    expect(queryBootScreen()).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(queryBootScreen()).not.toBeInTheDocument();
    expect(useWorkspaceStore.getState().phase).toBe('idle');
    expect(screen.getByRole('main', { name: '바탕화면' })).toBeInTheDocument();
  });
});
