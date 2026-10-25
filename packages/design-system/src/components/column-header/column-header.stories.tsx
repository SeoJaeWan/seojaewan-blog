import type { Meta, StoryObj } from '@storybook/react-vite';

import { ColumnHeader } from './column-header';

// 피그마 ColumnHeader의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const STATES = ['rest', 'hover'] as const;
const SORTS = ['none', 'ascending', 'descending'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
  sort: (typeof SORTS)[number];
};

const meta = {
  title: 'Components/ColumnHeader',
  args: { state: 'rest', sort: 'none' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
    sort: { control: 'inline-radio', options: SORTS },
  },
  // 너비는 쓰는 곳이 정하므로 피그마 원본 너비 188로 감싼다.
  render: (args) => <ColumnHeader sort={args.sort} className="w-188" />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
