import type { Meta, StoryObj } from '@storybook/react-vite';

import { DetailsHeader } from './details-header';

type ParityArgs = {
  showLocation: boolean;
};

const meta = {
  title: 'Components/DetailsHeader',
  args: { showLocation: false },
  argTypes: {
    showLocation: { control: 'boolean' },
  },
  render: (args) => <DetailsHeader showLocation={args.showLocation} />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 DetailsHeader는 변형이 없고 기본 모양 하나다.
export const Parity: Story = {};
