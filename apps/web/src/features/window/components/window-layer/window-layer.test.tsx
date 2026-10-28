import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WindowFrame } from '@seojaewan/design-system';

import { useWindowStore } from '@/shared/stores/window-store/window-store';
import type { OpenWindow, WindowFrameControls } from '@/shared/utils/window-rules/window-rules';
import {
  getSnapFlip,
  getSnapZoneRect,
  getWindowRect,
} from '@/shared/utils/window-rules/window-rules';

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

// @codocs [[피그마 연동:모션 클래스]]
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

// @codocs [[피그마 연동:모션 클래스]]
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

// @codocs [[창 동작:창 조작]]
describe('창 동작:창 조작 - 화면 크기가 바뀔 때', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * 브라우저 화면 크기를 바꾼다. 작업 영역은 높이에서 작업 표시줄(48)을 뺀 크기다.
   * @param width 화면 너비
   * @param height 화면 높이
   */
  function resizeScreen(width: number, height: number): void {
    act(() => {
      vi.stubGlobal('innerWidth', width);
      vi.stubGlobal('innerHeight', height);
      window.dispatchEvent(new Event('resize'));
    });
  }

  it('제목 표시줄이 화면 밖으로 나가게 되면 보이는 동안만 당겨 그리고 저장소의 자리는 그대로 둔다', () => {
    renderLayer(1);
    resizeScreen(500, 200);
    const region = screen.getByRole('region', { name: '창 1' });
    // 작업 영역 500×152에서 제목 표시줄 200×40이 남는 자리(가로 500 - 200, 세로 152 - 40)로 당긴다
    expect(region.style.left).toBe('300px');
    expect(region.style.top).toBe('112px');
    expect(getStoredWindow('window-1')?.bounds).toEqual(FIRST_BOUNDS);
  });

  it('창 크기는 줄이지 않는다', () => {
    renderLayer(1);
    resizeScreen(500, 200);
    const region = screen.getByRole('region', { name: '창 1' });
    expect(region.style.width).toBe('1024px');
    expect(region.style.height).toBe('640px');
  });

  it('화면이 다시 커지면 원래 자리로 돌아간다', () => {
    renderLayer(1);
    resizeScreen(500, 200);
    resizeScreen(1920, 1080);
    const region = screen.getByRole('region', { name: '창 1' });
    expect(region.style.left).toBe('448px');
    expect(region.style.top).toBe('196px');
  });

  it('제목 표시줄이 화면 안에 남으면 창 자리를 그대로 그린다', () => {
    renderLayer(1);
    resizeScreen(1000, 600);
    const region = screen.getByRole('region', { name: '창 1' });
    expect(region.style.left).toBe('448px');
    expect(region.style.top).toBe('196px');
  });

  it('당겨 보이는 동안 끌어서 옮기면 새 자리를 기억한다', () => {
    renderLayer(1);
    resizeScreen(500, 200);
    dragPointer(getWindowParts('창 1').title, [
      { x: 320, y: 120 },
      { x: 220, y: 100 },
    ]);
    expect(getStoredWindow('window-1')?.bounds).toEqual({ ...FIRST_BOUNDS, x: 200, y: 92 });
    resizeScreen(1920, 1080);
    expect(screen.getByRole('region', { name: '창 1' }).style.left).toBe('200px');
  });
});

/** 작업 영역 위 한 점 */
type Point = { x: number; y: number };

/**
 * 포인터 이벤트 초기값을 만든다. 창 층은 화면 왼쪽 위에 있어 화면 좌표가 곧 작업 영역 좌표다.
 * @param point 자리
 * @param pointerType 포인터 종류
 * @returns 이벤트 초기값
 */
function pointerInit(
  point: Point,
  pointerType = 'mouse',
): { pointerId: number; button: number; pointerType: string; clientX: number; clientY: number } {
  return { pointerId: 1, button: 0, pointerType, clientX: point.x, clientY: point.y };
}

/**
 * 요소를 누르고 지나는 자리들로 움직인다. 놓지는 않는다.
 * @param target 누를 요소
 * @param path 누른 자리부터 지나는 자리들
 * @param pointerType 포인터 종류
 */
function pressAndMove(target: Element, path: readonly Point[], pointerType = 'mouse'): void {
  const [start, ...rest] = path;
  if (start === undefined) {
    return;
  }
  fireEvent.pointerDown(target, pointerInit(start, pointerType));
  for (const point of rest) {
    fireEvent.pointerMove(target, pointerInit(point, pointerType));
  }
}

