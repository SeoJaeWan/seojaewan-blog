import type { Meta, StoryObj } from '@storybook/react-vite';

import figureExport from '../../figma/components/figure/export.json';
import { Figure } from '../components/figure/figure';
import { ImageAsset } from '../components/image-asset/image-asset';
import { FigmaFrame } from '../story/figma-frame';
import { MotionPreview } from './motion-preview';

// @codocs [[피그마 연동:모션]]
// 견본 motion-image-skeleton에는 Figure(State=Loading) 인스턴스를 놓고 안의 shimmer 레이어에 키프레임(이동 0 → 1440)을 건다.
// 컴포넌트가 이미 반짝임 레이어에 클래스를 붙이므로 같은 컴포넌트를 그린다. 너비는 견본 크기(720)를 FigmaFrame이
// export.json에서 읽어 준다. 실행 중 값은 없다(견본 주석에 `@runtime`이 없다).
const meta = {
  title: 'Motion/motion-image-skeleton',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MotionPreview motionClass="motion-image-skeleton">
      {() => (
        <FigmaFrame source={figureExport} args={{ state: 'loading' }}>
          <Figure state="loading" image={<ImageAsset name="images/wallpaper-bloom" />} />
        </FigmaFrame>
      )}
    </MotionPreview>
  ),
};
