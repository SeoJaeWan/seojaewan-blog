import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import layerSurfaceExport from '../../../figma/components/layer-surface/export.json';
import { FigmaFrame, figmaFrame } from '../../story/figma-frame';
import { ImageAsset } from '../image-asset/image-asset';
import { NavigationItem } from '../navigation-item/navigation-item';
import { LayerSurface } from './layer-surface';

const meta = {
  title: 'Components/LayerSurface',
  // 크기는 쓰는 곳이 정하므로 FigmaFrame이 피그마 원본 크기(@sample-size width height)로 감싼다
  // ([[디자인 시스템:컴포넌트 조립 규칙]]). 동작 스토리도 같은 크기로 감싼다.
  decorators: [figmaFrame(layerSurfaceExport)],
  // Content 슬롯에는 피그마 기본 내용(NavigationItem)을 넣는다. 항목 크기는 쓰는 곳이 정하므로 FigmaFrame이 슬롯 안
  // NavigationItem 노드의 크기로 감싼다. treeitem은 tree 안에서만 쓰므로 바탕에 tree 역할을 준다.
  render: () => (
    <LayerSurface role="tree" aria-label="탐색 창">
      <FigmaFrame source={layerSurfaceExport} node={['Content', 'NavigationItem']}>
        <NavigationItem icon={<ImageAsset name="images/file-folder" />} />
      </FigmaFrame>
    </LayerSurface>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(default)를 그린다.
export const Figma: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 역할과 접근성 이름 같은 div 속성을 넘겨 쓰고, 내용은 children 자리(피그마 Content 슬롯)에 그린다 */
export const Default: Story = {
  render: () => (
    <LayerSurface role="region" aria-label="본문">
      <p>본문 내용</p>
    </LayerSurface>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('역할과 접근성 이름 같은 div 속성을 그대로 넘긴다', async () => {
      await expect(canvas.getByRole('region', { name: '본문' })).toBeInTheDocument();
    });

    await step('내용을 children 자리(피그마 Content 슬롯)에 그린다', async () => {
      await expect(
        within(canvas.getByRole('region', { name: '본문' })).getByText('본문 내용'),
      ).toBeInTheDocument();
    });
  },
};
