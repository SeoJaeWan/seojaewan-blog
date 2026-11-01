import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps, JSX } from 'react';
import { useState } from 'react';
import { expect, fireEvent, spyOn, userEvent, waitFor, within } from 'storybook/test';

import { openStoryWindows, resetStoryStores } from '@/shared/stores/store-reset/story-stores';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import {
  getStoryWindowTitle,
  renderNoStoryWindowIcon,
  renderStoryWindow,
} from '@/shared/utils/window-rules/story-window';
import type { OpenWindow, WindowApp } from '@/shared/utils/window-rules/window-rules';
import {
  getSnapFlip,
  getSnapZoneRect,
  getWindowRect,
} from '@/shared/utils/window-rules/window-rules';

import { dragStoryPointer, pressStoryPointer, storyPointerInit } from './story-pointer';
import { setStoryScreen } from './story-screen';
import { WindowLayer } from './window-layer';

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 실제 창 저장소에 이은 창 층을 그린다. 창을 누르면 맨 앞으로 오고, 최소화·최대화·닫기와
// 최대화 버튼의 스냅 레이아웃이 동작한다. 제목 표시줄을 끌어 옮기고, 가장자리·모서리를 끌어 크기를 조절하며,
// 화면 왼쪽·오른쪽·위쪽 끝으로 끌면 채울 영역(SnapPreview)이 보이고 놓으면 스냅·최대화한다.
// 앱 창 조립은 다른 기능이라 빈 WindowFrame에 제목만 둔다.
const meta = {
  title: 'Features/Window/WindowLayer',
  component: WindowLayer,
  parameters: { layout: 'fullscreen' },
  beforeEach: resetStoryStores,
  args: {
    renderWindow: renderStoryWindow,
    getWindowTitle: getStoryWindowTitle,
    renderWindowIcon: renderNoStoryWindowIcon,
  },
  render: (args) => (
    <div className="fixed inset-spacing-none">
      <WindowLayer {...args} />
    </div>
  ),
} satisfies Meta<typeof WindowLayer>;

export default meta;

type Story = StoryObj<typeof meta>;

// 끌기 스토리는 좌표를 글자 그대로 쓰도록 화면을 1920×1080으로 고정한다. 포인터 이벤트를 직접 보내므로 실제 브라우저가 더 작아도 된다.
const WORK_AREA = { width: 1920, height: 1032 } as const;
// 탐색기 창 1을 그 화면에 열었을 때의 자리다.
const FIRST_BOUNDS = { x: 448, y: 196, width: 1024, height: 640 } as const;
// 탐색기 창 2는 창 1에서 32px씩 비켜 열린다.
const SECOND_BOUNDS = { x: 480, y: 228, width: 1024, height: 640 } as const;

// 사라지는 애니메이션은 프레임이 돌아야 끝나므로 컴퓨터가 바쁠 때를 생각해 기본(1초)보다 오래 기다린다.
const EXIT_WAIT = { timeout: 5000 } as const;

const FIRST_NAME = 'File Explorer 1';
const SECOND_NAME = 'File Explorer 2';

/**
 * 1920×1080 화면을 고정하고 창을 여는 스토리 `beforeEach`를 만든다.
 * @param apps 차례로 열 앱
 * @returns `beforeEach`. 스토리가 끝나면 화면 크기를 되돌린다
 */
function openOnFullHd(apps: readonly WindowApp[]): () => () => void {
  return () => {
    const restoreScreen = setStoryScreen(1920, 1080);
    openStoryWindows(apps);
    return restoreScreen;
  };
}

/**
 * 창 하나의 저장소 상태를 읽는다.
 * @param id 창 id
 * @returns 창
 */
function getStoredWindow(id: string): OpenWindow | undefined {
  return useWindowStore.getState().windows[id];
}

/**
 * 창 영역과 그 제목(제목 표시줄 안 글자)을 찾는다.
 * @param canvasElement 스토리 캔버스
 * @param name 창 이름
 * @returns 창 영역과 제목
 */
function getWindowParts(
  canvasElement: HTMLElement,
  name: string,
): { region: HTMLElement; title: HTMLElement } {
  const region = within(canvasElement).getByRole('region', { name });
  return { region, title: within(region).getByText(name) };
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
 * 창 영역의 크기 조절 핸들 개수를 센다.
 * @param region 창 영역
 * @returns 핸들 개수
 */
function countResizeHandles(region: HTMLElement): number {
  return region.querySelectorAll('[data-resize-handle]').length;
}

/**
 * 미리 보기 판을 찾는다. 장식이라 접근성 트리에 없어 data 속성으로 찾는다.
 * @returns 미리 보기 판. 없으면 null
 */
function querySnapPreview(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-snap-preview]');
}

/**
 * Snap Assist를 찾는다.
 * @param canvasElement 스토리 캔버스
 * @returns Snap Assist. 없으면 null
 */
