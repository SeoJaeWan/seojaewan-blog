import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import tocExport from '../../../figma/components/toc/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { TocItem } from '../toc-item/toc-item';
import { Toc } from './toc';

// 피그마 Toc의 State 값이다. State를 state arg로 넘기면 render가 isExpanded로 바꿔 Toc에 준다.
type FigmaArgs = {
  state: 'expanded' | 'collapsed';
};

const meta = {
  title: 'Components/Toc',
  args: { state: 'expanded' },
  argTypes: {
    state: { control: 'inline-radio', options: ['expanded', 'collapsed'] },
  },
  // 너비는 쓰는 곳이 정하므로 FigmaFrame이 피그마 폭 토큰(size/toc/width)으로 감싼다.
  // Items 슬롯에는 피그마 슬롯 기본 내용(TocItem 4개)을 그대로 넣는다.
  decorators: [figmaFrame(tocExport)],
  render: (args) => (
    <Toc isExpanded={args.state === 'expanded'}>
      <TocItem isActive label="use 훅" />
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

// 넘칠 때 스크롤을 보는 데 쓰는 많은 항목이다. 앱처럼 항목을 눌러 이동할 수 있게(포커스할 수 있게) 둔다.
const manyLabels = Array.from({ length: 40 }, (_, index) => `목차 항목 ${String(index + 1)}`);

// @codocs [[Chrome:글 화면]]
/** 항목이 최대 높이를 넘으면 목차 안의 ScrollArea로 세로 스크롤하고, 항목 높이는 줄지 않는다 */
export const Overflow: Story = {
  render: () => (
    <Toc>
      {manyLabels.map((label, index) => (
        <TocItem key={label} role="button" tabIndex={0} isActive={index === 0} label={label} />
      ))}
    </Toc>
  ),
  play: async ({ canvasElement, step }) => {
    const first = within(canvasElement).getByText(manyLabels[0] ?? '');
    const item = first.parentElement;
    const viewport = item?.closest('[data-scrollbar-hidden]');
    await step('Items 자리를 감싼 ScrollArea가 넘친 만큼 스크롤된다', async () => {
      await expect(viewport).not.toBeNull();
      await expect(viewport?.scrollHeight).toBeGreaterThan(viewport?.clientHeight ?? 0);
      await expect(getComputedStyle(viewport as Element).overflowY).toBe('auto');
    });
    await step('항목은 Items 너비를 채운다', async () => {
      await expect(item?.getBoundingClientRect().width).toBe(viewport?.clientWidth);
    });
    await step('항목은 피그마 높이 그대로다', async () => {
      await expect(item?.getBoundingClientRect().height).toBe(20);
    });
  },
};
