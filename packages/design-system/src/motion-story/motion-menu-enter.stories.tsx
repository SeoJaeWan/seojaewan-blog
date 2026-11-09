import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SampleMenu } from './sample-menu';

// @codocs [[피그마 연동:모션]]
// 조립 흐름 motion-menu-enter에는 자르는 틀(menu clip) 안에 보기 메뉴 조립(Menu/ViewOptions, 항목 셋)을 놓고
// 메뉴 전체에 세로 이동 키프레임(-102 → 0)을 건다. 클래스는 틀에 걸고 틀 바로 안의 메뉴가 움직인다(motion.css).
// 메뉴를 열 때 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다. 실행 중 값은 없다.
const meta = {
  title: 'Motion/motion-menu-enter',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const VIEW_OPTION_LABELS = ['간단히', '그리드', '범주'] as const;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-menu-enter">
      {(motionClassName) => (
        <SampleMenu
          motionClassName={motionClassName}
          labels={VIEW_OPTION_LABELS}
          width="view-options"
        />
      )}
    </MotionPreview>
  ),
};
