import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SampleCategoryFolderPage } from './sample-category-folder-page';

// @codocs [[피그마 연동:모션]]
// 조립 흐름 motion-start-category-folder-page에는 격자를 자르는 틀(page clip) 안에 항목 격자(tile grid)를 놓고, 격자에 키프레임(위로 252px)을 건다.
// 쪽 넘김은 동작에 따라 붙는 움직임이라 컴포넌트에는 붙이지 않고 여기서만 건다. 지금 앱의 범주 팝업은 ScrollArea로 스크롤하고, 휠 쪽 넘김은 따로 만든다([[Start 메뉴:모두]]).
// 실행 중 값은 없다(견본 주석에 `@runtime`이 없다). 쪽 표시 점이 바뀌는 모습은 재현하지 않는다.
const meta = {
  title: 'Motion/motion-start-category-folder-page',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-start-category-folder-page">
      {(motionClassName) => <SampleCategoryFolderPage motionClassName={motionClassName} />}
    </MotionPreview>
  ),
};
