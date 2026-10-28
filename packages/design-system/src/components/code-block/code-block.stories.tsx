import type { Meta, StoryObj } from '@storybook/react-vite';

import { CodeBlock } from './code-block';

const meta = {
  title: 'Components/CodeBlock',
  // 글자는 피그마 Language 속성의 기본값이다. 너비는 쓰는 곳이 정하므로 피그마 원본 너비 720으로 감싼다.
  // 피그마 Code 슬롯은 비어 있고 높이 100만 갖는다. 코드의 슬롯은 내용 높이라 같은 높이의 빈 자리를 넣는다.
  render: () => (
    <div className="w-720">
      <CodeBlock language="언어">
        <span className="block" style={{ height: 100 }} />
      </CodeBlock>
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형은 하나뿐이다.
export const Parity: Story = {};

// 강조된 코드를 슬롯에 넣은 모습이다. 색은 `code-syntax` 토큰 클래스다([[기술 스택:글 본문 처리]]).
export const Highlighted: Story = {
  render: () => (
    <div className="w-720">
      <CodeBlock language="ts">
        <span className="text-code-syntax-keyword-control">const</span>{' '}
        <span className="text-code-syntax-variable">count</span>{' '}
        <span className="text-code-syntax-punctuation">=</span>{' '}
        <span className="text-code-syntax-constant">1</span>
        <span className="text-code-syntax-punctuation">;</span>
        {'\n'}
        <span className="text-code-syntax-comment">// 한글 주석</span>
      </CodeBlock>
    </div>
  ),
};
