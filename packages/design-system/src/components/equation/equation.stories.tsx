import type { Meta, StoryObj } from '@storybook/react-vite';

import { Equation } from './equation';

const meta = {
  title: 'Components/Equation',
  // 너비는 쓰는 곳이 정하므로 피그마 원본 너비 720으로 감싼다. 피그마의 빈 `Formula` 슬롯은 100x100
  // 자리 표시이고 수식 그림은 없다. 자리 표시 크기는 토큰에 없는 값이라 인라인으로 준다.
  render: () => (
    <div className="w-720">
      <Equation>
        <div style={{ width: 100, height: 100 }} />
      </Equation>
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형은 하나뿐이다.
export const Parity: Story = {};
