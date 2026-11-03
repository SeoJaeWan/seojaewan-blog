import type { Meta, StoryObj } from '@storybook/react-vite';

import { TocItem } from '../toc-item/toc-item';
import { Toc } from './toc';

type FigmaArgs = {
  state: 'expanded' | 'collapsed';
};

const meta = {
  title: 'Components/Toc',
  args: { state: 'expanded' },
  argTypes: {
    state: { control: 'inline-radio', options: ['expanded', 'collapsed'] },
  },
  // 너비는 쓰는 곳이 정하므로 피그마 폭 토큰(size/toc/width)으로 준다.
  // Items 슬롯에는 피그마 슬롯 기본 내용(TocItem 4개)을 그대로 넣는다.
  render: (args) => (
    <Toc state={args.state} className="w-size-toc-width">
      <TocItem active label="use 훅" />
      <TocItem label="useActionState" />
      <TocItem label="useOptimistic" />
      <TocItem label="마이그레이션" />
    </Toc>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(State)를 args 하나로 고른다.
export const Figma: Story = {};