/**
 * 요소를 눌러 끌고 마지막 자리에서 놓는다.
 * @param target 누를 요소
 * @param path 누른 자리부터 지나는 자리들
 * @param pointerType 포인터 종류
 */
function dragPointer(target: Element, path: readonly Point[], pointerType = 'mouse'): void {
  pressAndMove(target, path, pointerType);
  const end = path.at(-1);
  if (end !== undefined) {
    fireEvent.pointerUp(target, pointerInit(end, pointerType));
  }
}

/**
 * 창 영역의 크기 조절 핸들을 찾는다. 마우스로만 쓰는 자리라 접근성 이름이 없어 data 속성으로 찾는다.
 * @param region 창 영역
 * @param direction 핸들 방향
 * @returns 핸들
 */
function getResizeHandle(region: HTMLElement, direction: string): Element {
  const handle = region.querySelector(`[data-resize-handle="${direction}"]`);
  if (handle === null) {
    throw new Error('크기 조절 핸들이 없다');
  }
  return handle;
}

/**
 * 미리 보기 판을 찾는다. 장식이라 접근성 트리에 없어 data 속성으로 찾는다.
 * @returns 미리 보기 판. 없으면 null
 */
function querySnapPreview(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-snap-preview]');
}

/**
 * 창 영역과 그 제목(제목 표시줄 안 글자)을 찾는다.
 * @param name 창 이름
 * @returns 창 영역과 제목
 */
function getWindowParts(name: string): { region: HTMLElement; title: HTMLElement } {
  const region = screen.getByRole('region', { name });
  return { region, title: within(region).getByText(name) };
}

/**
 * 창 하나의 저장소 상태를 읽는다.
 * @param id 창 id
 * @returns 창
 */
function getStoredWindow(id: string): OpenWindow | undefined {
  return useWindowStore.getState().windows[id];
}

// 창 1(탐색기)을 1920×1080 화면(작업 영역 1920×1032)에 열었을 때의 자리다.
const FIRST_BOUNDS = { x: 448, y: 196, width: 1024, height: 640 } as const;

// @codocs [[창 동작:창 조작]]
describe('창 동작:창 조작 - 끌어서 옮기기', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1920);
    vi.stubGlobal('innerHeight', 1080);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('제목 표시줄을 끄는 동안 창 요소만 따라오고 저장소 자리는 그대로다', () => {
    renderLayer(1);
    const { region, title } = getWindowParts('창 1');
    pressAndMove(title, [
      { x: 600, y: 210 },
      { x: 700, y: 260 },
    ]);
    expect(region.style.left).toBe('548px');
    expect(region.style.top).toBe('246px');
    expect(getStoredWindow('window-1')?.bounds).toEqual(FIRST_BOUNDS);
  });

  it('끄는 동안 저장소의 interaction은 drag다', () => {
    renderLayer(1);
    pressAndMove(getWindowParts('창 1').title, [
      { x: 600, y: 210 },
      { x: 700, y: 260 },
    ]);
    expect(useWindowStore.getState().interaction).toBe('drag');
  });

  it('놓으면 끈 자리를 저장소에 반영하고 interaction을 null로 돌린다', () => {
    renderLayer(1);
    const { region, title } = getWindowParts('창 1');
    dragPointer(title, [
      { x: 600, y: 210 },
      { x: 700, y: 260 },
    ]);
    expect(getStoredWindow('window-1')?.bounds).toEqual({ ...FIRST_BOUNDS, x: 548, y: 246 });
    expect(useWindowStore.getState().interaction).toBeNull();
    expect(region.style.left).toBe('548px');
  });

  it('끌기 거리보다 조금 움직이면 끌지 않는다', () => {
    renderLayer(1);
    const { region, title } = getWindowParts('창 1');
    dragPointer(title, [
      { x: 600, y: 210 },
      { x: 602, y: 211 },
    ]);
    expect(getStoredWindow('window-1')?.bounds).toEqual(FIRST_BOUNDS);
    expect(region.style.left).toBe('448px');
  });

  it('창 버튼 위에서 누르면 끌지 않는다', () => {
    renderLayer(1);
    const { region } = getWindowParts('창 1');
    dragPointer(within(region).getByRole('button', { name: '닫기' }), [
      { x: 1450, y: 210 },
      { x: 1000, y: 500 },
    ]);
    expect(getStoredWindow('window-1')?.bounds).toEqual(FIRST_BOUNDS);
  });

  it('터치로는 끌지 않는다', () => {
    renderLayer(1);
    dragPointer(
      getWindowParts('창 1').title,
      [
        { x: 600, y: 210 },
        { x: 800, y: 400 },
      ],
      'touch',
    );
    expect(getStoredWindow('window-1')?.bounds).toEqual(FIRST_BOUNDS);
  });

  it('펜으로는 끈다', () => {
    renderLayer(1);
    dragPointer(
      getWindowParts('창 1').title,
      [
        { x: 600, y: 210 },
        { x: 800, y: 400 },
      ],
      'pen',
    );
    expect(getStoredWindow('window-1')?.bounds).toMatchObject({ x: 648, y: 386 });
  });

  it('화면 밖으로 끌어도 제목 표시줄 일부는 작업 영역 안에 남는다', () => {
    renderLayer(1);
    dragPointer(getWindowParts('창 1').title, [
      { x: 600, y: 210 },
      { x: 600, y: 3000 },
    ]);
    // 작업 영역 높이 1032에서 남기는 제목 표시줄 높이 40을 뺀다
    expect(getStoredWindow('window-1')?.bounds.y).toBe(992);
  });
});

