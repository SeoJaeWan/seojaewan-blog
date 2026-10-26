import { act, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WindowFrame } from '@seojaewan/design-system';

import { useWindowStore } from '@/shared/stores/window-store/window-store';
import type { WindowFrameControls } from '@/shared/utils/window-rules/window-rules';
import type { OpenWindow } from '@/shared/utils/window-rules/window-rules';
import { getSnapFlip, getWindowRect } from '@/shared/utils/window-rules/window-rules';

import { WindowLayer } from './window-layer';

const WORK_AREA = { width: 1920, height: 1032 } as const;

/**
 * 창 제목을 정한다.
 * @param target 창
 * @returns 창 제목
 */
function getTitle(target: OpenWindow): string {
  return `창 ${String(target.serial)}`;
}

/**
 * 시험용 앱 창을 그린다.
 * @param target 창
 * @param controls 창 동작 속성
 * @returns WindowFrame
 */
function renderWindow(target: OpenWindow, controls: WindowFrameControls): JSX.Element {
  return <WindowFrame {...controls} appIcon={null} title={getTitle(target)} />;
}

/**
 * 시험에서는 앱 아이콘을 그리지 않는다.
 * @returns null
 */
function noIcon(): null {
  return null;
}

/**
 * 창 영역 안의 최대화·스냅 FLIP 전용 요소를 찾는다.
 * @param region 창 영역
 * @returns 안쪽 요소
 */
function getSnapElement(region: HTMLElement): HTMLElement {
  const element = region.firstElementChild;
  if (!(element instanceof HTMLElement)) {
    throw new Error('FLIP 요소가 없다');
  }
  return element;
}

/**
 * 창 영역의 최대화 버튼에 마우스를 올려 스냅 레이아웃을 열고 반반 레이아웃의 칸을 고른다.
 * @param region 창 영역
 * @param zoneLabel 고를 칸 이름
 */
async function selectSnapZone(region: HTMLElement, zoneLabel: string): Promise<void> {
  await userEvent.hover(within(region).getByRole('button', { name: '최대화' }));
  const layout = await screen.findByRole('group', { name: '반반' });
  await userEvent.click(within(layout).getByRole('button', { name: zoneLabel }));
}

/**
 * 창 층을 그리고 창을 연다.
 * @param count 열 창 개수
 */
function renderLayer(count: number): void {
  render(
    <WindowLayer renderWindow={renderWindow} getWindowTitle={getTitle} renderWindowIcon={noIcon} />,
  );
  act(() => {
    for (let index = 0; index < count; index += 1) {
      useWindowStore.getState().open('file-explorer', WORK_AREA);
    }
  });
}

beforeEach(() => {
  useWindowStore.getState().reset();
});

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, 'getAnimations');
});

// @codocs [[창 동작:창 조작]]
describe('창 동작:창 조작', () => {
  it('닫기 버튼을 누르면 창이 빠지고, 남은 창이 맨 앞(활성)이 된다', async () => {
    renderLayer(2);
    const front = screen.getByRole('region', { name: '창 2' });
    expect(screen.getByRole('region', { name: '창 1' })).toHaveAttribute(
      'data-window-state',
      'inactive',
    );
    await userEvent.click(within(front).getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('region', { name: '창 2' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '창 1' })).toHaveAttribute(
      'data-window-state',
      'active',
    );
  });

  it('최소화하면 창을 빼지 않고 숨기며, 복원하면 다시 보인다', async () => {
    renderLayer(1);
    const region = screen.getByRole('region', { name: '창 1' });
    await userEvent.click(within(region).getByRole('button', { name: '최소화' }));
    expect(screen.queryByRole('region', { name: '창 1' })).not.toBeInTheDocument();
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('hidden');
    act(() => {
      useWindowStore.getState().restore('window-1');
    });
    expect(screen.getByRole('region', { name: '창 1' })).toBe(region);
  });

  it('뒤에 있는 창을 누르면 맨 앞으로 온다', async () => {
    renderLayer(2);
    await userEvent.click(screen.getByRole('region', { name: '창 1' }));
    expect(screen.getByRole('region', { name: '창 1' })).toHaveAttribute(
      'data-window-state',
      'active',
    );
    expect(screen.getByRole('region', { name: '창 2' })).toHaveAttribute(
      'data-window-state',
      'inactive',
    );
  });
});

// @codocs [[디자인 기반:모션 클래스]]
describe('디자인 기반:모션 클래스', () => {
  it('닫은 창은 저장소에서 바로 지우고, 닫히는 애니메이션이 끝날 때까지 화면에만 남긴다', async () => {
    renderLayer(1);
    const region = screen.getByRole('region', { name: '창 1' });
    const settle: { resolve?: () => void } = {};
    const finished = new Promise<void>((resolve) => {
      settle.resolve = resolve;
    });
    Object.defineProperty(Element.prototype, 'getAnimations', {
      configurable: true,
      writable: true,
      value: vi.fn(() => [{ finished, effect: { getTiming: () => ({ iterations: 1 }) } }]),
    });
    await userEvent.click(within(region).getByRole('button', { name: '닫기' }));
    expect(useWindowStore.getState().windows).toEqual({});
    expect(region).toBeInTheDocument();
    expect(region).toHaveClass('motion-window-close');
    expect(region).toHaveAttribute('inert');
    await act(async () => {
      settle.resolve?.();
      await finished;
    });
    expect(region).not.toBeInTheDocument();
  });

  it('처음 연 창은 열기, 최소화에서 돌아온 창은 작업 표시줄에서 복원 클래스를 붙인다', async () => {
    renderLayer(1);
    const region = screen.getByRole('region', { name: '창 1' });
    expect(region).toHaveClass('motion-window-open');
    await userEvent.click(within(region).getByRole('button', { name: '최소화' }));
    expect(region).toHaveClass('motion-window-minimize');
    act(() => {
      useWindowStore.getState().restore('window-1');
    });
    expect(region).toHaveClass('motion-window-restore');
  });
});

