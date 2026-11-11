import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import taskbarPreviewListExport from '../../../figma/components/taskbar-preview-list/export.json';
import { FigmaFrame, figmaFrame } from '../../story/figma-frame';
import { WindowPreview } from '../window-preview/window-preview';
import { TaskbarPreviewList } from './taskbar-preview-list';

// 피그마 TaskbarPreviewList의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

type FigmaArgs = {
  device: (typeof DEVICES)[number];
};

// 피그마 WindowPreview의 App icon 기본 인스턴스(app/File Explorer)다. 앱 아이콘 이미지 자산이다.
const appIcon = new URL('../../assets/images/app-file-explorer.webp', import.meta.url).href;

const meta = {
  title: 'Components/TaskbarPreviewList',
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<FigmaArgs>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Previews 슬롯에는 피그마 슬롯 기본 내용과 같은 WindowPreview 둘을 넣는다
// (Desktop은 Default 카드, Mobile은 Title 줄). WindowPreview의 thumbnail 슬롯은 피그마에서 비어 있어 넣지 않는다.
// Mobile은 너비를 갖지 않고 쓰는 곳이 정하므로, FigmaFrame이 피그마 원본 크기로 감싼다.
export const Figma: Story = {
  decorators: [figmaFrame(taskbarPreviewListExport)],
  render: (args) => (
    <TaskbarPreviewList device={args.device}>
      {[0, 1].map((index) =>
        args.device === 'mobile' ? (
          <WindowPreview key={index} variant="title" appIcon={<img src={appIcon} alt="" />} />
        ) : (
          <WindowPreview key={index} appIcon={<img src={appIcon} alt="" />} />
        ),
      )}
    </TaskbarPreviewList>
  ),
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 미리보기를 children 자리에 그리고, 역할과 접근성 이름 같은 div 속성을 넘긴다 */
export const Default: Story = {
  render: () => (
    <TaskbarPreviewList role="list" aria-label="창 미리보기 목록">
      <div role="listitem">창 미리보기</div>
    </TaskbarPreviewList>
  ),
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** Mobile은 제목 줄을 세로로 쌓고, 줄이 판 너비를 채운다 */
export const Mobile: Story = {
  render: () => (
    <FigmaFrame source={taskbarPreviewListExport} args={{ device: 'mobile' }}>
      <TaskbarPreviewList device="mobile" data-testid="list">
        <WindowPreview
          variant="title"
          data-testid="first"
          appIcon={<span>앱</span>}
          title="첫 창"
        />
        <WindowPreview
          variant="title"
          data-testid="second"
          appIcon={<span>앱</span>}
          title="둘째 창"
        />
      </TaskbarPreviewList>
    </FigmaFrame>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByTestId('list').getBoundingClientRect();
    const first = canvas.getByTestId('first').getBoundingClientRect();
    const second = canvas.getByTestId('second').getBoundingClientRect();

    await step('줄을 세로로 쌓는다', async () => {
      await expect(second.top).toBe(first.bottom);
      await expect(second.left).toBe(first.left);
    });

    await step('줄이 판 안쪽 너비(테두리 안)를 채운다', async () => {
      await expect(first.left - list.left).toBe(list.right - first.right);
      await expect(first.width).toBe(list.width - (first.left - list.left) * 2);
      await expect(first.width).toBeGreaterThan(list.width - 4);
    });
  },
};