// @codocs [[창 동작:창 조작]]
describe('창 동작:창 조작 - 끌기 취소', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1920);
    vi.stubGlobal('innerHeight', 1080);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('포인터가 취소되면(pointercancel) 창 요소가 마지막으로 그린 자리로 돌아간다', () => {
    renderLayer(1);
    const { region, title } = getWindowParts('창 1');
    pressAndMove(title, [
      { x: 600, y: 210 },
      { x: 700, y: 260 },
    ]);
    fireEvent.pointerCancel(title, pointerInit({ x: 700, y: 260 }));
    expect(region.style.left).toBe('448px');
    expect(region.style.top).toBe('196px');
  });

  it('포인터가 취소되면 저장소 자리는 그대로이고 interaction은 null로 돌아간다', () => {
    renderLayer(1);
    const { title } = getWindowParts('창 1');
    pressAndMove(title, [
      { x: 600, y: 210 },
      { x: 700, y: 260 },
    ]);
    fireEvent.pointerCancel(title, pointerInit({ x: 700, y: 260 }));
    expect(getStoredWindow('window-1')?.bounds).toEqual(FIRST_BOUNDS);
    expect(useWindowStore.getState().interaction).toBeNull();
  });

  it('붙잡은 포인터를 놓치면(lostpointercapture) 창 요소가 마지막으로 그린 자리로 돌아간다', () => {
    renderLayer(1);
    const { region, title } = getWindowParts('창 1');
    pressAndMove(title, [
      { x: 600, y: 210 },
      { x: 700, y: 260 },
    ]);
    fireEvent.lostPointerCapture(title, pointerInit({ x: 700, y: 260 }));
    expect(region.style.left).toBe('448px');
  });

  it('붙잡은 포인터를 놓치면 저장소 자리는 그대로이고 interaction은 null로 돌아간다', () => {
    renderLayer(1);
    const { title } = getWindowParts('창 1');
    pressAndMove(title, [
      { x: 600, y: 210 },
      { x: 700, y: 260 },
    ]);
    fireEvent.lostPointerCapture(title, pointerInit({ x: 700, y: 260 }));
    expect(getStoredWindow('window-1')?.bounds).toEqual(FIRST_BOUNDS);
    expect(useWindowStore.getState().interaction).toBeNull();
  });

  it('취소한 뒤의 움직임과 놓기는 무시한다', () => {
    renderLayer(1);
    const { region, title } = getWindowParts('창 1');
    pressAndMove(title, [
      { x: 600, y: 210 },
      { x: 700, y: 260 },
    ]);
    fireEvent.pointerCancel(title, pointerInit({ x: 700, y: 260 }));
    fireEvent.pointerMove(title, pointerInit({ x: 900, y: 400 }));
    fireEvent.pointerUp(title, pointerInit({ x: 900, y: 400 }));
    expect(region.style.left).toBe('448px');
    expect(getStoredWindow('window-1')?.bounds).toEqual(FIRST_BOUNDS);
  });

  it('끄는 도중 창을 닫으면 끌기를 끝내 interaction을 null로 돌린다', () => {
    renderLayer(2);
    pressAndMove(getWindowParts('창 2').title, [
      { x: 700, y: 240 },
      { x: 800, y: 300 },
    ]);
    act(() => {
      useWindowStore.getState().close('window-2');
    });
    expect(useWindowStore.getState().interaction).toBeNull();
  });

  it('끄는 도중 창을 닫으면 스냅 미리 보기를 지운다', () => {
    renderLayer(2);
    pressAndMove(getWindowParts('창 2').title, [
      { x: 700, y: 240 },
      { x: 0, y: 500 },
    ]);
    expect(querySnapPreview()).not.toBeNull();
    act(() => {
      useWindowStore.getState().close('window-2');
    });
    expect(querySnapPreview()).toBeNull();
  });

  it('끄는 도중 창 층이 사라지면 interaction을 null로 돌린다', () => {
    const { unmount } = render(
      <WindowLayer
        renderWindow={renderWindow}
        getWindowTitle={getTitle}
        renderWindowIcon={noIcon}
      />,
    );
    act(() => {
      useWindowStore.getState().open('file-explorer', WORK_AREA);
    });
    pressAndMove(getWindowParts('창 1').title, [
      { x: 600, y: 210 },
      { x: 700, y: 260 },
    ]);
    unmount();
    expect(useWindowStore.getState().interaction).toBeNull();
  });
});

