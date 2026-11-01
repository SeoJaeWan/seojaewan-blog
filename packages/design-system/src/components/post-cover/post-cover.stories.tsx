import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { ImageAsset } from '../image-asset/image-asset';
import { PostCover } from './post-cover';

// 표지 이미지 자산이다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const coverImage = new URL('../../assets/images/wallpaper-bloom.webp', import.meta.url).href;

const meta = {
  title: 'Components/PostCover',
  // 이미지는 글마다 달라 필수 prop이므로, Parity 스토리가 피그마 기본 인스턴스(wallpaper/Bloom)를 넣는다.
  // 너비는 쓰는 곳이 정하므로 피그마 원본 너비 720으로 감싼다.
  render: () => (
    <div className="w-720">
      <PostCover image={<ImageAsset name="images/wallpaper-bloom" />} />
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형은 하나뿐이다(`default`).
export const Parity: Story = {};

// @codocs [[Notion 블록:모양]]
/** image 자리에 넘긴 이미지를 그린다 */
export const Default: Story = {
  render: () => (
    <div className="w-720">
      <PostCover image={<img alt="표지" src={coverImage} />} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByAltText('표지')).toBeInTheDocument();
  },
};
