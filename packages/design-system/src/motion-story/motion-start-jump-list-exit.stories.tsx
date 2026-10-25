import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SampleJumpList } from './sample-jump-list';

// @codocs [[피그마 연동:모션]]
// 견본 motion-start-jump-list-exit에는 Start/JumpList 조립 인스턴스(배율 1 → 1.15, 투명도 1 → 0)와
// 앱 목록 list 레이어(투명도 0 → 1)가 함께 있다. 조립은 앱에 있어 SampleJumpList가 디자인 시스템 컴포넌트로 비슷하게 그린다.
// 글자 목록 닫기는 동작에 따라 붙는 움직임이라 여기서만 건다. 실행 중 값은 없다([[디자인 기반:모션]] 표).
const meta = {
  title: 'Motion/motion-start-jump-list-exit',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-start-jump-list-exit">
      {(motionClassName) => (
        <div className="p-24">
          <SampleJumpList motionClassName={motionClassName} />
        </div>
      )}
    </MotionPreview>
  ),
};
