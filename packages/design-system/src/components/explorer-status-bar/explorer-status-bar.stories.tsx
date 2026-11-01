import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ExplorerStatusBar } from './explorer-status-bar';

// 피그마 ExplorerStatusBar의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

// 컴포넌트는 너비를 갖지 않고 쓰는 곳이 정한다. 피그마 원본의 미리보기 너비를 기기별로 감싼다.
const previewWidthClassNames = {
  desktop: 'w-798',
  mobile: 'w-388',
} as const satisfies Record<(typeof DEVICES)[number], string>;

type FigmaArgs = {
  device: (typeof DEVICES)[number];
  /** 동작 스토리가 쓴다. 주지 않으면 피그마 기본 글자다 */
  itemCount?: string;
  selection?: string;
  showSelection?: boolean;
  onDetailsView?: ComponentProps<typeof ExplorerStatusBar>['onDetailsView'];
  onLargeIconsView?: ComponentProps<typeof ExplorerStatusBar>['onLargeIconsView'];
};

const meta = {
  title: 'Components/ExplorerStatusBar',
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) => {
    const { onDetailsView: handleDetailsView, onLargeIconsView: handleLargeIconsView } = args;
    return (
      // 캡처 대상은 감싼 요소(#storybook-root의 첫 요소)다. 컴포넌트와 같은 크기라 찍히는 범위가 같다.
      <div className={previewWidthClassNames[args.device]}>
        <ExplorerStatusBar
          device={args.device}
          itemCount={args.itemCount}
          selection={args.selection}
          showSelection={args.showSelection}
          onDetailsView={handleDetailsView}
          onLargeIconsView={handleLargeIconsView}
        />
      </div>
    );
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
export const Default: Story = {
  args: {
    itemCount: '3개 항목',
    selection: '1개 선택',
    onDetailsView: fn(),
    onLargeIconsView: fn(),
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('항목 수와 선택 정보를 글자로 보인다', async () => {
      await expect(canvas.getByText('3개 항목')).toBeInTheDocument();
      await expect(canvas.getByText('1개 선택')).toBeInTheDocument();
    });

    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('desktop은 보기 전환 버튼을 그리고 누르면 콜백을 부른다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '자세히' }));
      await userEvent.click(canvas.getByRole('button', { name: '큰 아이콘' }));
      await expect(args.onDetailsView).toHaveBeenCalledTimes(1);
      await expect(args.onLargeIconsView).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
export const WithoutSelection: Story = {
  args: { selection: '1개 선택', showSelection: false },
  play: async ({ canvasElement, step }) => {
    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('showSelection이 false면 선택 정보를 그리지 않는다', async () => {
      await expect(within(canvasElement).queryByText('1개 선택')).not.toBeInTheDocument();
    });
  },
};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
export const Mobile: Story = {
  args: { device: 'mobile' },
  play: async ({ canvasElement, step }) => {
    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('mobile은 보기 전환 버튼을 그리지 않는다', async () => {
      await expect(within(canvasElement).queryByRole('button')).not.toBeInTheDocument();
    });
  },
};
