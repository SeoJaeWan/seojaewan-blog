import type { Meta, StoryObj } from '@storybook/react-vite';

import { MotionPreview } from './motion-preview';
import { SampleSearchIcon } from './sample-search-icon';

// @codocs [[피그마 연동:모션]]
// 견본 motion-search-box-focus는 키프레임을 자산 원본 icon-color/Search Focus에 건다([[디자인 기반:모션 견본]]).
// 같은 자산(견본 크기 64x64)에 클래스를 건다. 실행 중 값은 없다(견본 주석에 `@runtime`이 없다).
const meta = {
  title: 'Motion/motion-search-box-focus',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-search-box-focus">
      {(motionClassName) => <SampleSearchIcon motionClassName={motionClassName} />}
    </MotionPreview>
  ),
};