function querySnapAssist(canvasElement: HTMLElement): HTMLElement | null {
  return within(canvasElement).queryByRole('dialog', { name: 'Snap Assist' });
}

/**
 * 창 영역의 최대화 버튼에 마우스를 올려 스냅 레이아웃을 열고 반반 레이아웃의 칸을 고른다.
 * 선택지는 포털에 뜨므로 문서 전체에서 찾는다. 앞서 고른 선택지가 사라지는 중이면 마우스를 올려도 열리지 않을 수 있어
 * 다 사라지기를 기다리고, 마우스를 뗐다가 다시 올린다.
 * @param region 창 영역
 * @param zoneLabel 고를 칸 이름
 */
async function selectSnapZone(region: HTMLElement, zoneLabel: string): Promise<void> {
  const body = within(document.body);
  await waitFor(
    () => expect(body.queryByRole('group', { name: '반반' })).not.toBeInTheDocument(),
    EXIT_WAIT,
  );
  const button = within(region).getByRole('button', { name: '최대화' });
  await userEvent.unhover(button);
  await userEvent.hover(button);
  const layout = await body.findByRole('group', { name: '반반' }, EXIT_WAIT);
  await userEvent.click(within(layout).getByRole('button', { name: zoneLabel }));
}

/**
 * 끄는 도중 창 층이 사라지는 경우를 보려고 창 층을 뺄 수 있는 버튼을 함께 그린다.
 * @param props 창 층 속성
 * @returns 창 층과 빼기 버튼
 */
function RemovableWindowLayer(props: ComponentProps<typeof WindowLayer>): JSX.Element {
  const [isRemoved, setIsRemoved] = useState(false);

  /** 버튼을 누르면 창 층을 뺀다. */
  function handleRemove(): void {
    setIsRemoved(true);
  }

  return (
    <div className="fixed inset-spacing-none">
      {!isRemoved && <WindowLayer {...props} />}
      <button type="button" onClick={handleRemove}>
        창 층 빼기
      </button>
    </div>
  );
}

/** 창 하나를 연 채로 시작한다 */
export const OneWindow: Story = {
  beforeEach: () => {
    openStoryWindows(['chrome']);
  },
};

// @codocs [[창 동작:창 조작]]
/** 창 둘을 연 채로 시작한다. 뒤 창을 누르면 맨 앞으로 온다 */
export const TwoWindows: Story = {
  // 비활성 창 제목(text-fill-tertiary)의 색 대비는 피그마 값을 사람이 판단할 때까지 이 스토리에서 끈다(임의 작업 문서의 "색 대비 위반" 항목).
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
  beforeEach: () => {
    openStoryWindows(['file-explorer', 'chrome']);
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('뒤에 있는 창을 누르면 맨 앞으로 온다', async () => {
      await userEvent.click(canvas.getByRole('region', { name: FIRST_NAME }));
      await expect(canvas.getByRole('region', { name: FIRST_NAME })).toHaveAttribute(
        'data-window-state',
        'active',
      );
      await expect(canvas.getByRole('region', { name: 'Chrome 2' })).toHaveAttribute(
        'data-window-state',
        'inactive',
      );
      await userEvent.click(canvas.getByRole('region', { name: 'Chrome 2' }));
      await expect(canvas.getByRole('region', { name: 'Chrome 2' })).toHaveAttribute(
        'data-window-state',
        'active',
      );
    });
  },
};

/** 왼쪽 절반에 스냅한 탐색기와 최대화한 Chrome으로 시작한다. 제목 표시줄을 끌면 떼어져 스냅·최대화하기 전 크기로 돌아간다 */
export const SnappedAndMaximized: Story = {
  beforeEach: () => {
    openStoryWindows(['file-explorer', 'chrome']);
    const { snap, maximize } = useWindowStore.getState();
    snap('window-1', { layout: 'half', index: 0 });
    maximize('window-2');
  },
};

// @codocs [[창 동작:창 조작]]
/** 제목 표시줄을 끌어 창을 옮기고, 닫으면 남은 창이 맨 앞이 된다 */
export const DragAndClose: Story = {
  beforeEach: () => {
    openStoryWindows(['file-explorer', 'chrome']);
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const front = canvas.getByRole('region', { name: 'Chrome 2' });
    const start = useWindowStore.getState().windows['window-2']?.bounds;

    await step('제목 표시줄을 끌면 끈 만큼 저장소 자리가 옮겨진다', async () => {
      const title = within(front).getByText('Chrome 2');
      const box = title.getBoundingClientRect();
      await dragStoryPointer(title, [
        { x: box.x, y: box.y },
        { x: box.x + 40, y: box.y + 30 },
      ]);
      await expect(useWindowStore.getState().windows['window-2']?.bounds.x).toBe(
        (start?.x ?? 0) + 40,
      );
      await expect(useWindowStore.getState().interaction).toBeNull();
    });

    await step('닫으면 창이 빠지고 남은 창이 맨 앞이 된다', async () => {
      await expect(canvas.getByRole('region', { name: FIRST_NAME })).toHaveAttribute(
        'data-window-state',
        'inactive',
      );
      await userEvent.click(within(front).getByRole('button', { name: '닫기' }));
      await expect(canvas.getByRole('region', { name: FIRST_NAME })).toHaveAttribute(
        'data-window-state',
        'active',
      );
      await waitFor(
        () => expect(canvas.queryByRole('region', { name: 'Chrome 2' })).not.toBeInTheDocument(),
        EXIT_WAIT,
      );
    });
  },
};

