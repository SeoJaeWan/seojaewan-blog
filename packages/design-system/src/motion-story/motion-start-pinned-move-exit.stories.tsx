import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SamplePinnedTile } from './sample-pinned-tile';

// @codocs [[피그마 연동:모션]]
// 조립 흐름 motion-start-pinned-move-exit에는 PinnedTile 인스턴스를 놓고 인스턴스 전체에 키프레임(배율 1 → 0.91, 투명도 1 → 0)을 메뉴가 사라진 뒤 90ms에 건다.
// 메뉴로 옮기는 칸의 사라짐은 동작에 따라 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다([[Start 메뉴:고정됨]]).
// 실행 중 값은 없다(견본 주석에 `@runtime`이 없다).
const meta = {
  title: 'Motion/motion-start-pinned-move-exit',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-start-pinned-move-exit">
      {(motionClassName) => <SamplePinnedTile motionClassName={motionClassName} />}
    </MotionPreview>
  ),
};
