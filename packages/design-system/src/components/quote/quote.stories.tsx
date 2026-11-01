import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Quote } from './quote';

const meta = {
  title: 'Components/Quote',
  // 너비는 쓰는 곳이 정하므로 피그마 원본 너비 720으로 감싼다.
  // Content 슬롯은 언제나 비어 있으므로, 피그마 빈 슬롯이 차지하는 높이 100만 칠 없는 빈 내용으로 둔다.
  render: () => (
    <div className="w-720">
      <Quote>
        <div style={{ height: 100 }} />
      </Quote>
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트라 args 없이 하나를 그린다.
export const Parity: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 인용 글을 슬롯(children)에 채운다 */
export const Default: Story = {
  render: () => (
    <Quote>
      <p>인용 글</p>
    </Quote>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('인용 글')).toBeInTheDocument();
  },
};
