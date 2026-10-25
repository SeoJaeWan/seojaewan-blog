import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SampleWindow } from './sample-window';

// @codocs [[피그마 연동:모션]]
// 견본 motion-window-snap에는 WindowFrame 인스턴스(800x500)를 놓고 인스턴스 전체에 키프레임을 건다.
// 최대화·복원·스냅은 동작에 따라 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다.
// 실행 중 값은 이전 위치·크기이고([[디자인 기반:모션]] 표), 견본의 대표값 이동 (120, 60), 배율 X 0.6·Y 0.7을 넣는다.
const meta = {
  title: 'Motion/motion-window-snap',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const runtimeValues = {
  '--motion-window-snap-from-x': '120px',
  '--motion-window-snap-from-y': '60px',
  '--motion-window-snap-from-scale-x': '0.6',
  '--motion-window-snap-from-scale-y': '0.7',
};

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-window-snap" runtimeValues={runtimeValues}>
      {(motionClassName) => (
        <div className="p-24">
          <SampleWindow motionClassName={motionClassName} />
        </div>
      )}
    </MotionPreview>
  ),
};
