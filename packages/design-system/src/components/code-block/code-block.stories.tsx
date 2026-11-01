import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { CodeBlock } from './code-block';

const meta = {
  title: 'Components/CodeBlock',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// 강조된 코드를 슬롯에 넣은 모습이다. 색은 `code-syntax` 토큰 클래스다([[기술 스택:글 본문 처리]]).
export const Highlighted: Story = {
  render: () => (
    <div className="w-size-post-width">
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

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Copy: Story = {
  render: () => (
    <div className="w-size-post-width">
      <CodeBlock language="ts">
        <span>const</span> <span>a = 1;</span>
      </CodeBlock>
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('언어와 코드 자리를 그린다', async () => {
      await expect(canvas.getByText('ts')).toBeInTheDocument();
      await expect(canvas.getByText('const')).toBeInTheDocument();
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('복사 단추를 누르면 강조된 코드의 글자를 클립보드에 쓴다', async () => {
      // userEvent.setup()이 클립보드를 시험용으로 바꿔 읽어 볼 수 있다.
      const user = userEvent.setup();
      await user.click(canvas.getByRole('button', { name: '코드 복사' }));
      await waitFor(async () => {
        await expect(await navigator.clipboard.readText()).toBe('const a = 1;');
      });
    });
  },
};
