import { Tabs } from '@base-ui/react/tabs';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BrowserTab } from '../browser-tab/browser-tab';
import { ImageAsset } from '../image-asset/image-asset';
import { BrowserTabStrip } from './browser-tab-strip';

type StoryArgs = {
  onNewTab?: () => void;
};

const meta = {
  title: 'Components/BrowserTabStrip',
  // 변형 속성이 없다. Tabs 슬롯에는 피그마 기본 내용(선택된 BrowserTab 하나)을 넣는다.
  // 탭은 tablist 안에서만 쓰므로 Base UI 탭 줄로 감싼다. 피그마 기본 내용은 탭 하나라 탭 줄(Tabs.Root·Tabs.List)이
  // 탭 하나 크기로 그려진다. 탭 여럿을 가로로 늘어놓고 넘치면 스크롤하는 배치는 앱의 탭 줄이 정한다.
  render: (args) => {
    const { onNewTab: handleNewTab } = args;
    return (
      <BrowserTabStrip onNewTab={handleNewTab}>
        <Tabs.Root value={0}>
          <Tabs.List aria-label="탭">
            <BrowserTab
              value={0}
              active
              title="React 19 훅 정리"
              favicon={<ImageAsset name="images/file-document" />}
            />
          </Tabs.List>
        </Tabs.Root>
      </BrowserTabStrip>
    );
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(default)를 그린다.
export const Figma: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Default: Story = {
  args: { onNewTab: fn() },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('새 탭 버튼을 누르면 onNewTab을 부른다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '새 탭' }));
      await expect(args.onNewTab).toHaveBeenCalledTimes(1);
    });
  },
};
