import categoryFolderExport from '@figma/patterns/start/category-folder/export.json';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { figmaFrame } from '@seojaewan/design-system/story';

import { START_CATEGORY_POSTS } from '@/features/start-menu/components/start-body/story-data';

import { StartCategoryPopup } from './start-category-popup';

// 피그마 Start/CategoryFolder의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

type FigmaArgs = {
  device: (typeof DEVICES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 조립처럼 글 범주를 연 팝업이다.
// 팝업 너비는 쓰는 곳(카드 자리)이 정하므로 FigmaFrame이 피그마 원본 크기로 감싼다.
const meta = {
  title: 'Patterns/Start/CategoryFolder',
  parameters: { layout: 'padded' },
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  decorators: [figmaFrame(categoryFolderExport)],
  render: (args) => (
    <StartCategoryPopup device={args.device} label="글" items={START_CATEGORY_POSTS} />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};