// @codocs [[창 동작:창 조작]]
describe('창 동작:창 조작 - 크기 조절', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1920);
    vi.stubGlobal('innerHeight', 1080);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('모서리 핸들을 끌면 반대쪽 모서리는 두고 크기를 바꾼다', () => {
    renderLayer(1);
    dragPointer(getResizeHandle(getWindowParts('창 1').region, 'se'), [
      { x: 1472, y: 836 },
      { x: 1572, y: 876 },
    ]);
    expect(getStoredWindow('window-1')?.bounds).toEqual({
      ...FIRST_BOUNDS,
      width: 1124,
      height: 680,
    });
  });

  it('끄는 동안 저장소의 interaction은 resize다', () => {
    renderLayer(1);
    pressAndMove(getResizeHandle(getWindowParts('창 1').region, 'e'), [
      { x: 1472, y: 500 },
      { x: 1500, y: 500 },
    ]);
    expect(useWindowStore.getState().interaction).toBe('resize');
  });

  it('앱별 최소 크기보다 작게 줄이지 않는다', () => {
    renderLayer(1);
    const { region } = getWindowParts('창 1');
    dragPointer(getResizeHandle(region, 'nw'), [
      { x: 448, y: 196 },
      { x: 1500, y: 1000 },
    ]);
    // 탐색기 최소 크기 500×340. 오른쪽 아래(1472, 836)는 그대로다
    expect(getStoredWindow('window-1')?.bounds).toEqual({
      x: 972,
      y: 496,
      width: 500,
      height: 340,
    });
    expect(region.style.width).toBe('500px');
  });

  it('떠 있는 창에는 크기 조절 핸들이 여덟 개 있다', () => {
    renderLayer(1);
    expect(getWindowParts('창 1').region.querySelectorAll('[data-resize-handle]')).toHaveLength(8);
  });

  it('최대화한 창에는 크기 조절 핸들이 없다', () => {
    renderLayer(1);
    act(() => {
      useWindowStore.getState().maximize('window-1');
    });
    expect(getWindowParts('창 1').region.querySelectorAll('[data-resize-handle]')).toHaveLength(0);
  });

  it('스냅한 창에는 크기 조절 핸들이 없다', () => {
    renderLayer(1);
    act(() => {
      useWindowStore.getState().snap('window-1', { layout: 'half', index: 0 });
    });
    expect(getWindowParts('창 1').region.querySelectorAll('[data-resize-handle]')).toHaveLength(0);
  });
});

// @codocs [[모바일:차이]]
describe('모바일:차이 - 창 끌기', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 844);
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('모바일 창은 제목 표시줄을 끌어도 옮기지 않는다', () => {
    renderLayer(1);
    const before = getStoredWindow('window-1');
    dragPointer(getWindowParts('창 1').title, [
      { x: 100, y: 10 },
      { x: 200, y: 300 },
    ]);
    expect(getStoredWindow('window-1')).toBe(before);
  });

  it('모바일 창에는 크기 조절 핸들이 없다', () => {
    renderLayer(1);
    expect(getWindowParts('창 1').region.querySelectorAll('[data-resize-handle]')).toHaveLength(0);
  });
});

