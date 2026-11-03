import sceneExport from '@figma/patterns/desktop/scene/export.json';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { figmaFrame } from '@seojaewan/design-system/story';

import { DesktopIcons } from '@/features/desktop/components/desktop-icons/desktop-icons';
import { TaskbarAppButton } from '@/features/taskbar/components/taskbar-apps-layer/components/app-item/components/taskbar-app/taskbar-app';
import { TASKBAR_CLOCK } from '@/features/taskbar/components/taskbar-default/story-data';
import { TaskbarDefault } from '@/features/taskbar/components/taskbar-default/taskbar-default';

import { DesktopScene } from './desktop-scene';
import { SCENE_ICONS } from './story-data';

// 피그마 Desktop/Scene의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

// 피그마 조립의 Taskbar/Default 변형이다. 좁은 화면은 검색 입력칸 대신 검색 버튼을 둔다.
const TASKBAR_SEARCHES = { desktop: 'box', mobile: 'button' } as const;

type FigmaArgs = {
  device: (typeof DEVICES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 조립처럼 창 자리는 비우고, 작업 표시줄에 고정 앱(File Explorer, Chrome) 버튼을 표시 없이 둔다.
// 화면 크기는 쓰는 곳이 정하므로 FigmaFrame이 피그마 원본 크기(size/screen/*)로 감싼다.
// 화면 너비(1920)가 캡처 화면 너비보다 넓어, 여백 없이(fullscreen) 그린다.
const meta = {
  title: 'Patterns/Desktop/Scene',
  parameters: { layout: 'fullscreen' },
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  decorators: [figmaFrame(sceneExport)],
  render: (args) => (
    <DesktopScene
      icons={<DesktopIcons icons={SCENE_ICONS} />}
      taskbar={
        <TaskbarDefault
          search={TASKBAR_SEARCHES[args.device]}
          time={TASKBAR_CLOCK.time}
          date={TASKBAR_CLOCK.date}
          apps={
            <>
              <TaskbarAppButton app="file-explorer" />
              <TaskbarAppButton app="chrome" />
            </>
          }
        />
      }
    />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

// @codocs [[바탕화면:배경화면]]
/** 배경화면은 `next/image`로 그려지고 불러와진다 */
export const Wallpaper: Story = {
  play: async ({ canvasElement, step }) => {
    await step('배경화면 이미지를 next/image로 그려 불러온다', async () => {
      const wallpaper = canvasElement.querySelector('img[data-nimg]');
      await expect(wallpaper).not.toBeNull();
      await waitFor(() =>
        expect(
          wallpaper instanceof HTMLImageElement && wallpaper.complete && wallpaper.naturalWidth > 0,
        ).toBe(true),
      );
    });
  },
};
