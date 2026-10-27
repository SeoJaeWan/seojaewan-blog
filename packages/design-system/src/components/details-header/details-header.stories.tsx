import type { Meta, StoryObj } from '@storybook/react-vite';

import { DetailsHeader } from './details-header';

// 피그마 DetailsHeader의 변형 속성 값이다(정규화한 이름).
const VIEWS = ['default', 'recycle-bin'] as const;

type ParityArgs = {
  view: (typeof VIEWS)[number];
  /** 피그마 BOOLEAN 속성 Show location */
  showLocation: boolean;
};

const meta = {
  title: 'Components/DetailsHeader',
  args: { view: 'default', showLocation: false },
  argTypes: {
    view: { control: 'inline-radio', options: VIEWS },
    showLocation: { control: 'boolean' },
  },
  render: (args) => <DetailsHeader view={args.view} showLocation={args.showLocation} />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