// @codocs [[창 동작:스냅]]
describe('창 동작:스냅 - 끌어서 스냅', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1920);
    vi.stubGlobal('innerHeight', 1080);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('끝 근처가 아니면 미리 보기를 보여 주지 않는다', () => {
    renderLayer(1);
    pressAndMove(getWindowParts('창 1').title, [
      { x: 700, y: 210 },
      { x: 300, y: 500 },
    ]);
    expect(querySnapPreview()).toBeNull();
  });

  it('왼쪽 끝으로 끄는 동안 채울 절반 자리에 미리 보기를 보여 준다', () => {
    renderLayer(1);
    pressAndMove(getWindowParts('창 1').title, [
      { x: 700, y: 210 },
      { x: 0, y: 500 },
    ]);
    const preview = querySnapPreview();
    expect(preview?.style.left).toBe('0px');
    expect(preview?.style.top).toBe('0px');
    expect(preview?.style.width).toBe('960px');
    expect(preview?.style.height).toBe('1032px');
  });

  it('끝에서 다시 벗어나면 미리 보기를 지운다', () => {
    renderLayer(1);
    pressAndMove(getWindowParts('창 1').title, [
      { x: 700, y: 210 },
      { x: 1919, y: 500 },
      { x: 1500, y: 500 },
    ]);
    expect(querySnapPreview()).toBeNull();
  });

  it('끝에서 벗어나 놓으면 스냅하지 않는다', () => {
    renderLayer(1);
    dragPointer(getWindowParts('창 1').title, [
      { x: 700, y: 210 },
      { x: 1919, y: 500 },
      { x: 1500, y: 500 },
    ]);
    expect(getStoredWindow('window-1')?.placement).toBe('normal');
  });

  it('왼쪽 끝에서 놓으면 왼쪽 절반에 스냅한다', () => {
    renderLayer(1);
    const { region, title } = getWindowParts('창 1');
    dragPointer(title, [
      { x: 700, y: 210 },
      { x: 0, y: 500 },
    ]);
    expect(getStoredWindow('window-1')).toMatchObject({
      placement: 'snapped',
      snapZone: { layout: 'half', index: 0 },
    });
    expect(region.style.left).toBe('0px');
    expect(region.style.width).toBe('960px');
  });

  it('놓으면 미리 보기를 지운다', () => {
    renderLayer(1);
    dragPointer(getWindowParts('창 1').title, [
      { x: 700, y: 210 },
      { x: 0, y: 500 },
    ]);
    expect(querySnapPreview()).toBeNull();
  });

  it('끌어서 스냅해도 떠 있을 때 자리는 끌기 전 그대로다', () => {
    renderLayer(1);
    dragPointer(getWindowParts('창 1').title, [
      { x: 700, y: 210 },
      { x: 0, y: 500 },
    ]);
    expect(getStoredWindow('window-1')?.bounds).toEqual(FIRST_BOUNDS);
  });

  it('끌어서 스냅하고 남은 칸에 다른 창이 있으면 Snap Assist를 연다', () => {
    renderLayer(2);
    dragPointer(getWindowParts('창 2').title, [
      { x: 700, y: 240 },
      { x: 0, y: 500 },
    ]);
    expect(screen.getByRole('dialog', { name: 'Snap Assist' })).toBeInTheDocument();
  });

  it('위쪽 끝으로 끌어 놓으면 최대화한다', () => {
    renderLayer(2);
    dragPointer(getWindowParts('창 2').title, [
      { x: 700, y: 240 },
      { x: 900, y: 0 },
    ]);
    expect(getStoredWindow('window-2')?.placement).toBe('maximized');
  });

  it('위쪽 끝으로 끌어 최대화하면 Snap Assist를 열지 않는다', () => {
    renderLayer(2);
    dragPointer(getWindowParts('창 2').title, [
      { x: 700, y: 240 },
      { x: 900, y: 0 },
    ]);
    expect(screen.queryByRole('dialog', { name: 'Snap Assist' })).not.toBeInTheDocument();
  });

  it('모서리로 끌어 놓으면 그 4분의 1에 스냅한다', () => {
    renderLayer(1);
    dragPointer(getWindowParts('창 1').title, [
      { x: 700, y: 210 },
      { x: 1919, y: 1031 },
    ]);
    expect(getStoredWindow('window-1')).toMatchObject({
      placement: 'snapped',
      snapZone: { layout: 'quad', index: 3 },
    });
  });
});

