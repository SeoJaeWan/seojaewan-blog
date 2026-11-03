import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SamplePanel } from './sample-panel';

// @codocs [[피그마 연동:모션]]
// 견본 motion-panel-exit에는 ShellSurface 인스턴스(desktop 640x720)를 놓고 인스턴스 전체에 키프레임을 건다.
// 패널 닫기는 동작에 따라 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다. 실행 중 값은 없다(견본 주석에 `@runtime`이 없다).
// 스테이지 밖으로 넘치는 부분은 잘라 아래로 내려가며 사라지는 모습을 보인다.
const meta = {
  title: 'Motion/motion-panel-exit',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-panel-exit">
      {(motionClassName) => <SamplePanel motionClassName={motionClassName} />}
    </MotionPreview>
  ),
};
