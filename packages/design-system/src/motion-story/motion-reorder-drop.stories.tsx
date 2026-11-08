import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SampleTaskbarButton } from './sample-taskbar-button';

// @codocs [[피그마 연동:모션]]
// 견본 motion-reorder-drop에는 TaskbarButton 인스턴스를 놓고 인스턴스 전체에 키프레임(배율 1.1 → 1, 이동 → 0)을 건다.
// 놓기는 동작에 따라 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다([[항목 조작:순서 바꾸기 끌기]]).
// 실행 중 값은 놓은 위치에서 새 자리까지의 거리이고(견본 주석의 `@runtime`), 견본의 대표값 이동 (20, 0)을 넣는다.
const meta = {
  title: 'Motion/motion-reorder-drop',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const runtimeValues = {
  '--motion-reorder-from-x': '20px',
  '--motion-reorder-from-y': '0px',
};

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-reorder-drop" runtimeValues={runtimeValues}>
      {(motionClassName) => <SampleTaskbarButton motionClassName={motionClassName} />}
    </MotionPreview>
  ),
};
