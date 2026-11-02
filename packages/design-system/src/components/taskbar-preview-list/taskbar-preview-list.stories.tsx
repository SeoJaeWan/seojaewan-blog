import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { TaskbarPreviewList } from './taskbar-preview-list';

const meta = {
  title: 'Components/TaskbarPreviewList',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 미리보기를 children 자리에 그리고, 역할과 접근성 이름 같은 div 속성을 넘긴다 */
export const Default: Story = {
  render: () => (
    <TaskbarPreviewList role="list" aria-label="창 미리보기 목록">
      <div role="listitem">창 미리보기</div>
    </TaskbarPreviewList>
  ),
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 조립이 쓰지 않는 변형(Material=Solid)도 그린다 */
export const Solid: Story = {
  render: () => (
    <TaskbarPreviewList material="solid" role="list" aria-label="창 미리보기 목록">
      <div role="listitem">창 미리보기</div>
    </TaskbarPreviewList>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('listitem')).toHaveTextContent('창 미리보기');
  },
};
