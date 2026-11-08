import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import startCategoryFolderExport from '../../../figma/components/start-category-folder/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { ImageAsset } from '../image-asset/image-asset';
import { PinnedTile } from '../pinned-tile/pinned-tile';
import { StartCategoryFolder } from './start-category-folder';

// 피그마 기본 내용의 항목 8개다(PinnedTile, 앱 이름, app/File Explorer).
const TILE_KEYS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const meta = {
  title: 'Components/StartCategoryFolder',
  // 너비와 높이는 쓰는 곳이 정하므로 FigmaFrame이 export.json 견본 크기(@sample-size width height)로 감싼다.
  decorators: [figmaFrame(startCategoryFolderExport)],
  render: () => (
    <StartCategoryFolder>
      {TILE_KEYS.map((key) => (
        <PinnedTile key={key} icon={<ImageAsset name="images/app-file-explorer" alt="" />} />
      ))}
    </StartCategoryFolder>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형은 하나뿐이다. 안쪽 격자에 피그마 기본 내용(PinnedTile 8개)을 넣는다.
export const Figma: Story = {};

// @codocs [[Start 메뉴:모두]]
/** 범주 이름을 쓰고, 항목이 넘치면 팝업 안에서 스크롤한다 */
export const Overflow: Story = {
  render: () => (
    <StartCategoryFolder label="글">
      {Array.from({ length: 24 }, (_, index) => (
        <PinnedTile
          key={index}
          label={`항목 ${String(index + 1)}`}
          icon={<ImageAsset name="images/file-document" alt="" />}
        />
      ))}
    </StartCategoryFolder>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('범주 이름을 쓴다', async () => {
      await expect(canvas.getByText('글')).toBeInTheDocument();
    });
    await step('항목이 넘치면 격자를 스크롤한다', async () => {
      const grid = canvas.getByRole('button', { name: '항목 1' }).closest('.overflow-y-auto');
      await expect(grid).not.toBeNull();
      await expect(grid?.scrollHeight).toBeGreaterThan(grid?.clientHeight ?? 0);
    });
  },
};
