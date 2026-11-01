import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { ListGroup } from './list-group';

type ParityArgs = {
  showHeader: boolean;
  /** 동작 스토리에서 호출 횟수를 확인하는 핸들러 */
  onHeaderClick?: () => void;
};

const meta = {
  title: 'Components/ListGroup',
  args: { showHeader: true },
  // 컴포넌트는 너비를 갖지 않으므로, 피그마 원본 너비 574로 감싸 그린다.
  // 컴포넌트의 items 슬롯은 언제나 비어 있으므로, 피그마 빈 슬롯이 차지하는 높이 74만 칠 없는 빈 내용으로 둔다.
  render: (args) => (
    <div className="w-574">
      <ListGroup showHeader={args.showHeader}>
        <div className="w-full shrink-0" style={{ height: 74 }} />
      </ListGroup>
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(default)를 그린다.
export const Parity: Story = {};

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
