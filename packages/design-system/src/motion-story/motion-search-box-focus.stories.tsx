import type { Meta, StoryObj } from '@storybook/react-vite';

import { Asset } from '../components/asset/asset';
import { MotionPreview } from './motion-preview';

// @codocs [[피그마 연동:모션]]
// 견본 motion-search-box-focus는 키프레임을 자산 원본 icon-color/Search Focus에 건다([[디자인 기반:모션 견본]]).
// 같은 자산에 클래스를 걸어 크게 그린다. 실행 중 값은 없다([[디자인 기반:모션]] 표).
const meta = {
  title: 'Motion/motion-search-box-focus',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-search-box-focus">
      {(motionClassName) => (
        <div className="p-16">
          <Asset
            name="illustrations/icon-color-search-focus.svg"
            className={`size-icon-48 ${motionClassName}`}
          />
        </div>
      )}
    </MotionPreview>
  ),
};
