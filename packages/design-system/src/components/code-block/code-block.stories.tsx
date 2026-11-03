import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import codeBlockExport from '../../../figma/components/code-block/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { CodeBlock } from './code-block';
import { codeBlockStorySample } from './story-data';

const meta = {
  title: 'Components/CodeBlock',
  decorators: [figmaFrame(codeBlockExport)],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 슬롯 기본 내용(코드 2줄)을 실제 강조기 결과로 그린 모습이다([[기술 스택:글 본문 처리]]).
export const Figma: Story = {
  render: () => (
    <CodeBlock language={codeBlockStorySample.label} lines={codeBlockStorySample.lines} />
  ),
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Copy: Story = {
  render: () => (
    <CodeBlock language={codeBlockStorySample.label} lines={codeBlockStorySample.lines} />
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('언어와 코드 자리를 그린다', async () => {
      await expect(canvas.getByText(codeBlockStorySample.label)).toBeInTheDocument();
      await expect(canvas.getByText('fetchPost')).toBeInTheDocument();
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('복사 단추를 누르면 강조된 코드의 글자를 클립보드에 쓴다', async () => {
      // userEvent.setup()이 클립보드를 시험용으로 바꿔 읽어 볼 수 있다.
      const user = userEvent.setup();
      await user.click(canvas.getByRole('button', { name: '코드 복사' }));
      await waitFor(async () => {
        await expect(await navigator.clipboard.readText()).toBe(codeBlockStorySample.code);
      });
    });
  },
};
