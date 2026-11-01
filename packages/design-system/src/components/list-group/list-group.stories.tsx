import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { ListGroup } from './list-group';

type StoryArgs = {
  /** 동작 스토리에서 호출 횟수를 확인하는 핸들러 */
  onHeaderClick?: () => void;
};

const meta = {
  title: 'Components/ListGroup',
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** label을 머리글 글자로, children을 items 슬롯으로 그린다. onHeaderClick이 없으면 머리글은 버튼이 아니다 */
export const Default: Story = {
  render: () => (
    <ListGroup label="최근">
      <span>항목</span>
    </ListGroup>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('최근')).toBeInTheDocument();
    await expect(canvas.getByText('항목')).toBeInTheDocument();
    await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** onHeaderClick을 넘기면 머리글이 버튼이 되고, 누르면 부른다 */
export const HeaderClickable: Story = {
  args: { onHeaderClick: fn() },
  render: ({ onHeaderClick: handleHeaderClick }) => (
    <ListGroup label="최근" onHeaderClick={handleHeaderClick}>
      <span>항목</span>
    </ListGroup>
  ),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '최근' }));
    await expect(args.onHeaderClick).toHaveBeenCalledOnce();
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** showHeader가 false면 머리글을 그리지 않는다 */
export const HeaderHidden: Story = {
  render: () => (
    <ListGroup showHeader={false} label="최근">
      <span>항목</span>
    </ListGroup>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('최근')).not.toBeInTheDocument();
    await expect(canvas.getByText('항목')).toBeInTheDocument();
  },
};
