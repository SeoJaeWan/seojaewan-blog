import type { Meta, StoryObj } from '@storybook/react-vite';

import { SnapZone } from './snap-zone';

// 피그마 SnapZone의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'hover'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
};

const meta = {
  title: 'Components/SnapZone',
  // 높이·너비가 짝수라 0.5px 위치를 피하려고 padded로 둔다.
  parameters: { layout: 'padded' },
  args: { state: 'rest' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
  },
  render: () => <SnapZone />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover는 캡처 도구가 마우스로 재현한다.
export const Parity: Story = {};
