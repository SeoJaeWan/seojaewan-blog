import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { ScrollArea } from './scroll-area';

const meta = {
  title: 'Components/ScrollArea',
  component: ScrollArea,
} satisfies Meta<typeof ScrollArea>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * 스크롤바(`aria-hidden`)를 찾는다.
 * @param canvasElement 스토리 루트
 * @returns 스크롤바 요소
 */
function getScrollbar(canvasElement: HTMLElement): HTMLElement {
  const scrollbar = canvasElement.querySelector<HTMLElement>('[data-state]');
  if (scrollbar === null) throw new Error('스크롤바를 찾지 못했다');
  return scrollbar;
}

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 내용이 넘치지 않으면 스크롤바를 숨기고, 마우스를 올려도 보이지 않는다 */
export const Default: Story = {
  render: () => (
    <ScrollArea material="solid" className="h-200 w-200">
      <p>항목 이름</p>
    </ScrollArea>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await expect(canvas.getByText('항목 이름')).toBeInTheDocument();
    await expect(getScrollbar(canvasElement)).not.toBeVisible();

    await userEvent.hover(canvas.getByText('항목 이름'));

    await expect(getScrollbar(canvasElement)).not.toBeVisible();
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 내용이 넘치면 스크롤바를 보이고, 마우스를 올리면 펼치고 내리면 접는다 */
export const Overflow: Story = {
  render: () => (
    <ScrollArea material="solid" className="h-200 w-200">
      <div className="h-600 shrink-0">긴 내용</div>
    </ScrollArea>
  ),
  play: async ({ canvas, canvasElement, userEvent, step }) => {
    const scrollbar = getScrollbar(canvasElement);

    await step('넘치는 내용을 재면 스크롤바가 나타난다', async () => {
      await waitFor(() => expect(scrollbar).toBeVisible());
      await expect(scrollbar).toHaveAttribute('data-state', 'rest');
    });

    await step('마우스를 올리면 펼치고 내리면 접는다', async () => {
      await userEvent.hover(canvas.getByText('긴 내용'));
      await expect(scrollbar).toHaveAttribute('data-state', 'expanded');
      await userEvent.unhover(canvas.getByText('긴 내용'));
      await expect(scrollbar).toHaveAttribute('data-state', 'rest');
    });
  },
};
