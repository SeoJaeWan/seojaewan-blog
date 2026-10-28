import type { Meta, StoryObj } from '@storybook/react-vite';

import { UnsupportedBlock } from './unsupported-block';

const meta = {
  title: 'Components/UnsupportedBlock',
  // 너비는 쓰는 곳이 정하므로 피그마 원본 너비 720으로 감싼다.
  render: () => (
    <div className="w-720">
      <UnsupportedBlock />
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트라 args 없이 하나를 그린다.
export const Parity: Story = {};
