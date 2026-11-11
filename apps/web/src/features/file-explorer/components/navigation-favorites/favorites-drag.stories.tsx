import favoritesDragExport from '@figma/patterns/explorer/favorites-drag/export.json';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { figmaFrame } from '@seojaewan/design-system/story';

import { FAVORITE_LABELS } from './story-data';
import { StoryFavoritesDrag } from './story-favorites-drag';

// 피그마 Explorer/FavoritesDrag의 변형 속성 값이다(정규화한 이름).
const DROPS = ['allowed', 'not-allowed'] as const;

type FigmaArgs = {
  drop: (typeof DROPS)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 탐색 창 즐겨찾기로 항목을 끄는 순간의 모습이다(그리는 방법은 StoryFavoritesDrag).
const meta = {
  title: 'Patterns/Explorer/FavoritesDrag',
  args: { drop: 'allowed' },
  argTypes: { drop: { control: 'inline-radio', options: DROPS } },
  decorators: [figmaFrame(favoritesDragExport)],
  render: (args) => <StoryFavoritesDrag drop={args.drop} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

// @codocs [[파일 탐색기:탐색 창]]
/** 즐겨찾기 칸은 트리 앞에 고정한 차례로 있고, 놓을 수 있는 폴더면 놓을 자리에 가로선을 그린다 */
export const DropLine: Story = {
  play: async ({ canvasElement }) => {
    const tree = within(canvasElement).getByRole('tree');
    await expect(tree.querySelectorAll('[data-favorites-drop-line]')).toHaveLength(1);
    await expect(
      within(tree)
        .getAllByRole('treeitem')
        .slice(0, FAVORITE_LABELS.length)
        .map((item) => item.textContent),
    ).toEqual([...FAVORITE_LABELS]);
  },
};