// @codocs [[창 동작:창 조작]]
// @codocs [[피그마 연동:모션 클래스]]
/** 창 하나를 최소화했다가 복원하고 닫는다. 열기·최소화·복원·닫기 모션이 차례로 붙는다 */
export const MinimizeRestoreAndClose: Story = {
  beforeEach: () => {
    openStoryWindows(['file-explorer']);
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const region = canvas.getByRole('region', { name: FIRST_NAME });

    await step('처음 연 창은 열기 모션이다', async () => {
      await expect(region).toHaveAttribute('data-window-motion', 'open');
    });

    await step('최소화하면 창을 빼지 않고 숨긴다', async () => {
      await userEvent.click(within(region).getByRole('button', { name: '최소화' }));
      await expect(region).toHaveAttribute('data-window-motion', 'minimize');
      await waitFor(() => expect(region).toHaveAttribute('hidden'), EXIT_WAIT);
      await expect(region).toBeInTheDocument();
      await expect(canvas.queryByRole('region', { name: FIRST_NAME })).not.toBeInTheDocument();
    });

    await step('복원하면 같은 창이 다시 보이고 복원 모션이다', async () => {
      useWindowStore.getState().restore('window-1');
      await waitFor(() => expect(canvas.getByRole('region', { name: FIRST_NAME })).toBe(region));
      await expect(region).toHaveAttribute('data-window-motion', 'restore');
    });

    await step(
      '닫으면 저장소에서 바로 지우고 애니메이션이 끝날 때까지 화면에만 남긴다',
      async () => {
        const finish: { resolve: () => void } = { resolve: () => undefined };
        const finished = new Promise<void>((resolve) => {
          finish.resolve = resolve;
        });
        const animation = { finished, effect: { getTiming: () => ({ iterations: 1 }) } };
        const animations = spyOn(Element.prototype, 'getAnimations').mockReturnValue([
          animation,
        ] as unknown as Animation[]);
        await userEvent.click(within(region).getByRole('button', { name: '닫기' }));
        await expect(useWindowStore.getState().windows).toEqual({});
        await expect(region).toBeInTheDocument();
        await expect(region).toHaveAttribute('data-window-motion', 'close');
        await expect(region).toHaveAttribute('inert');
        finish.resolve();
        animations.mockRestore();
        await waitFor(() => expect(region).not.toBeInTheDocument());
      },
    );
  },
};

// @codocs [[창 동작:창 조작]]
// @codocs [[피그마 연동:모션 클래스]]
/** 최대화 버튼과 제목 표시줄 더블클릭으로 최대화하고 복원한다 */
export const MaximizeAndRestore: Story = {
  beforeEach: openOnFullHd(['file-explorer']),
  play: async ({ canvasElement, step }) => {
    const { region, title } = getWindowParts(canvasElement, FIRST_NAME);
    const snapElement = getSnapElement(region);

    await step('최대화하면 이전 자리에서 이어지는 시작 값으로 최대화 모션을 재생한다', async () => {
      await expect(snapElement).not.toHaveAttribute('data-window-motion');
      const before = getStoredWindow('window-1');
      await userEvent.click(within(region).getByRole('button', { name: '최대화' }));
      const after = getStoredWindow('window-1');
      if (before === undefined || after === undefined) {
        throw new Error('창이 없다');
      }
      await expect(after.placement).toBe('maximized');
      await expect(region.offsetLeft).toBe(0);
      await expect(region.offsetWidth).toBe(1920);
      const flip = getSnapFlip(getWindowRect(before, WORK_AREA), getWindowRect(after, WORK_AREA));
      await expect(snapElement).toHaveAttribute('data-window-motion', 'snap');
      await expect(region).toHaveAttribute('data-window-motion', 'open');
      await expect(snapElement.style.getPropertyValue('--motion-window-snap-from-x')).toBe(
        `${String(flip.x)}px`,
      );
      await expect(snapElement.style.getPropertyValue('--motion-window-snap-from-y')).toBe(
        `${String(flip.y)}px`,
      );
      await expect(snapElement.style.getPropertyValue('--motion-window-snap-from-scale-x')).toBe(
        String(flip.scaleX),
      );
      await expect(snapElement.style.getPropertyValue('--motion-window-snap-from-scale-y')).toBe(
        String(flip.scaleY),
      );
    });

    await step('"이전 크기로 복원" 버튼을 누르면 원래 자리로 돌아간다', async () => {
      await userEvent.click(within(region).getByRole('button', { name: '이전 크기로 복원' }));
      await expect(getStoredWindow('window-1')?.placement).toBe('normal');
      await expect(region.offsetLeft).toBe(FIRST_BOUNDS.x);
      await expect(region.offsetWidth).toBe(FIRST_BOUNDS.width);
      await expect(within(region).getByRole('button', { name: '최대화' })).toBeInTheDocument();
    });

    await step('제목 표시줄을 더블클릭하면 최대화하고 다시 더블클릭하면 복원한다', async () => {
      await fireEvent.dblClick(title);
      await expect(getStoredWindow('window-1')?.placement).toBe('maximized');
      await fireEvent.dblClick(title);
      await expect(getStoredWindow('window-1')?.placement).toBe('normal');
    });
  },
};

