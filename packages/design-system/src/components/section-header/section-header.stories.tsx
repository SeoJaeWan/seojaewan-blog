import type { Meta, StoryObj } from '@storybook/react-vite';

import { SectionHeader } from './section-header';

const meta = {
  title: 'Components/SectionHeader',
  // 변형 속성이 없다. 글자는 피그마 Label 속성의 기본값이다.
  render: () => <SectionHeader />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(default)를 그린다.
export const Parity: Story = {};
