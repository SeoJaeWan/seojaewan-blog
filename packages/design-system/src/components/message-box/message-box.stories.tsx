import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { MessageBox } from './message-box';

// 피그마 MessageBox의 변형 속성 값이다(정규화한 이름).
const BUTTONS = ['one', 'two'] as const;

type FigmaArgs = {
  buttons: (typeof BUTTONS)[number];
  /** 피그마 TEXT 속성 Title */
  title: string;
  /** 피그마 TEXT 속성 Message */
  message: string;
  /** 동작 스토리에서 강조 버튼 누르기를 확인하는 핸들러 */
  onPrimaryClick?: () => void;
  /** 동작 스토리에서 기본 버튼 누르기를 확인하는 핸들러 */
  onSecondaryClick?: () => void;
};

const meta = {
  title: 'Components/MessageBox',
  // 글자는 피그마 Title·Message 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { buttons: 'one', title: '제목', message: '메시지 내용' },
  argTypes: {
    buttons: { control: 'inline-radio', options: BUTTONS },
    title: { control: 'text' },
    message: { control: 'text' },
  },
  render: (args) => <MessageBox buttons={args.buttons} title={args.title} message={args.message} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 제목을 이름으로, 메시지를 설명으로 갖는 alertdialog다. 버튼은 확인 하나뿐이다 */
export const Default: Story = {
  render: () => <MessageBox title="휴지통 비우기" message="모든 항목을 지울까요?" id="box" />,
  play: async ({ canvas, step }) => {
    const dialog = canvas.getByRole('alertdialog', { name: '휴지통 비우기' });

    await step('메시지를 설명으로 갖는다', async () => {
      await expect(dialog).toHaveAccessibleDescription('모든 항목을 지울까요?');
    });
    await step('div 속성을 바탕에 넘긴다', async () => {
      await expect(dialog).toHaveAttribute('id', 'box');
    });
    await step('확인 버튼 하나만 그린다', async () => {
      await expect(canvas.getAllByRole('button')).toHaveLength(1);
      await expect(canvas.getByRole('button', { name: '확인' })).toBeInTheDocument();
    });
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 확인과 취소 버튼을 그리고 누르면 각 핸들러를 부른다 */
export const TwoButtons: Story = {
  args: { onPrimaryClick: fn(), onSecondaryClick: fn() },
  render: ({ onPrimaryClick: handlePrimaryClick, onSecondaryClick: handleSecondaryClick }) => (
    <MessageBox
      buttons="two"
      title="제목"
      message="메시지 내용"
      primaryLabel="비우기"
      onPrimaryClick={handlePrimaryClick}
      onSecondaryClick={handleSecondaryClick}
    />
  ),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '비우기' }));
    await userEvent.click(canvas.getByRole('button', { name: '취소' }));

    await expect(args.onPrimaryClick).toHaveBeenCalledTimes(1);
    await expect(args.onSecondaryClick).toHaveBeenCalledTimes(1);
  },
};
