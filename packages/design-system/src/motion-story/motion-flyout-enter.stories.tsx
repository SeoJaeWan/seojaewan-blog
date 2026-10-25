import type { Meta, StoryObj } from '@storybook/react-vite';

import { Flyout } from '../components/flyout/flyout';
import { MotionPreview } from './motion-preview';

// @codocs [[피그마 연동:모션]]
// 견본 motion-flyout-enter에는 Flyout 인스턴스를 놓고 인스턴스 전체에 투명도 키프레임을 건다.
// 메뉴·메시지 상자가 뜰 때 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다. 실행 중 값은 없다([[디자인 기반:모션]] 표).
// Flyout은 너비가 없어 부모를 채우므로 Flyout 스토리처럼 너비 320의 부모로 감싼다.
const meta = {
  title: 'Motion/motion-flyout-enter',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-flyout-enter">
      {(motionClassName) => (
        <div className="w-320 p-24">
          <Flyout className={motionClassName}>
            <div className="h-16" />
          </Flyout>
        </div>
      )}
    </MotionPreview>
  ),
};
