import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SamplePinnedSwap } from './sample-pinned-tile';

// @codocs [[피그마 연동:모션]]
// 조립 흐름 motion-start-pinned-move-swap에는 자리를 바꾸는 칸(PinnedTile)을 옛 자리(old place)와 새 자리(new place)에 놓고,
// 메뉴가 사라진 뒤 300ms에 옛 자리는 투명도 1 → 0, 새 자리는 0 → 1로 함께 바꾼다(교차 페이드).
// 메뉴로 옮길 때 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다([[Start 메뉴:고정됨]]). 실행 중 값은 없다.
const meta = {
  title: 'Motion/motion-start-pinned-move-swap',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-start-pinned-move-swap">
      {(motionClassName) => <SamplePinnedSwap motionClassName={motionClassName} />}
    </MotionPreview>
  ),
};