// @codocs [[피그마 연동:모션 클래스]]
describe('디자인 기반:모션 클래스 - 끌기', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1920);
    vi.stubGlobal('innerHeight', 1080);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('놓아서 스냅하면 최대화·스냅 FLIP이 끌던 자리에서 시작한다', () => {
    renderLayer(1);
    const { region, title } = getWindowParts('창 1');
    dragPointer(title, [
      { x: 700, y: 210 },
      { x: 0, y: 500 },
    ]);
    // 포인터가 (-700, +290) 움직인 자리다
    const dragged = { x: -252, y: 486, width: 1024, height: 640 };
    const flip = getSnapFlip(dragged, getSnapZoneRect({ layout: 'half', index: 0 }, WORK_AREA));
    const snapElement = getSnapElement(region);
    expect(snapElement).toHaveClass('motion-window-snap');
    expect(snapElement.style.getPropertyValue('--motion-window-snap-from-x')).toBe(
      `${String(flip.x)}px`,
    );
    expect(snapElement.style.getPropertyValue('--motion-window-snap-from-y')).toBe(
      `${String(flip.y)}px`,
    );
  });

  it('최대화한 창을 끌어 뗄 때는 최대화·스냅 모션을 재생하지 않는다', () => {
    renderLayer(1);
    act(() => {
      useWindowStore.getState().maximize('window-1');
    });
    const { region, title } = getWindowParts('창 1');
    const snapElement = getSnapElement(region);
    snapElement.classList.remove('motion-window-snap');
    pressAndMove(title, [
      { x: 480, y: 10 },
      { x: 500, y: 40 },
    ]);
    expect(snapElement).not.toHaveClass('motion-window-snap');
  });

  it('떼어 낸 창을 놓을 때도 최대화·스냅 모션을 재생하지 않는다', () => {
    renderLayer(1);
    act(() => {
      useWindowStore.getState().maximize('window-1');
    });
    const { region, title } = getWindowParts('창 1');
    const snapElement = getSnapElement(region);
    snapElement.classList.remove('motion-window-snap');
    dragPointer(title, [
      { x: 480, y: 10 },
      { x: 500, y: 40 },
      { x: 600, y: 140 },
    ]);
    expect(snapElement).not.toHaveClass('motion-window-snap');
  });
});

// @codocs [[창 동작:스냅]]
describe('창 동작:스냅 - 끌어서 떼기', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1920);
    vi.stubGlobal('innerHeight', 1080);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('최대화한 창을 끌면 떠 있는 창으로 돌아가 떠 있을 때 크기가 된다', () => {
    renderLayer(1);
    act(() => {
      useWindowStore.getState().maximize('window-1');
    });
    const { region, title } = getWindowParts('창 1');
    pressAndMove(title, [
      { x: 480, y: 10 },
      { x: 500, y: 40 },
    ]);
    expect(getStoredWindow('window-1')).toMatchObject({
      placement: 'normal',
      bounds: { width: 1024, height: 640 },
    });
    expect(region.style.width).toBe('1024px');
  });

  it('떼어 낸 창은 누른 자리의 가로 비율을 지켜 포인터 아래에 놓는다', () => {
    renderLayer(1);
    act(() => {
      useWindowStore.getState().maximize('window-1');
    });
    pressAndMove(getWindowParts('창 1').title, [
      { x: 480, y: 10 },
      { x: 500, y: 40 },
    ]);
    // 작업 영역 너비의 1/4 지점을 눌렀으므로 창 너비의 1/4 지점이 포인터 아래에 온다
    expect(getStoredWindow('window-1')?.bounds).toMatchObject({ x: 244, y: 30 });
  });

  it('떼어 낸 창은 계속 포인터를 따라오고 놓은 자리를 저장소에 반영한다', () => {
    renderLayer(1);
    act(() => {
      useWindowStore.getState().snap('window-1', { layout: 'half', index: 1 });
    });
    const { region, title } = getWindowParts('창 1');
    dragPointer(title, [
      { x: 1200, y: 10 },
      { x: 1100, y: 40 },
      { x: 1000, y: 140 },
    ]);
    // 오른쪽 절반(960부터 960 너비)의 1/4 지점을 눌렀다. 뗀 자리 x = 1100 - 256 = 844에서 100 더 왼쪽이다
    expect(getStoredWindow('window-1')?.bounds).toMatchObject({ x: 744, y: 130 });
    expect(region.style.left).toBe('744px');
  });
});
