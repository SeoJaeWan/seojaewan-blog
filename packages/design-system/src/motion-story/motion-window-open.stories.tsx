import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SampleWindow } from './sample-window';

// @codocs [[피그마 연동:모션]]
// 견본 motion-window-open에는 WindowFrame 인스턴스(800x500)를 놓고 인스턴스 전체에 키프레임을 건다.
// 창 열기는 동작에 따라 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다. 실행 중 값은 없다([[디자인 기반:모션]] 표).
const meta = {
  title: 'Motion/motion-window-open',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-window-open">
      {(motionClassName) => (
        <div className="p-24">
          <SampleWindow motionClassName={motionClassName} />
        </div>
      )}
    </MotionPreview>
  ),
};
