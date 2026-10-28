import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '@seojaewan/design-system';

import { PostBlocks } from './post-blocks';
import { expandedToggleIndexes, sampleBlocks } from './story-data';

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 변형이 없는 조립이라 args가 없다.
// 본문은 크기를 갖지 않고 글 화면이 정하므로 피그마 원본 너비(size/720)와 페이지 바탕으로 감싼다.
// 이미지는 피그마처럼 배경화면 Bloom을 이미지 칸 높이 420(크기 토큰에 없는 값)으로, 수식은 근의 공식 그림(200×56)으로 넣는다.
const meta = {
  title: 'Patterns/Chrome/PostBlocks',
  render: () => (
    <div className="w-720 bg-chrome-page-fill">
      <PostBlocks
        blocks={sampleBlocks}
        expandedToggleIndexes={expandedToggleIndexes}
        renderImage={() => <ImageAsset name="images/wallpaper-bloom" style={{ height: 420 }} />}
        renderEquation={() => (
          <ImageAsset
            name="images/equation-quadratic-formula"
            alt="x = (-b ± √(b² - 4ac)) / 2a"
            className="h-56 w-200"
          />
        )}
      />
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
