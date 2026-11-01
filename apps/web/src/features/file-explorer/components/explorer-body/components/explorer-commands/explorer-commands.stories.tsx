import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { ExplorerCommands } from './explorer-commands';

// 피그마 Explorer/Commands의 변형 속성 값이다(정규화한 이름).
const LOCATIONS = ['folder', 'recycle-bin'] as const;
const DEVICES = ['desktop', 'mobile'] as const;

type FigmaArgs = {
  location: (typeof LOCATIONS)[number];
  device: (typeof DEVICES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 캡처 도구가 이 제목으로 피그마 조립과 짝짓는다.
const meta = {
  title: 'Patterns/Explorer/Commands',
  // 가운데 놓으면 너비에 따라 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
  parameters: { layout: 'padded' },
  args: { location: 'folder', device: 'desktop' },
  argTypes: {
    location: { control: 'inline-radio', options: LOCATIONS },
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) => <ExplorerCommands location={args.location} device={args.device} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Figma: Story = {};

// @codocs [[접근성:Tab]]
/** 명령 모음은 Tab 한 번에 닿고 안에서 ←/→로 옮기며 비활성 버튼은 건너뛴다 */
export const Keyboard: Story = {
  render: () => <ExplorerCommands location="folder" disabledCommands={['onCut']} />,
  play: async ({ canvasElement }) => {
    const toolbar = within(canvasElement).getByRole('toolbar', { name: '명령 모음' });
    const canvas = within(toolbar);
    const newButton = canvas.getByRole('button', { name: '새로 만들기' });
    await expect(canvas.getByRole('button', { name: '잘라내기' })).toBeDisabled();
    await expect(
      canvas.getAllByRole('button').filter((button) => button.tabIndex === 0),
    ).toHaveLength(1);
    newButton.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('button', { name: '붙여넣기' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(newButton).toHaveFocus();
  },
};
