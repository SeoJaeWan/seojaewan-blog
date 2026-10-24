import type { Meta, StoryObj } from '@storybook/react-vite';

import { EmptyState } from './empty-state';

type ParityArgs = {
  /** 피그마 TEXT 속성 Heading */
  heading: string;
  /** 피그마 TEXT 속성 Message */
  message: string;
  /** 피그마 TEXT 속성 Code */
  code: string;
  /** 피그마 BOOLEAN 속성 Show button */
  showButton: boolean;
};

const meta = {
  title: 'Components/EmptyState',
  // 글자는 피그마 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { heading: '제목', message: '메시지 내용', code: '오류 코드', showButton: true },
  argTypes: {
    heading: { control: 'text' },
    message: { control: 'text' },
    code: { control: 'text' },
    showButton: { control: 'boolean' },
  },
  render: (args) => (
    // EmptyState는 너비를 갖지 않고 쓰는 곳이 정한다. 피그마 원본의 미리보기 너비(600)로 감싼다.
    <div className="w-600">
      <EmptyState
        heading={args.heading}
        message={args.message}
        code={args.code}
        showButton={args.showButton}
      />
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형이 하나(default)라 기본 args가 그 변형이다.
export const Parity: Story = {};