// @codocs [[스냅:스냅 레이아웃]]
// @codocs [[스냅:Snap Assist]]
/** 스냅 레이아웃에서 칸을 고르고 남은 칸을 Snap Assist로 채운다 */
export const SnapLayoutAndAssist: Story = {
  beforeEach: openOnFullHd(['file-explorer', 'file-explorer']),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const second = canvas.getByRole('region', { name: SECOND_NAME });

    await step(
      '칸을 고르면 그 칸을 채우고, Snap Assist에서 고른 창이 남은 칸을 채운다',
      async () => {
        await selectSnapZone(second, '왼쪽 절반');
        await expect(getStoredWindow('window-2')).toMatchObject({
          placement: 'snapped',
          snapZone: { layout: 'half', index: 0 },
        });
        const assist = canvas.getByRole('dialog', { name: 'Snap Assist' });
        await userEvent.click(within(assist).getByRole('button', { name: FIRST_NAME }));
        await expect(getStoredWindow('window-1')).toMatchObject({
          placement: 'snapped',
          snapZone: { layout: 'half', index: 1 },
        });
        await expect(querySnapAssist(canvasElement)).not.toBeInTheDocument();
      },
    );

    await step('Snap Assist는 Esc를 누르면 닫힌다', async () => {
      await selectSnapZone(second, '오른쪽 절반');
      await expect(querySnapAssist(canvasElement)).toBeInTheDocument();
      await userEvent.keyboard('{Escape}');
      await expect(querySnapAssist(canvasElement)).not.toBeInTheDocument();
    });

    await step('Snap Assist는 빈 곳을 누르면 닫힌다', async () => {
      await selectSnapZone(second, '왼쪽 절반');
      await userEvent.click(canvas.getByRole('dialog', { name: 'Snap Assist' }));
      await expect(querySnapAssist(canvasElement)).not.toBeInTheDocument();
    });

    await step('열린 창이 하나뿐이면 Snap Assist를 보여 주지 않는다', async () => {
      const first = canvas.getByRole('region', { name: FIRST_NAME });
      await userEvent.click(within(first).getByRole('button', { name: '닫기' }));
      await waitFor(() => expect(first).not.toBeInTheDocument(), EXIT_WAIT);
      await selectSnapZone(second, '오른쪽 절반');
      await expect(getStoredWindow('window-2')).toMatchObject({
        placement: 'snapped',
        snapZone: { layout: 'half', index: 1 },
      });
      await expect(querySnapAssist(canvasElement)).not.toBeInTheDocument();
    });
  },
};

// @codocs [[창 동작:창 조작]]
/** 브라우저 화면 크기가 바뀐다. 제목 표시줄이 화면 밖으로 나갈 때만 창을 당겨 보인다. 자리 계산은 window-rules.test.ts가 본다 */
export const ScreenResize: Story = {
  beforeEach: openOnFullHd(['file-explorer']),
  play: async ({ canvasElement, step }) => {
    const { region, title } = getWindowParts(canvasElement, FIRST_NAME);

    await step('제목 표시줄이 화면 안에 남으면 창 자리를 그대로 그린다', async () => {
      setStoryScreen(1000, 600);
      await waitFor(() => expect(region.offsetLeft).toBe(FIRST_BOUNDS.x));
      await expect(region.offsetTop).toBe(FIRST_BOUNDS.y);
    });

    await step(
      '제목 표시줄이 나가게 되면 보이는 동안만 당겨 그리고 크기는 줄이지 않는다',
      async () => {
        setStoryScreen(500, 200);
        // 작업 영역 500×152에서 제목 표시줄 200×40이 남는 자리(가로 500 - 200, 세로 152 - 40)로 당긴다
        await waitFor(() => expect(region.offsetLeft).toBe(300));
        await expect(region.offsetTop).toBe(112);
        await expect(getStoredWindow('window-1')?.bounds).toEqual(FIRST_BOUNDS);
        await expect(region.offsetWidth).toBe(1024);
        await expect(region.offsetHeight).toBe(640);
      },
    );

    await step('화면이 다시 커지면 원래 자리로 돌아간다', async () => {
      setStoryScreen(1920, 1080);
      await waitFor(() => expect(region.offsetLeft).toBe(FIRST_BOUNDS.x));
      await expect(region.offsetTop).toBe(FIRST_BOUNDS.y);
    });

    await step('당겨 보이는 동안 끌어서 옮기면 새 자리를 기억한다', async () => {
      setStoryScreen(500, 200);
      await waitFor(() => expect(region.offsetLeft).toBe(300));
      await dragStoryPointer(title, [
        { x: 320, y: 120 },
        { x: 220, y: 100 },
      ]);
      await expect(getStoredWindow('window-1')?.bounds).toEqual({
        ...FIRST_BOUNDS,
        x: 200,
        y: 92,
      });
      setStoryScreen(1920, 1080);
      await waitFor(() => expect(region.offsetLeft).toBe(200));
    });
  },
};

