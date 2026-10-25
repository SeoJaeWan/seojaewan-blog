import type { Meta, StoryObj } from '@storybook/react-vite';

import { RenameField } from './rename-field';

type ParityArgs = {
  /** 피그마 변형 속성 State */
  state: 'selected' | 'rest';
  /** 피그마 TEXT 속성 text */
  text: string;
};

const meta = {
  title: 'Components/RenameField',
  // 너비가 31로 홀수라 가운데 정렬하면 0.5px 위치에 놓여 그림이 밀리므로 여백 배치를 쓴다.
  parameters: { layout: 'padded' },
  // 글자는 피그마 text 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { state: 'selected', text: '이름' },
  argTypes: {
    state: { control: 'inline-radio', options: ['selected', 'rest'] },
    text: { control: 'text' },
  },
  render: (args) => (
    // text와 state는 마운트 때만 쓰는 값이라 바꾸면 처음부터 다시 그리도록 key를 바꾼다.
    // selected는 마운트할 때 전체가 선택되어 피그마의 파랗게 선택된 이름과 같고, rest는 선택하지 않는다.
    <RenameField
      key={`${args.state}-${args.text}`}
      aria-label="이름 바꾸기"
      text={args.text}
      shouldSelectOnMount={args.state === 'selected'}
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// args의 state로 피그마 변형(Selected, Rest)을 고른다.
export const Parity: Story = {};
