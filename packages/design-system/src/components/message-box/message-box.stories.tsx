import type { Meta, StoryObj } from '@storybook/react-vite';

import { MessageBox } from './message-box';

// 피그마 MessageBox의 변형 속성 값이다(정규화한 이름).
const BUTTONS = ['one', 'two'] as const;

type ParityArgs = {
  buttons: (typeof BUTTONS)[number];
  /** 피그마 TEXT 속성 Title */
  title: string;
  /** 피그마 TEXT 속성 Message */
  message: string;
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
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
