import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import tileGridExport from '../../../figma/components/tile-grid/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { Asset } from '../asset/asset';
import { ImageAsset } from '../image-asset/image-asset';
import { PinnedTile } from '../pinned-tile/pinned-tile';
import { TileGrid, type TileGridAlign } from './tile-grid';

// 피그마 TileGrid의 변형 속성 값이다(정규화한 이름).
const ALIGNS = ['start', 'center'] as const;

const folderIcon = <ImageAsset name="images/file-folder" />;
const documentIcon = <ImageAsset name="images/file-document" />;
const linkIcon = <Asset name="illustrations/file-link.svg" />;

// 피그마 `tiles` 슬롯의 기본 내용이다. 변형마다 기본 내용이 달라 변형별로 둔다.
const defaultTiles: Record<TileGridAlign, { label: string; icon: ReactNode }[]> = {
  start: [
    {
      label: 'File Explorer',
      icon: <ImageAsset name="images/app-file-explorer" />,
    },
    {
      label: 'Chrome',
      icon: <ImageAsset name="images/app-chrome" />,
    },
    { label: 'Blog', icon: folderIcon },
    { label: 'GitHub', icon: linkIcon },
    { label: '이력서', icon: linkIcon },
    { label: '사이드 프로젝트', icon: linkIcon },
    { label: 'React', icon: folderIcon },
    { label: 'React 19 훅 정리', icon: documentIcon },
  ],
  center: [
    { label: 'React 19 훅 정리', icon: documentIcon },
    { label: '리액트 서버 컴포넌트', icon: documentIcon },
    { label: 'Next.js 캐시', icon: documentIcon },
    { label: 'TypeScript 5.6', icon: documentIcon },
    { label: 'Vitest 테스트', icon: documentIcon },
    { label: 'Figma 일치 검사', icon: documentIcon },
  ],
};

const meta = {
  title: 'Components/TileGrid',
  args: { align: 'start' },
  argTypes: {
    align: { control: 'inline-radio', options: ALIGNS },
  },
  // 너비는 FigmaFrame이 피그마 원본 너비(새 탭 최신 글 자리의 크기 토큰)로 감싼다.
  decorators: [figmaFrame(tileGridExport)],
  render: (args) => (
    <TileGrid align={args.align}>
      {defaultTiles[args.align].map((tile) => (
        <PinnedTile key={tile.label} label={tile.label} icon={tile.icon} />
      ))}
    </TileGrid>
  ),
} satisfies Meta<{ align: TileGridAlign }>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고르고, `tiles` 슬롯에 피그마 기본 내용과 같은 PinnedTile을 넣는다.
export const Figma: Story = {};
