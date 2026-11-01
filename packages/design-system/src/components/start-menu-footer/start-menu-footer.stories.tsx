import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { StartMenuFooter } from './start-menu-footer';

const meta = {
  title: 'Components/StartMenuFooter',
  // 부모가 너비를 정하는 컴포넌트라 피그마 원본 너비 638로 감싼다.
  // content 슬롯은 언제나 비어 있으므로, 피그마 빈 슬롯이 차지하는 높이 100만 칠 없는 빈 내용으로 둔다.
  render: () => (
    <div className="w-638">
      <StartMenuFooter>
        <div className="w-full" style={{ height: 100 }} />
      </StartMenuFooter>
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트라 args 없이 하나뿐인 변형을 그린다.
export const Figma: Story = {};

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
