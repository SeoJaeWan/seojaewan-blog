import type { Meta, StoryObj } from '@storybook/react-vite';

import { RenameField } from './rename-field';

type ParityArgs = {
  /** 피그마 TEXT 속성 text */
  text: string;
};

const meta = {
  title: 'Components/RenameField',
  // 글자는 피그마 text 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { text: '이름' },
  argTypes: { text: { control: 'text' } },
  render: (args) => (
    // text는 처음 값이라 바꾸면 처음부터 다시 그리도록 key를 바꾼다.
    // 마운트할 때 전체가 선택되어 피그마의 파랗게 선택된 이름과 같은 모습이 된다.
    <RenameField key={args.text} aria-label="이름 바꾸기" text={args.text} />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 하나뿐이라 args 없이 기본 모양을 그린다.
export const Parity: Story = {};
