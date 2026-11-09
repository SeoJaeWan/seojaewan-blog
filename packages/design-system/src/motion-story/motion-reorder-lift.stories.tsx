import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SampleTaskbarButton } from './sample-taskbar-button';

// @codocs [[피그마 연동:모션]]
// 견본 motion-reorder-lift에는 TaskbarButton 인스턴스를 놓고 인스턴스 전체에 키프레임(배율 1 → 1.1)을 건다.
// 끌기 시작은 동작에 따라 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다([[항목 조작:순서 바꾸기 끌기]]).
// 실행 중 값은 없다(견본 주석에 `@runtime`이 없다).
const meta = {
  title: 'Motion/motion-reorder-lift',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-reorder-lift">
      {(motionClassName) => <SampleTaskbarButton motionClassName={motionClassName} />}
    </MotionPreview>
  ),
};
