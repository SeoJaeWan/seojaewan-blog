import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import unsupportedBlockExport from '../../../figma/components/unsupported-block/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { UnsupportedBlock } from './unsupported-block';

const meta = {
  title: 'Components/UnsupportedBlock',
  // 너비는 쓰는 곳이 정하므로 FigmaFrame이 export.json의 견본 너비로 감싼다.
  decorators: [figmaFrame(unsupportedBlockExport)],
  render: () => <UnsupportedBlock />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트라 args 없이 하나를 그린다.
export const Figma: Story = {};

// @codocs [[Notion 블록:지원하지 않는 블록]]
/** 유형 이름을 안내 글에 넣는다 */
export const Default: Story = {
  render: () => <UnsupportedBlock typeName="synced_block" />,
  play: async ({ canvasElement, step }) => {
    await step('유형 이름을 안내 글에 넣는다', async () => {
      await expect(
        within(canvasElement).getByText('지원하지 않는 블록(synced_block)'),
      ).toBeInTheDocument();
    });
  },
};

// @codocs [[Notion 블록:지원하지 않는 블록]]
/** 유형 이름이 없으면 자리 설명 글을 보여 준다 */
export const WithoutTypeName: Story = {
  render: () => <UnsupportedBlock />,
  play: async ({ canvasElement, step }) => {
    await step('자리 설명 글을 보여 준다', async () => {
      await expect(
        within(canvasElement).getByText('지원하지 않는 블록(유형 이름)'),
      ).toBeInTheDocument();
    });
  },
};
