import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';
import { expect, fireEvent, waitFor } from 'storybook/test';

import scrollAreaExport from '../../../figma/components/scroll-area/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { ImageAsset } from '../image-asset/image-asset';
import { ListItem } from '../list-item/list-item';
import { ScrollArea } from './scroll-area';

// 피그마 ScrollArea의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'hover'] as const;
const MATERIALS = ['acrylic', 'solid'] as const;

// 피그마 Content 슬롯 기본 내용(ListItem Compact 8개)이다.
const FIGMA_ITEM_COUNT = 8;
// 넘치지 않는 내용의 항목 수다(36 × 3 < 200).
const FITTING_ITEM_COUNT = 3;

type FigmaArgs = {
  state: (typeof STATES)[number];
  material: (typeof MATERIALS)[number];
};

/**
 * 피그마 슬롯 기본 내용과 같은 목록 항목을 그린다.
 * @param count 항목 수
 * @returns 목록 항목들
 */
function renderItems(count: number): JSX.Element[] {
  return Array.from({ length: count }, (_, index) => (
    <ListItem key={index} icon={<ImageAsset name="images/file-document" />} />
  ));
}

const meta = {
  title: 'Components/ScrollArea',
  args: { state: 'rest', material: 'acrylic' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
    material: { control: 'inline-radio', options: MATERIALS },
  },
  // 크기는 쓰는 곳이 정하므로 FigmaFrame이 피그마 원본 크기(size/list-item/width × size/scrollbar/length)로 감싼다.
  // State=Hover는 마우스를 올려 재현한다. 가운데에 올리면 목록 항목이 Hover가 되므로 스크롤바([data-state])에 올린다.
  // 감싸는 요소 안의 ScrollArea가 캡처 대상이라 data-parity-target을 단다.
  decorators: [figmaFrame(scrollAreaExport)],
  render: (args) => (
    <ScrollArea material={args.material} data-parity-target data-parity-hover="[data-state]">
      {renderItems(FIGMA_ITEM_COUNT)}
    </ScrollArea>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * 스크롤바(`aria-hidden`, `data-state`)를 찾는다.
 * @param canvasElement 스토리 루트
 * @returns 스크롤바 요소
 */
function getScrollbar(canvasElement: HTMLElement): HTMLElement {
  const scrollbar = canvasElement.querySelector<HTMLElement>('[data-state]');
  if (scrollbar === null) throw new Error('스크롤바를 찾지 못했다');
  return scrollbar;
}

/**
 * ScrollArea 루트(스크롤되는 요소의 부모)를 찾는다. 스토리 루트의 첫 요소는 FigmaFrame이 감싼 요소다.
 * @param canvasElement 스토리 루트
 * @returns ScrollArea 루트
 */
function getRoot(canvasElement: HTMLElement): HTMLElement {
  const root = getViewport(canvasElement).parentElement;
  if (root === null) throw new Error('ScrollArea 루트를 찾지 못했다');
  return root;
}

/**
 * 스크롤되는 요소를 찾는다.
 * @param canvasElement 스토리 루트
 * @returns 스크롤되는 요소
 */
function getViewport(canvasElement: HTMLElement): HTMLElement {
  const viewport = canvasElement.querySelector<HTMLElement>('[data-scrollbar-hidden]');
  if (viewport === null) throw new Error('스크롤 영역을 찾지 못했다');
  return viewport;
}

/**
 * 스크롤바 막대(thumb)를 찾는다.
 * @param scrollbar 스크롤바
 * @returns 막대 요소
 */
function getThumb(scrollbar: HTMLElement): HTMLElement {
  const thumb = scrollbar.querySelector<HTMLElement>(':scope > div');
  if (thumb === null) throw new Error('막대를 찾지 못했다');
  return thumb;
}

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. 캡처용이라 play를 두지 않는다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/**
 * 내용이 넘치면 가는 스크롤바를 늘 보이고, 마우스를 스크롤바 칸에 올렸을 때만 펼친다.
 * 막대를 끄는 동안은 칸 밖이어도 펼친 채이고, 스크롤하거나 끌면 막대가 움직인다
 */
export const Overflow: Story = {
  args: { material: 'solid' },
  play: async ({ canvasElement, step, userEvent }) => {
    const root = getRoot(canvasElement);
    const scrollbar = getScrollbar(canvasElement);
    const viewport = getViewport(canvasElement);
    // CI의 실제 포인터 위치와 상관없도록 포인터 사건을 직접 보낸다
    await fireEvent.pointerOut(root, { relatedTarget: document.body });

    await step('넘치는 내용을 재면 스크롤바가 나타난다', async () => {
      await waitFor(() => expect(scrollbar).toBeVisible());
      await expect(scrollbar).toHaveAttribute('data-state', 'rest');
    });

    // @codocs [[디자인 기반:겹쳐 놓기]]
    await step('영역에 마우스를 올려도 펼치지 않는다', async () => {
      await fireEvent.pointerOver(viewport);
      await expect(scrollbar).toHaveAttribute('data-state', 'rest');
    });

    await step('스크롤바 칸에 올리면 펼치고 칸을 벗어나면 접는다', async () => {
      await fireEvent.pointerOver(scrollbar);
      await expect(scrollbar).toHaveAttribute('data-state', 'expanded');
      await fireEvent.pointerOut(scrollbar, { relatedTarget: viewport });
      await expect(scrollbar).toHaveAttribute('data-state', 'rest');
    });

    await step('막대를 끄는 동안은 칸 밖이어도 펼친 채이고 끈 만큼 스크롤된다', async () => {
      const thumb = getThumb(scrollbar);
      const startOffset = thumb.offsetTop;
      const startY = thumb.getBoundingClientRect().top + 1;
      await fireEvent.pointerOver(scrollbar);
      await fireEvent.pointerDown(scrollbar, { button: 0, clientY: startY });
      await fireEvent.pointerOut(scrollbar, { relatedTarget: document.body });
      await expect(scrollbar).toHaveAttribute('data-state', 'expanded');
      await fireEvent.pointerMove(window, { clientY: startY + 20 });
      await waitFor(() => expect(viewport.scrollTop).toBeGreaterThan(0));
      await fireEvent.pointerUp(window, { clientY: startY + 20 });
      await expect(scrollbar).toHaveAttribute('data-state', 'rest');
      viewport.scrollTo({ top: 0 });
      await waitFor(() => expect(thumb.offsetTop).toBe(startOffset));
    });

    await step('목록 항목은 눌리지 않고 넘친 만큼 스크롤된다', async () => {
      await expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
      const thumb = getThumb(scrollbar);
      const startOffset = thumb.offsetTop;
      viewport.scrollTo({ top: viewport.scrollHeight });
      await waitFor(() => expect(thumb.offsetTop).toBeGreaterThan(startOffset));
      viewport.scrollTo({ top: 0 });
      await waitFor(() => expect(thumb.offsetTop).toBe(startOffset));
    });

    // 방향키 스크롤은 브라우저 기본 동작이라 합성 키 사건으로는 일어나지 않는다. 포커스가 닿는지만 본다.
    await step('포커스할 항목이 없으면 Tab으로 영역에 포커스가 닿는다', async () => {
      await userEvent.tab();
      await expect(viewport).toHaveFocus();
    });
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 내용이 넘치지 않으면 스크롤바를 숨기고, 영역은 포커스를 받지 않는다 */
export const FitsContent: Story = {
  args: { material: 'solid' },
  render: (args) => (
    <ScrollArea material={args.material}>{renderItems(FITTING_ITEM_COUNT)}</ScrollArea>
  ),
  play: async ({ canvasElement }) => {
    const root = getRoot(canvasElement);
    const scrollbar = getScrollbar(canvasElement);

    await expect(scrollbar).not.toBeVisible();
    await fireEvent.pointerOver(root);
    await expect(scrollbar).not.toBeVisible();
    await expect(getViewport(canvasElement)).not.toHaveAttribute('tabindex');
  },
};