// @codocs [[창 동작:창 조작]]
/** 제목 표시줄을 끌어 창을 옮긴다. 마우스 왼쪽 버튼과 펜만 받고, 끌기 거리를 넘어야 시작한다 */
export const DragWindow: Story = {
  beforeEach: openOnFullHd(['file-explorer']),
  play: async ({ canvasElement, step }) => {
    const { region, title } = getWindowParts(canvasElement, FIRST_NAME);

    await step('끌기 거리보다 조금 움직이면 끌지 않는다', async () => {
      await dragStoryPointer(title, [
        { x: 600, y: 210 },
        { x: 602, y: 211 },
      ]);
      await expect(getStoredWindow('window-1')?.bounds).toEqual(FIRST_BOUNDS);
      await expect(region.offsetLeft).toBe(FIRST_BOUNDS.x);
    });

    await step('창 버튼 위에서 누르면 끌지 않는다', async () => {
      await dragStoryPointer(within(region).getByRole('button', { name: '닫기' }), [
        { x: 1450, y: 210 },
        { x: 1000, y: 500 },
      ]);
      await expect(getStoredWindow('window-1')?.bounds).toEqual(FIRST_BOUNDS);
    });

    await step('터치로는 끌지 않는다', async () => {
      await dragStoryPointer(
        title,
        [
          { x: 600, y: 210 },
          { x: 800, y: 400 },
        ],
        'touch',
      );
      await expect(getStoredWindow('window-1')?.bounds).toEqual(FIRST_BOUNDS);
    });

    await step(
      '끄는 동안 창 요소만 따라오고 저장소 자리는 그대로이며 interaction은 drag다',
      async () => {
        await pressStoryPointer(title, [
          { x: 600, y: 210 },
          { x: 700, y: 260 },
        ]);
        await expect(region.offsetLeft).toBe(548);
        await expect(region.offsetTop).toBe(246);
        await expect(getStoredWindow('window-1')?.bounds).toEqual(FIRST_BOUNDS);
        await expect(useWindowStore.getState().interaction).toBe('drag');
      },
    );

    await step('놓으면 끈 자리를 저장소에 반영하고 interaction을 null로 돌린다', async () => {
      await fireEvent.pointerUp(title, storyPointerInit({ x: 700, y: 260 }));
      await expect(getStoredWindow('window-1')?.bounds).toEqual({
        ...FIRST_BOUNDS,
        x: 548,
        y: 246,
      });
      await expect(useWindowStore.getState().interaction).toBeNull();
      await waitFor(() => expect(region.offsetLeft).toBe(548));
    });

    await step('펜으로는 끈다', async () => {
      await dragStoryPointer(
        title,
        [
          { x: 600, y: 210 },
          { x: 800, y: 400 },
        ],
        'pen',
      );
      await expect(getStoredWindow('window-1')?.bounds).toMatchObject({ x: 748, y: 436 });
    });

    await step('화면 밖으로 끌어도 제목 표시줄 일부는 작업 영역 안에 남는다', async () => {
      await dragStoryPointer(title, [
        { x: 600, y: 210 },
        { x: 600, y: 3000 },
      ]);
      // 작업 영역 높이 1032에서 남기는 제목 표시줄 높이 40을 뺀다
      await expect(getStoredWindow('window-1')?.bounds.y).toBe(992);
    });
  },
};

