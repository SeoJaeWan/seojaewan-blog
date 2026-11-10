import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Asset } from '../asset/asset';
import { ImageAsset } from '../image-asset/image-asset';
import { PinnedTile } from '../pinned-tile/pinned-tile';
import { StartCategoryFolder } from './start-category-folder';

// 피그마 StartCategoryFolder의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

type FigmaArgs = {
  device: (typeof DEVICES)[number];
};

const linkIcon = <Asset name="illustrations/file-link.svg" />;
const folderIcon = <ImageAsset name="images/file-folder" alt="" />;

// 피그마 Tiles 슬롯 기본 내용(PinnedTile 8개)이다.
const FIGMA_TILES = [
  { label: 'File Explorer', icon: <ImageAsset name="images/app-file-explorer" alt="" /> },
  { label: 'Chrome', icon: <ImageAsset name="images/app-chrome" alt="" /> },
  { label: 'Blog', icon: folderIcon },
  { label: 'GitHub', icon: linkIcon },
  { label: '이력서', icon: linkIcon },
  { label: '사이드 프로젝트', icon: linkIcon },
  { label: 'React', icon: folderIcon },
  { label: 'React 19 훅 정리', icon: <ImageAsset name="images/file-document" alt="" /> },
] as const;

// 크기는 Device마다 고정이라 FigmaFrame으로 감싸지 않는다.
const meta = {
  title: 'Components/StartCategoryFolder',
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) => (
    <StartCategoryFolder device={args.device}>
      {FIGMA_TILES.map((tile) => (
        <PinnedTile key={tile.label} label={tile.label} icon={tile.icon} />
      ))}
    </StartCategoryFolder>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
export const Figma: Story = {};

// @codocs [[Start 메뉴:모두]]
/** 범주 이름을 쓰고, 항목이 넘치면 스크롤바 없이 격자 영역 경계에서 자르며 쪽 표시 점을 보인다 */
export const Overflow: Story = {
  render: (args) => (
    <StartCategoryFolder device={args.device} label="글" hasPages pageCount={2}>
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
    await step('항목이 넘치면 스크롤바 없이 격자 영역 경계에서 자른다', async () => {
      const clip = canvas.getByRole('button', { name: '항목 1' }).closest('.overflow-clip');
      await expect(clip).not.toBeNull();
      await expect(clip?.scrollHeight).toBeGreaterThan(clip?.clientHeight ?? 0);
      await expect(canvasElement.querySelector('.overflow-y-auto')).toBeNull();
    });
  },
};
