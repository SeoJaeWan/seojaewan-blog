import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SampleWindow } from './sample-window';

// @codocs [[피그마 연동:모션]]
// 견본 motion-window-minimize에는 WindowFrame 인스턴스(800x500)를 놓고 인스턴스 전체에 키프레임을 건다.
// 창 최소화는 동작에 따라 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다.
// 실행 중 값은 도착 위치(작업 표시줄 앱 버튼)이고([[디자인 기반:모션]] 표), 견본의 대표값 이동 (-380, 294)을 넣는다.
const meta = {
  title: 'Motion/motion-window-minimize',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const runtimeValues = {
  '--motion-window-taskbar-offset-x': '-380px',
  '--motion-window-taskbar-offset-y': '294px',
};

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-window-minimize" runtimeValues={runtimeValues}>
      {(motionClassName) => (
        <div className="p-24">
          <SampleWindow motionClassName={motionClassName} />
        </div>
      )}
    </MotionPreview>
  ),
};
