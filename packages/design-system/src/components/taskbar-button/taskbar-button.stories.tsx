import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { TaskbarButton } from './taskbar-button';

// 피그마 icon 속성의 기본 인스턴스(파일 탐색기 앱 아이콘)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const appIcon = new URL('../../assets/images/app-file-explorer.webp', import.meta.url).href;

// 피그마 TaskbarButton의 변형 속성 값이다(정규화한 이름). Hover·Pressed는 캡처 도구가 마우스로 재현한다.
const INDICATORS = ['none', 'running', 'active'] as const;
const STATES = ['rest', 'hover', 'pressed'] as const;

type FigmaArgs = {
  indicator: (typeof INDICATORS)[number];
  state: (typeof STATES)[number];
};

const meta = {
  title: 'Components/TaskbarButton',
  args: { indicator: 'none', state: 'rest' },
  argTypes: {
    indicator: { control: 'inline-radio', options: INDICATORS },
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    <TaskbarButton
      indicator={args.indicator}
      label="앱 이름"
      icon={<img src={appIcon} alt="" className="size-full object-contain" />}
    />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed는 캡처 도구가 마우스로 재현한다.
export const Figma: Story = {};

type ClickArgs = { onClick: () => void };
type ClickStory = StoryObj<ClickArgs>;

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
// @codocs [[디자인 시스템:아이콘 자리]]
/** label을 접근성 이름으로 갖는 버튼이고, 누르면 onClick을 부르며, icon으로 받은 아이콘을 그린다 */
export const Default: ClickStory = {
  args: { onClick: fn() },
  render: (args) => {
    const { onClick: handleClick } = args;
    return (
      <TaskbarButton
        label="파일 탐색기"
        icon={<svg data-testid="custom-icon" aria-hidden="true" />}
        onClick={handleClick}
      />
    );
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('label을 접근성 이름으로 갖는 버튼이다', async () => {
      await expect(canvas.getByRole('button', { name: '파일 탐색기' })).toBeInTheDocument();
    });

    await step('icon으로 받은 아이콘을 그린다', async () => {
      await expect(canvas.getByTestId('custom-icon')).toBeInTheDocument();
    });

    await step('누르면 onClick을 부른다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '파일 탐색기' }));
      await expect(args.onClick).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
/** indicator에 따라 표시줄 상태가 바뀐다. 기본은 표시줄이 없다 */
export const Indicators: Story = {
  render: () => (
    <div className="flex gap-8">
      <TaskbarButton label="표시줄 없음" icon={<svg aria-hidden="true" />} />
      <TaskbarButton label="실행 중" icon={<svg aria-hidden="true" />} indicator="running" />
      <TaskbarButton label="활성" icon={<svg aria-hidden="true" />} indicator="active" />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('indicator가 none이면 표시줄이 없다', async () => {
      await expect(canvas.getByRole('button', { name: '표시줄 없음' })).toHaveAttribute(
        'data-indicator',
        'none',
      );
    });

    await step('running이면 실행 중 표시줄이다', async () => {
      await expect(canvas.getByRole('button', { name: '실행 중' })).toHaveAttribute(
        'data-indicator',
        'running',
      );
    });

    await step('active면 활성 표시줄이다', async () => {
      await expect(canvas.getByRole('button', { name: '활성' })).toHaveAttribute(
        'data-indicator',
        'active',
      );
    });
  },
};