// @codocs [[창 동작:창 조작]]
/** 끄는 도중 끌기가 끊긴다. 포인터 취소, 포인터 놓침, 창 닫힘, 창 층 사라짐 */
export const CancelDrag: Story = {
  beforeEach: openOnFullHd(['file-explorer', 'file-explorer']),
  render: (args) => <RemovableWindowLayer {...args} />,
  play: async ({ canvasElement, step }) => {
    const { region, title } = getWindowParts(canvasElement, SECOND_NAME);

    /** 창 2의 제목 표시줄을 눌러 끄는 도중까지 간다. */
    async function press(): Promise<void> {
      await pressStoryPointer(title, [
        { x: 700, y: 240 },
        { x: 800, y: 300 },
      ]);
      await expect(region.offsetLeft).toBe(SECOND_BOUNDS.x + 100);
    }

    await step('포인터가 취소되면 그린 자리로 돌아가고 저장소는 그대로다', async () => {
      await press();
      await fireEvent.pointerCancel(title, storyPointerInit({ x: 800, y: 300 }));
      await expect(region.offsetLeft).toBe(SECOND_BOUNDS.x);
      await expect(region.offsetTop).toBe(SECOND_BOUNDS.y);
      await expect(getStoredWindow('window-2')?.bounds).toEqual(SECOND_BOUNDS);
      await expect(useWindowStore.getState().interaction).toBeNull();
    });

    await step('취소한 뒤의 움직임과 놓기는 무시한다', async () => {
      await fireEvent.pointerMove(title, storyPointerInit({ x: 900, y: 400 }));
      await fireEvent.pointerUp(title, storyPointerInit({ x: 900, y: 400 }));
      await expect(region.offsetLeft).toBe(SECOND_BOUNDS.x);
      await expect(getStoredWindow('window-2')?.bounds).toEqual(SECOND_BOUNDS);
    });

    await step('붙잡은 포인터를 놓치면 그린 자리로 돌아가고 저장소는 그대로다', async () => {
      await press();
      await fireEvent.lostPointerCapture(title, storyPointerInit({ x: 800, y: 300 }));
      await expect(region.offsetLeft).toBe(SECOND_BOUNDS.x);
      await expect(getStoredWindow('window-2')?.bounds).toEqual(SECOND_BOUNDS);
      await expect(useWindowStore.getState().interaction).toBeNull();
    });

    await step('끄는 도중 창을 닫으면 interaction과 스냅 미리 보기를 지운다', async () => {
      await pressStoryPointer(title, [
        { x: 700, y: 240 },
        { x: 0, y: 500 },
      ]);
      await expect(querySnapPreview()).not.toBeNull();
      useWindowStore.getState().close('window-2');
      await waitFor(() => expect(useWindowStore.getState().interaction).toBeNull());
      await waitFor(() => expect(querySnapPreview()).toBeNull());
    });

    await step('끄는 도중 창 층이 사라지면 interaction을 null로 돌린다', async () => {
      await pressStoryPointer(getWindowParts(canvasElement, FIRST_NAME).title, [
        { x: 600, y: 210 },
        { x: 700, y: 260 },
      ]);
      await expect(useWindowStore.getState().interaction).toBe('drag');
      await userEvent.click(within(canvasElement).getByRole('button', { name: '창 층 빼기' }));
      await waitFor(() => expect(useWindowStore.getState().interaction).toBeNull());
    });
  },
};

// @codocs [[창 동작:창 조작]]
/** 가장자리·모서리 핸들을 끌어 창 크기를 바꾼다. 떠 있는 창에만 핸들이 있다 */
export const ResizeWindow: Story = {
  beforeEach: openOnFullHd(['file-explorer']),
  play: async ({ canvasElement, step }) => {
    const { region } = getWindowParts(canvasElement, FIRST_NAME);

    await step('떠 있는 창에는 크기 조절 핸들이 여덟 개 있다', async () => {
      await expect(countResizeHandles(region)).toBe(8);
    });

    await step('끄는 동안 저장소의 interaction은 resize다', async () => {
      const handle = getResizeHandle(region, 'e');
      await pressStoryPointer(handle, [
        { x: 1472, y: 500 },
        { x: 1500, y: 500 },
      ]);
      await expect(useWindowStore.getState().interaction).toBe('resize');
      await fireEvent.pointerCancel(handle, storyPointerInit({ x: 1500, y: 500 }));
      await expect(useWindowStore.getState().interaction).toBeNull();
    });

    await step('앱별 최소 크기보다 작게 줄이지 않는다', async () => {
      await dragStoryPointer(getResizeHandle(region, 'nw'), [
        { x: 448, y: 196 },
        { x: 1500, y: 1000 },
      ]);
      // 탐색기 최소 크기 500×340. 오른쪽 아래(1472, 836)는 그대로다
      await expect(getStoredWindow('window-1')?.bounds).toEqual({
        x: 972,
        y: 496,
        width: 500,
        height: 340,
      });
      await waitFor(() => expect(region.offsetWidth).toBe(500));
    });

    await step('모서리 핸들을 끌면 반대쪽 모서리는 두고 크기를 바꾼다', async () => {
      await dragStoryPointer(getResizeHandle(region, 'se'), [
        { x: 1472, y: 836 },
        { x: 1572, y: 876 },
      ]);
      await expect(getStoredWindow('window-1')?.bounds).toEqual({
        x: 972,
        y: 496,
        width: 600,
        height: 380,
      });
    });

    await step('최대화한 창에는 크기 조절 핸들이 없다', async () => {
      await userEvent.click(within(region).getByRole('button', { name: '최대화' }));
      await expect(countResizeHandles(region)).toBe(0);
      await userEvent.click(within(region).getByRole('button', { name: '이전 크기로 복원' }));
      await expect(countResizeHandles(region)).toBe(8);
    });

    await step('스냅한 창에는 크기 조절 핸들이 없다', async () => {
      useWindowStore.getState().snap('window-1', { layout: 'half', index: 0 });
      await waitFor(() => expect(countResizeHandles(region)).toBe(0));
    });
  },
};

