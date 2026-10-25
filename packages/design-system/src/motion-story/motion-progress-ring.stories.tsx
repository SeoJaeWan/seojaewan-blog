import type { Meta, StoryObj } from '@storybook/react-vite';

import { ProgressRing } from '../components/progress-ring/progress-ring';
import { MotionPreview } from './motion-preview';

// @codocs [[피그마 연동:모션]]
// 견본 motion-progress-ring에는 ProgressRing 인스턴스만 놓는다. 컴포넌트가 이미 클래스를 붙이므로 같은 컴포넌트를 그린다.
// 실행 중 값은 없다([[디자인 기반:모션]] 표).
const meta = {
  title: 'Motion/motion-progress-ring',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-progress-ring">
      {() => <ProgressRing size="64" aria-label="불러오는 중" />}
    </MotionPreview>
  ),
};
