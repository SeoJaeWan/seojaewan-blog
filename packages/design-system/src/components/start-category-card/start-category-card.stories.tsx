import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import startCategoryCardExport from '../../../figma/components/start-category-card/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { Asset } from '../asset/asset';
import { ImageAsset } from '../image-asset/image-asset';
import { StartCategoryCard } from './start-category-card';

// 피그마 StartCategoryCard의 변형 속성 값이다(정규화한 이름).
const ITEMS = ['full', '3', '2', '1'] as const;
const STATES = ['rest', 'hover'] as const;
const DEVICES = ['desktop', 'mobile'] as const;

type FigmaArgs = {
  items: (typeof ITEMS)[number];
  state: (typeof STATES)[number];
  device: (typeof DEVICES)[number];
};

// 피그마 Icon 1·2·3의 기본 인스턴스(app/File Explorer)다. 아이콘은 항목마다 달라 필수 prop이므로 스토리가 넣는다.
const explorerIcon = <ImageAsset name="images/app-file-explorer" alt="" />;

// 피그마 Group 슬롯 기본 내용(작은 아이콘 4개)이다.
const groupIcons = (
  <>
    <ImageAsset name="images/app-chrome" alt="" />
    <ImageAsset name="images/app-file-explorer" alt="" />
    <ImageAsset name="images/file-document" alt="" />
    <Asset name="illustrations/file-link.svg" />
  </>
);

const meta = {
  title: 'Components/StartCategoryCard',
  args: { items: 'full', state: 'rest', device: 'desktop' },
  argTypes: {
    items: { control: 'inline-radio', options: ITEMS },
    state: { control: 'inline-radio', options: STATES },
    device: { control: 'inline-radio', options: DEVICES },
  },
  // 너비는 쓰는 곳이 정하므로 FigmaFrame이 export.json 견본 너비(sampleSize width)로 감싼다.
  decorators: [figmaFrame(startCategoryCardExport)],
  render: (args) => (
    <StartCategoryCard
      items={args.items}
      device={args.device}
      icon1={explorerIcon}
      icon2={explorerIcon}
      icon3={explorerIcon}
      group={groupIcons}
    />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(Items, State, Device)를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[Start 메뉴:모두]]
/** 항목이 3개 이하면 그 수만큼 큰 아이콘을 앞에서부터 놓고 묶음은 두지 않는다 */
export const TwoItems: Story = {
  render: () => (
    <StartCategoryCard
      items="2"
      label="외부 링크"
      icon1={<ImageAsset name="images/app-chrome" alt="Chrome" />}
      icon2={<ImageAsset name="images/file-document" alt="문서" />}
      icon3={<ImageAsset name="images/app-file-explorer" alt="탐색기" />}
      group={<ImageAsset name="images/app-file-explorer" alt="묶음" />}
    />
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('앞의 두 아이콘만 그린다', async () => {
      await expect(canvas.getByRole('img', { name: 'Chrome' })).toBeInTheDocument();
      await expect(canvas.getByRole('img', { name: '문서' })).toBeInTheDocument();
      await expect(canvas.queryByRole('img', { name: '탐색기' })).not.toBeInTheDocument();
      await expect(canvas.queryByRole('img', { name: '묶음' })).not.toBeInTheDocument();
    });
    await step('카드 아래에 범주 이름을 쓴다', async () => {
      await expect(canvas.getByText('외부 링크')).toBeInTheDocument();
    });
  },
};
