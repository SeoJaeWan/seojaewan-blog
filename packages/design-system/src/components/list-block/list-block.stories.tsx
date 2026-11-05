import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import listBlockExport from '../../../figma/components/list-block/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { ListBlock } from './list-block';

type FigmaArgs = {
  variant: 'bulleted' | 'numbered' | 'to-do';
  isChecked: boolean;
};

const meta = {
  title: 'Components/ListBlock',
  // 너비는 쓰는 곳이 정하므로 FigmaFrame이 export.json 견본 너비(@sample-size width)로 감싼다
  // ([[디자인 시스템:컴포넌트 조립 규칙]]). 목록 항목(li)이라 목록(ul)으로 감싼다.
  decorators: [figmaFrame(listBlockExport)],
  args: { variant: 'bulleted', isChecked: false },
  argTypes: {
    variant: { control: 'select', options: ['bulleted', 'numbered', 'to-do'] },
    isChecked: { control: 'boolean' },
  },
  // 글자 속성은 피그마 기본값(`Text` 목록 항목)을 넣는다. 표시는 변형이 그린다. `Checked`는 `To do`에서만 그린다.
  render: (args) => (
    <ul>
      {args.variant === 'to-do' ? (
        <ListBlock variant="to-do" isChecked={args.isChecked} label="목록 항목" text="목록 항목" />
      ) : (
        <ListBlock variant={args.variant} text="목록 항목" />
      )}
    </ul>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다(`Variant=To do, Checked=True` → `variant: 'to-do', isChecked: true`).
export const Figma: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 하위 항목(피그마 `Children` 슬롯)은 `hasChildren`일 때 그리고, 할 일은 체크 상태를 읽기 전용 Checkbox로 알린다 */
export const Nested: Story = {
  render: () => (
    <ul>
      <ListBlock variant="bulleted" marker="•" text="상위 항목" hasChildren>
        <ul>
          <ListBlock variant="to-do" isChecked label="끝낸 할 일" text="끝낸 할 일" />
        </ul>
      </ListBlock>
    </ul>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('hasChildren이면 하위 항목을 상위 항목 안에 그린다', async () => {
      const [parent] = canvas.getAllByRole('listitem');
      await expect(parent).toHaveTextContent('상위 항목');
      await expect(within(parent as HTMLElement).getByText('끝낸 할 일')).toBeInTheDocument();
    });

    await step('끝낸 할 일은 체크된 읽기 전용 표시다', async () => {
      await expect(canvas.getByRole('checkbox', { name: '끝낸 할 일' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });
  },
};