// @codocs [[스냅:끌어서 스냅]]
// @codocs [[피그마 연동:모션 클래스]]
/** 창 하나를 끝으로 끌어 스냅한다. 끄는 동안 채울 자리를 미리 보여 준다 */
export const DragToSnap: Story = {
  beforeEach: openOnFullHd(['file-explorer']),
  play: async ({ canvasElement, step }) => {
    const { region, title } = getWindowParts(canvasElement, FIRST_NAME);

    await step('끝 근처가 아니면 미리 보기를 보여 주지 않는다', async () => {
      await pressStoryPointer(title, [
        { x: 700, y: 210 },
        { x: 300, y: 500 },
      ]);
      await expect(querySnapPreview()).toBeNull();
      await fireEvent.pointerCancel(title, storyPointerInit({ x: 300, y: 500 }));
    });

    await step('왼쪽 끝으로 끄는 동안 채울 절반 자리에 미리 보기를 보여 준다', async () => {
      await pressStoryPointer(title, [
        { x: 700, y: 210 },
        { x: 0, y: 500 },
      ]);
      const preview = querySnapPreview();
      await expect(preview?.offsetLeft).toBe(0);
      await expect(preview?.offsetTop).toBe(0);
      await expect(preview?.offsetWidth).toBe(960);
      await expect(preview?.offsetHeight).toBe(1032);
    });

    await step('끝에서 벗어나면 미리 보기를 지우고, 놓아도 스냅하지 않는다', async () => {
      await fireEvent.pointerMove(title, storyPointerInit({ x: 1500, y: 500 }));
      await expect(querySnapPreview()).toBeNull();
      await fireEvent.pointerUp(title, storyPointerInit({ x: 1500, y: 500 }));
      await expect(getStoredWindow('window-1')?.placement).toBe('normal');
    });

    await step(
      '왼쪽 끝에서 놓으면 끌던 자리에서 이어지는 모션으로 왼쪽 절반에 스냅한다',
      async () => {
        useWindowStore.getState().setBounds('window-1', FIRST_BOUNDS);
        await waitFor(() => expect(region.offsetLeft).toBe(FIRST_BOUNDS.x));
        await dragStoryPointer(title, [
          { x: 700, y: 210 },
          { x: 0, y: 500 },
        ]);
        await expect(getStoredWindow('window-1')).toMatchObject({
          placement: 'snapped',
          snapZone: { layout: 'half', index: 0 },
        });
        await waitFor(() => expect(region.offsetWidth).toBe(960));
        await expect(region.offsetLeft).toBe(0);
        await expect(querySnapPreview()).toBeNull();
        // 끌어서 스냅해도 떠 있을 때 자리는 끌기 전 그대로다
        await expect(getStoredWindow('window-1')?.bounds).toEqual(FIRST_BOUNDS);
        // 포인터가 (-700, +290) 움직인 자리다
        const dragged = { x: -252, y: 486, width: 1024, height: 640 };
        const flip = getSnapFlip(dragged, getSnapZoneRect({ layout: 'half', index: 0 }, WORK_AREA));
        const snapElement = getSnapElement(region);
        await expect(snapElement).toHaveAttribute('data-window-motion', 'snap');
        await expect(snapElement.style.getPropertyValue('--motion-window-snap-from-x')).toBe(
          `${String(flip.x)}px`,
        );
        await expect(snapElement.style.getPropertyValue('--motion-window-snap-from-y')).toBe(
          `${String(flip.y)}px`,
        );
      },
    );

    await step('모서리로 끌어 놓으면 그 4분의 1에 스냅한다', async () => {
      await dragStoryPointer(title, [
        { x: 100, y: 10 },
        { x: 1919, y: 1031 },
      ]);
      await expect(getStoredWindow('window-1')).toMatchObject({
        placement: 'snapped',
        snapZone: { layout: 'quad', index: 3 },
      });
    });
  },
};

