import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { StartMenuFooter } from './start-menu-footer';

const meta = {
  title: 'Components/StartMenuFooter',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** children을 content 슬롯에 그린다 */
export const Default: Story = {
  render: () => (
    <StartMenuFooter>
      <span>내용</span>
    </StartMenuFooter>
  ),
  play: async ({ canvasElement, step }) => {
    await step('children을 content 슬롯에 그린다', async () => {
      await expect(within(canvasElement).getByText('내용')).toBeInTheDocument();
    });
  },
};
