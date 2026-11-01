import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Toc } from './toc';

type FigmaArgs = {
  state: 'expanded' | 'collapsed';
};

const meta = {
  title: 'Components/Toc',
  args: { state: 'expanded' },
  argTypes: {
    state: { control: 'inline-radio', options: ['expanded', 'collapsed'] },
  },
  // 컴포넌트의 Items 슬롯은 언제나 비어 있으므로, 피그마 원본 크기(220×100 슬롯)만 칠 없는 빈 내용으로 채운다.
  render: (args) => (
    <Toc state={args.state} style={{ width: 220 }}>
      <div className="w-full shrink-shrink-none" style={{ height: 100 }} />
    </Toc>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(State)를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 펼치면 제목과 Items 슬롯의 children을 보이고, 제목은 titleProps의 동작·접근성 속성을 받는다 */
export const Default: Story = {
  render: () => (
    <Toc titleProps={{ role: 'button', tabIndex: 0, 'aria-expanded': true }}>
      <span>항목</span>
    </Toc>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('펼친 상태로 제목과 children을 보인다', async () => {
      await expect(canvas.getByText('목차').closest('[data-state]')).toHaveAttribute(
        'data-state',
        'expanded',
      );
      await expect(canvas.getByText('항목')).toBeInTheDocument();
    });

    await step('제목은 titleProps의 동작·접근성 속성을 받는다', async () => {
      await expect(canvas.getByRole('button', { name: '목차' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 접으면 제목과 꺾쇠만 보이고 children은 그리지 않는다 */
export const Collapsed: Story = {
  render: () => (
    <Toc state="collapsed" title="이 글의 목차">
      <span>항목</span>
    </Toc>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('바꾼 제목만 보이고 children은 그리지 않는다', async () => {
      await expect(canvas.getByText('이 글의 목차').closest('[data-state]')).toHaveAttribute(
        'data-state',
        'collapsed',
      );
      await expect(canvas.queryByText('항목')).not.toBeInTheDocument();
    });
  },
};
