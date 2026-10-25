import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SampleBootScreen } from './sample-boot-screen';

// @codocs [[피그마 연동:모션]]
// 견본 motion-boot-screen-exit에는 BootScreen 인스턴스를 놓고 인스턴스 전체의 투명도(1 → 0)에 키프레임을 건다.
// 안의 ProgressRing 호 회전·트림 트랙은 motion-progress-ring과 같은 값이라 새로 만들지 않고, 컴포넌트가 이미 붙인 클래스가 함께 돈다.
// 재부팅 화면 전환은 동작에 따라 붙는 움직임이라 BootScreen에는 붙이지 않고 여기서만 건다. 실행 중 값은 없다([[디자인 기반:모션]] 표).
const meta = {
  title: 'Motion/motion-boot-screen-exit',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-boot-screen-exit">
      {(motionClassName) => (
        <div className="p-24">
          <SampleBootScreen motionClassName={motionClassName} />
        </div>
      )}
    </MotionPreview>
  ),
};
