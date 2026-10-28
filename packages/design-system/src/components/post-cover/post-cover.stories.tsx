import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '../image-asset/image-asset';
import { PostCover } from './post-cover';

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
