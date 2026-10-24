import type { Meta, StoryObj } from '@storybook/react-vite';

import { SectionTitle } from './section-title';

const meta = {
  title: 'Components/SectionTitle',
  // 변형 속성이 없다. 글자는 피그마 Title 속성의 기본값이다.
  // 부모가 너비를 정하는 컴포넌트라 피그마 원본 너비 574로 감싼다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
  render: () => (
    <div className="w-574">
      <SectionTitle />
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(default)를 그린다.
export const Parity: Story = {};
