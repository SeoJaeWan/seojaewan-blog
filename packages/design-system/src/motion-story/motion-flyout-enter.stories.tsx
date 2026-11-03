import type { Meta, StoryObj } from '@storybook/react-vite';

import { Flyout } from '../components/flyout/flyout';
import { MenuItem } from '../components/menu-item/menu-item';
import { MotionPreview } from './motion-preview';

// @codocs [[피그마 연동:모션]]
// 견본 motion-flyout-enter에는 Flyout 인스턴스를 놓고 인스턴스 전체에 투명도 키프레임을 건다.
// 메뉴·메시지 상자가 뜰 때 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다. 실행 중 값은 없다(견본 주석에 `@runtime`이 없다).
// Flyout은 너비가 없어 부모를 채우므로 Flyout 스토리처럼 너비 320의 부모로 감싸고, 내용은 메뉴 항목으로 채운다.
const meta = {
  title: 'Motion/motion-flyout-enter',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-flyout-enter">
      {(motionClassName) => (
        <div className="w-size-search-box-wide-width p-spacing-2xl">
          <Flyout className={motionClassName}>
            <MenuItem standalone label="열기" />
            <MenuItem standalone label="이름 바꾸기" />
            <MenuItem standalone label="삭제" />
          </Flyout>
        </div>
      )}
    </MotionPreview>
  ),
};
