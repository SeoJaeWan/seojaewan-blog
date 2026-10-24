import type { Meta, StoryObj } from '@storybook/react-vite';

import { TaskbarPreviewList } from './taskbar-preview-list';

// 피그마 TaskbarPreviewList의 변형 속성 값이다(정규화한 이름).
const MATERIALS = ['acrylic', 'solid'] as const;

type ParityArgs = {
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
      <div className="shrink-0" style={{ width: 208, height: 164 }} />
    </TaskbarPreviewList>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
