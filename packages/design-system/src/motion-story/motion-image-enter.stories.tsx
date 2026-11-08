import type { Meta, StoryObj } from '@storybook/react-vite';

import figureExport from '../../figma/components/figure/export.json';
import { Figure } from '../components/figure/figure';
import { ImageAsset } from '../components/image-asset/image-asset';
import { FigmaFrame } from '../story/figma-frame';
import { MotionPreview } from './motion-preview';

// @codocs [[피그마 연동:모션]]
// 견본 motion-image-enter는 이미지 자산 wallpaper/Bloom에 키프레임(투명도 0 → 1)을 건다.
// 이미지는 다 받았을 때 붙는 움직임이라 컴포넌트에는 붙이지 않고, 쓰는 모습대로 Figure(State=Loaded, 견본 크기 720) 안의 이미지에 건다.
// 실행 중 값은 없다(견본 주석에 `@runtime`이 없다).
const meta = {
  title: 'Motion/motion-image-enter',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-image-enter">
      {(motionClassName) => (
        <FigmaFrame source={figureExport} args={{ state: 'loaded' }}>
          <Figure
            image={<ImageAsset name="images/wallpaper-bloom" className={motionClassName} />}
          />
        </FigmaFrame>
      )}
    </MotionPreview>
  ),
};
