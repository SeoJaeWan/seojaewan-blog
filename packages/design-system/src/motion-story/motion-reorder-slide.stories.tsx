import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SampleTaskbarButton } from './sample-taskbar-button';

// @codocs [[피그마 연동:모션]]
// 조립 흐름 motion-reorder-slide에는 TaskbarButton 인스턴스를 놓고 인스턴스 전체에 키프레임(이동 → 0)을 건다.
// 밀려나는 항목의 미끄러짐은 동작에 따라 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다([[항목 조작:순서 바꾸기 끌기]]).
// 실행 중 값은 이전 자리에서 새 자리까지의 거리이고(흐름의 Development 주석), 흐름의 대표값 이동 (44, 0)을 넣는다.
const meta = {
  title: 'Motion/motion-reorder-slide',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const runtimeValues = {
  '--motion-reorder-from-x': '44px',
  '--motion-reorder-from-y': '0px',
};

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-reorder-slide" runtimeValues={runtimeValues}>
      {(motionClassName) => <SampleTaskbarButton motionClassName={motionClassName} />}
    </MotionPreview>
  ),
};
