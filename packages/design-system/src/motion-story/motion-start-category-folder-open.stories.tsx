import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SampleCategoryFolder } from './sample-category-folder';

// @codocs [[피그마 연동:모션]]
// 조립 흐름 motion-start-category-folder-open에는 StartCategoryFolder 인스턴스를 놓고 인스턴스 전체에 키프레임(배율 0 → 1, 이동 → 제자리)을 건다.
// 범주 팝업 열기는 동작에 따라 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다([[Start 메뉴:모두]]).
// 실행 중 값은 시작 위치(누른 카드의 아이콘·이름 가운데 점)이고(견본 주석), 견본의 "글" 카드 기준 대표값 이동 (-98, -86)을 넣는다.
const meta = {
  title: 'Motion/motion-start-category-folder-open',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const runtimeValues = {
  '--motion-category-folder-offset-x': '-98px',
  '--motion-category-folder-offset-y': '-86px',
};

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-start-category-folder-open" runtimeValues={runtimeValues}>
      {(motionClassName) => <SampleCategoryFolder motionClassName={motionClassName} />}
    </MotionPreview>
  ),
};