// @codocs [[스냅:끌어서 스냅]]
/** 다른 창이 있을 때 끌어서 스냅하면 Snap Assist를 열고, 위쪽 끝으로 끌어 최대화하면 열지 않는다 */
export const DragToSnapWithOtherWindow: Story = {
  beforeEach: openOnFullHd(['file-explorer', 'file-explorer']),
  play: async ({ canvasElement, step }) => {
    const { title } = getWindowParts(canvasElement, SECOND_NAME);

    await step('끌어서 스냅하고 남은 칸에 다른 창이 있으면 Snap Assist를 연다', async () => {
      await dragStoryPointer(title, [
        { x: 700, y: 240 },
        { x: 0, y: 500 },
      ]);
      await expect(querySnapAssist(canvasElement)).toBeInTheDocument();
      await userEvent.keyboard('{Escape}');
    });

    await step('위쪽 끝으로 끌어 놓으면 최대화하고 Snap Assist를 열지 않는다', async () => {
      await dragStoryPointer(title, [
        { x: 700, y: 240 },
        { x: 900, y: 0 },
      ]);
      await expect(getStoredWindow('window-2')?.placement).toBe('maximized');
      await expect(querySnapAssist(canvasElement)).not.toBeInTheDocument();
    });
  },
};

// @codocs [[스냅:스냅된 창]]
// @codocs [[피그마 연동:모션 클래스]]
/** 최대화·스냅한 창을 끌어 떼어 낸다. 떠 있을 때 크기로 돌아가고 최대화·스냅 모션은 재생하지 않는다 */
export const DragOffSnapped: Story = {
  beforeEach: () => {
    const restoreScreen = openOnFullHd(['file-explorer'])();
    useWindowStore.getState().maximize('window-1');
    return restoreScreen;
  },
  play: async ({ canvasElement, step }) => {
    const { region, title } = getWindowParts(canvasElement, FIRST_NAME);
    const snapElement = getSnapElement(region);

    await step(
      '최대화한 창을 끌면 떠 있을 때 크기가 되어 누른 자리의 가로 비율로 포인터 아래에 온다',
      async () => {
        await pressStoryPointer(title, [
          { x: 480, y: 10 },
          { x: 500, y: 40 },
        ]);
        // 작업 영역 너비의 1/4 지점을 눌렀으므로 창 너비의 1/4 지점이 포인터 아래에 온다
        await expect(getStoredWindow('window-1')).toMatchObject({
          placement: 'normal',
          bounds: { x: 244, y: 30, width: 1024, height: 640 },
        });
        await waitFor(() => expect(region.offsetWidth).toBe(1024));
      },
    );

    await step('떼어 낼 때는 최대화·스냅 모션을 재생하지 않는다', async () => {
      await expect(snapElement).not.toHaveAttribute('data-window-motion');
    });

    await step('떼어 낸 창을 놓을 때도 최대화·스냅 모션을 재생하지 않는다', async () => {
      await fireEvent.pointerMove(title, storyPointerInit({ x: 600, y: 140 }));
      await fireEvent.pointerUp(title, storyPointerInit({ x: 600, y: 140 }));
      await expect(snapElement).not.toHaveAttribute('data-window-motion');
    });

    await step('떼어 낸 창은 계속 포인터를 따라오고 놓은 자리를 저장소에 반영한다', async () => {
      useWindowStore.getState().snap('window-1', { layout: 'half', index: 1 });
      await waitFor(() => expect(region.offsetLeft).toBe(960));
      await dragStoryPointer(title, [
        { x: 1200, y: 10 },
        { x: 1100, y: 40 },
        { x: 1000, y: 140 },
      ]);
      // 오른쪽 절반(960부터 960 너비)의 1/4 지점을 눌렀다. 뗀 자리 x = 1100 - 256 = 844에서 100 더 왼쪽이다
      await expect(getStoredWindow('window-1')?.bounds).toMatchObject({ x: 744, y: 130 });
      await waitFor(() => expect(region.offsetLeft).toBe(744));
    });
  },
};

// @codocs [[창 동작:모바일]]
/** 모바일 폭에서는 창이 작업 영역을 가득 채운다. 뷰포트는 addon-vitest가 실제 브라우저 크기로 바꾼다 */
export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  beforeEach: () => {
    openStoryWindows(['chrome']);
  },
  play: async ({ canvasElement, step }) => {
    await expect(window.matchMedia('(max-width: 767px)').matches).toBe(true);
    const { region, title } = getWindowParts(canvasElement, 'Chrome 1');

    await step('창이 화면 너비를 채운다', async () => {
      // 실제 브라우저라 여는 애니메이션의 scale이 getBoundingClientRect에 들어가므로 배치 크기를 본다.
      await expect(region.offsetWidth).toBe(window.innerWidth);
    });

    await step('제목 표시줄을 끌어도 옮기지 않는다', async () => {
      const before = getStoredWindow('window-1');
      await dragStoryPointer(title, [
        { x: 100, y: 10 },
        { x: 200, y: 300 },
      ]);
      await expect(getStoredWindow('window-1')).toBe(before);
    });

    await step('크기 조절 핸들이 없다', async () => {
      await expect(countResizeHandles(region)).toBe(0);
    });
  },
};
