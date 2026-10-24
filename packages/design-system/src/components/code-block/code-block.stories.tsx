import type { Meta, StoryObj } from '@storybook/react-vite';

import { CodeBlock } from './code-block';

const meta = {
  title: 'Components/CodeBlock',
  // 글자는 피그마 Language·Code 속성의 기본값이다. 너비는 쓰는 곳이 정하므로 피그마 원본 너비 720으로 감싼다.
  render: () => (
    <div className="w-720">
      <CodeBlock language="언어" code="코드" />
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형은 하나뿐이다.
export const Parity: Story = {};
