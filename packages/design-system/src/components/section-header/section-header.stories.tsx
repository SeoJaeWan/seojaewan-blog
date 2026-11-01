import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { SectionHeader } from './section-header';

const meta = {
  title: 'Components/SectionHeader',
  // 변형 속성이 없다. 글자는 피그마 Label 속성의 기본값이다.
  render: () => <SectionHeader />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(default)를 그린다.
export const Parity: Story = {};

type ClickArgs = { onClick: () => void };
type ClickStory = StoryObj<ClickArgs>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** onClick이 없는 머리글은 누를 수 없는 글자다 */
export const Default: Story = {
  render: () => <SectionHeader label="고정됨" />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('label로 바꾼 글자를 그린다', async () => {
      await expect(canvas.getByText('고정됨')).toBeInTheDocument();
    });

    await step('onClick이 없으면 버튼이 아니다', async () => {
      await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** onClick이 있으면 머리글을 버튼으로 그리고, 누르면 부른다 */
export const Clickable: ClickStory = {
  args: { onClick: fn() },
  render: (args) => {
    const { onClick: handleClick } = args;
    return <SectionHeader label="고정됨" onClick={handleClick} />;
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('누르면 onClick을 한 번 부른다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '고정됨' }));
      await expect(args.onClick).toHaveBeenCalledOnce();
    });
  },
};
