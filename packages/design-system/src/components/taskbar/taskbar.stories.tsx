import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import taskbarExport from '../../../figma/components/taskbar/export.json';
import { FigmaFrame, figmaFrame } from '../../story/figma-frame';
import { Asset } from '../asset/asset';
import { ImageAsset } from '../image-asset/image-asset';
import { SearchBox } from '../search-box/search-box';
import { SystemTray } from '../system-tray/system-tray';
import { TaskbarButton } from '../taskbar-button/taskbar-button';
import { Taskbar } from './taskbar';

const meta = {
  title: 'Components/Taskbar',
  // 미리보기 너비(1280)에 기본 여백을 두면 오른쪽 끝이 화면 밖으로 잘린다.
  parameters: { layout: 'fullscreen' },
  // 크기는 FigmaFrame이 피그마 원본 크기(size/taskbar/width × height)로 감싼다.
  decorators: [figmaFrame(taskbarExport)],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 Taskbar는 변형이 하나다. 슬롯에는 피그마 슬롯 기본 내용과 같은 컴포넌트를 넣는다.
// 검색칸(고정 너비)과 시스템 트레이(고정 높이)는 슬롯 안 노드의 크기로 감싼다.
export const Figma: Story = {
  render: () => (
    <Taskbar
      center={
        <>
          <TaskbarButton label="시작" icon={<Asset name="illustrations/logo-windows.svg" />} />
          <FigmaFrame source={taskbarExport} node="Center/검색">
            <SearchBox variant="taskbar" placeholder="검색" aria-label="검색" />
          </FigmaFrame>
          <TaskbarButton
            label="파일 탐색기"
            icon={<ImageAsset name="images/app-file-explorer" />}
          />
          <TaskbarButton label="Chrome" icon={<ImageAsset name="images/app-chrome" />} />
        </>
      }
      right={
        <FigmaFrame source={taskbarExport} node="Right/SystemTray">
          <SystemTray time="오후 3:24" date="2026-10-20" />
        </FigmaFrame>
      }
    />
  ),
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** center와 right 자리에 넣은 내용을 그린다 */
export const Default: Story = {
  render: () => (
    <Taskbar
      center={<button type="button">시작</button>}
      right={<button type="button">시계</button>}
    />
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('center와 right 자리에 넣은 내용을 그린다', async () => {
      await expect(canvas.getByRole('button', { name: '시작' })).toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: '시계' })).toBeInTheDocument();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 슬롯을 채우지 않으면 안쪽 부품을 그리지 않는다 */
export const Empty: Story = {
  render: () => <Taskbar />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('안쪽 부품을 그리지 않는다', async () => {
      await expect(canvas.queryByRole('button')).toBeNull();
      await expect(canvas.queryByRole('searchbox')).toBeNull();
    });
  },
};
