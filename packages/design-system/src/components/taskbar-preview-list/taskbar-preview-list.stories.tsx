import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { TaskbarPreviewList } from './taskbar-preview-list';

// 피그마 TaskbarPreviewList의 변형 속성 값이다(정규화한 이름).
const MATERIALS = ['acrylic', 'solid'] as const;

type FigmaArgs = {
  material: (typeof MATERIALS)[number];
};

const meta = {
  title: 'Components/TaskbarPreviewList',
  args: { material: 'acrylic' },
  argTypes: {
    material: { control: 'inline-radio', options: MATERIALS },
  },
  // 컴포넌트의 Previews 슬롯은 언제나 비어 있으므로, 피그마 빈 슬롯이 차지하는 크기 208x164만 칠 없는 빈 내용으로 둔다.
  render: (args) => (
    <TaskbarPreviewList material={args.material}>
      <div className="shrink-shrink-none" style={{ width: 208, height: 164 }} />
    </TaskbarPreviewList>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 미리보기를 children 자리에 그리고, 역할과 접근성 이름 같은 div 속성을 넘긴다 */
export const Default: Story = {
  render: () => (
    <TaskbarPreviewList role="list" aria-label="창 미리보기 목록">
      <div role="listitem">창 미리보기</div>
    </TaskbarPreviewList>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('역할과 접근성 이름 같은 div 속성을 그대로 넘긴다', async () => {
      await expect(canvas.getByRole('list', { name: '창 미리보기 목록' })).toBeInTheDocument();
    });

    await step('미리보기를 children 자리(피그마 슬롯)에 그린다', async () => {
      await expect(within(canvas.getByRole('list')).getByRole('listitem')).toHaveTextContent(
        '창 미리보기',
      );
    });
  },
};