// @codocs [[창 동작:창 조작]]
describe('창 동작:창 조작 (최대화)', () => {
  it('최대화하면 "이전 크기로 복원" 버튼으로 바뀌고, 누르면 원래 자리로 돌아간다', async () => {
    renderLayer(1);
    const region = screen.getByRole('region', { name: '창 1' });
    const { left, width } = region.style;
    await userEvent.click(within(region).getByRole('button', { name: '최대화' }));
    expect(useWindowStore.getState().windows['window-1']?.placement).toBe('maximized');
    expect(region.style.left).toBe('0px');
    expect(region.style.width).toBe(`${String(window.innerWidth)}px`);
    await userEvent.click(within(region).getByRole('button', { name: '이전 크기로 복원' }));
    expect(useWindowStore.getState().windows['window-1']?.placement).toBe('normal');
    expect(region.style.left).toBe(left);
    expect(region.style.width).toBe(width);
    expect(within(region).getByRole('button', { name: '최대화' })).toBeInTheDocument();
  });

  it('제목 표시줄을 더블클릭하면 최대화하고, 다시 더블클릭하면 복원한다', async () => {
    renderLayer(1);
    const region = screen.getByRole('region', { name: '창 1' });
    await userEvent.dblClick(within(region).getByText('창 1'));
    expect(useWindowStore.getState().windows['window-1']?.placement).toBe('maximized');
    await userEvent.dblClick(within(region).getByText('창 1'));
    expect(useWindowStore.getState().windows['window-1']?.placement).toBe('normal');
  });
});

// @codocs [[디자인 기반:모션 클래스]]
describe('디자인 기반:모션 클래스 (FLIP)', () => {
  it('최대화하면 안쪽 요소에 이전 자리에서 이어지는 시작 값을 넣고 motion-window-snap을 붙인다', async () => {
    renderLayer(1);
    const region = screen.getByRole('region', { name: '창 1' });
    const snapElement = getSnapElement(region);
    expect(snapElement).not.toHaveClass('motion-window-snap');
    const before = useWindowStore.getState().windows['window-1'];
    await userEvent.click(within(region).getByRole('button', { name: '최대화' }));
    const after = useWindowStore.getState().windows['window-1'];
    if (before === undefined || after === undefined) {
      throw new Error('창이 없다');
    }
    const workArea = { width: window.innerWidth, height: window.innerHeight - 48 };
    const flip = getSnapFlip(getWindowRect(before, workArea), getWindowRect(after, workArea));
    expect(snapElement).toHaveClass('motion-window-snap');
    expect(region).toHaveClass('motion-window-open');
    expect(snapElement.style.getPropertyValue('--motion-window-snap-from-x')).toBe(
      `${String(flip.x)}px`,
    );
    expect(snapElement.style.getPropertyValue('--motion-window-snap-from-y')).toBe(
      `${String(flip.y)}px`,
    );
    expect(snapElement.style.getPropertyValue('--motion-window-snap-from-scale-x')).toBe(
      String(flip.scaleX),
    );
    expect(snapElement.style.getPropertyValue('--motion-window-snap-from-scale-y')).toBe(
      String(flip.scaleY),
    );
  });
});

// @codocs [[창 동작:스냅]]
describe('창 동작:스냅', () => {
  it('스냅 레이아웃에서 칸을 고르면 그 칸을 채우고, 남은 칸의 Snap Assist에서 고른 창이 남은 칸을 채운다', async () => {
    renderLayer(2);
    await selectSnapZone(screen.getByRole('region', { name: '창 2' }), '왼쪽 절반');
    expect(useWindowStore.getState().windows['window-2']).toMatchObject({
      placement: 'snapped',
      snapZone: { layout: 'half', index: 0 },
    });
    const assist = screen.getByRole('dialog', { name: 'Snap Assist' });
    await userEvent.click(within(assist).getByRole('button', { name: '창 1' }));
    expect(useWindowStore.getState().windows['window-1']).toMatchObject({
      placement: 'snapped',
      snapZone: { layout: 'half', index: 1 },
    });
    expect(screen.queryByRole('dialog', { name: 'Snap Assist' })).not.toBeInTheDocument();
  });

  it('Snap Assist는 Esc나 빈 곳을 누르면 닫힌다', async () => {
    renderLayer(2);
    await selectSnapZone(screen.getByRole('region', { name: '창 2' }), '오른쪽 절반');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Snap Assist' })).not.toBeInTheDocument();
    await selectSnapZone(screen.getByRole('region', { name: '창 2' }), '왼쪽 절반');
    await userEvent.click(screen.getByRole('dialog', { name: 'Snap Assist' }));
    expect(screen.queryByRole('dialog', { name: 'Snap Assist' })).not.toBeInTheDocument();
  });

  it('열린 창이 하나뿐이면 Snap Assist를 보여 주지 않는다', async () => {
    renderLayer(1);
    await selectSnapZone(screen.getByRole('region', { name: '창 1' }), '왼쪽 절반');
    expect(useWindowStore.getState().windows['window-1']?.placement).toBe('snapped');
    expect(screen.queryByRole('dialog', { name: 'Snap Assist' })).not.toBeInTheDocument();
  });
});
