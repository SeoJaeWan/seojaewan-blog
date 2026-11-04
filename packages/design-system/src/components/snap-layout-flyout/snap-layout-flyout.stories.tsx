import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { SnapLayoutOptionLayout } from '../snap-layout-option/snap-layout-option';
import { SnapLayoutFlyout } from './snap-layout-flyout';

const meta = {
  title: 'Components/SnapLayoutFlyout',
  // 높이가 짝수가 아닐 수 있어 0.5px 위치를 피하려고 padded로 둔다.
  parameters: { layout: 'padded' },
  render: () => <SnapLayoutFlyout />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트라 args 없이 그린다.
export const Figma: Story = {};

type SelectZoneArgs = { onSelectZone: (layout: SnapLayoutOptionLayout, index: number) => void };
type SelectZoneStory = StoryObj<SelectZoneArgs>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 칸을 누르면 레이아웃과 칸 번호로 onSelectZone을 부른다 */
export const Default: SelectZoneStory = {
  args: { onSelectZone: fn() },
  render: (args) => {
    const { onSelectZone: handleSelectZone } = args;
    return <SnapLayoutFlyout onSelectZone={handleSelectZone} />;
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('레이아웃 넷(칸 2+2+3+4개)을 그린다', async () => {
      await expect(canvas.getAllByRole('group')).toHaveLength(4);
      await expect(canvas.getAllByRole('button')).toHaveLength(11);
    });

    await step('칸을 누르면 레이아웃과 칸 번호로 onSelectZone을 부른다', async () => {
      const half = within(canvas.getByRole('group', { name: '반반' }));
      const twoThirds = within(canvas.getByRole('group', { name: '3분의 2와 3분의 1' }));
      const quad = within(canvas.getByRole('group', { name: '4분할' }));
      await userEvent.click(half.getByRole('button', { name: '오른쪽 절반' }));
      await userEvent.click(twoThirds.getByRole('button', { name: '왼쪽 3분의 2' }));
      await userEvent.click(quad.getByRole('button', { name: '오른쪽 아래 4분의 1' }));
      await expect(args.onSelectZone).toHaveBeenCalledTimes(3);
      await expect(args.onSelectZone).toHaveBeenNthCalledWith(1, 'half', 1);
      await expect(args.onSelectZone).toHaveBeenNthCalledWith(2, 'two-thirds', 0);
      await expect(args.onSelectZone).toHaveBeenNthCalledWith(3, 'quad', 3);
    });
  },
};
