import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { SnapLayoutOption } from './snap-layout-option';

// 피그마 SnapLayoutOption의 변형 속성 값이다(정규화한 이름).
const LAYOUTS = ['half', 'twothirds', 'halfquarter', 'quad'] as const;

type FigmaArgs = {
  layout: (typeof LAYOUTS)[number];
};

const meta = {
  title: 'Components/SnapLayoutOption',
  parameters: { layout: 'padded' },
  args: { layout: 'half' },
  argTypes: {
    layout: { control: 'inline-radio', options: LAYOUTS },
  },
  render: (args) => <SnapLayoutOption layout={args.layout} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

type SelectZoneArgs = { onSelectZone: (index: number) => void };
type SelectZoneStory = StoryObj<SelectZoneArgs>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 칸을 누르면 칸 번호로 onSelectZone을 부른다. 칸 묶음은 레이아웃 이름을 가진 group이다 */
export const Default: SelectZoneStory = {
  args: { onSelectZone: fn() },
  render: (args) => {
    const { onSelectZone: handleSelectZone } = args;
    return <SnapLayoutOption layout="halfquarter" onSelectZone={handleSelectZone} />;
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('칸 묶음은 레이아웃 이름을 가진 group이다', async () => {
      await expect(canvas.getByRole('group', { name: '절반과 4분의 1 두 칸' })).toBeInTheDocument();
    });

    await step('칸을 누르면 칸 번호로 onSelectZone을 부른다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '오른쪽 아래 4분의 1' }));
      await userEvent.click(canvas.getByRole('button', { name: '왼쪽 절반' }));
      await expect(args.onSelectZone).toHaveBeenCalledTimes(2);
      await expect(args.onSelectZone).toHaveBeenNthCalledWith(1, 2);
      await expect(args.onSelectZone).toHaveBeenNthCalledWith(2, 0);
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 네 가지 레이아웃의 칸은 칸 번호 순서로 접근성 이름을 갖는다. layout을 주지 않으면 half다 */
export const Layouts: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <SnapLayoutOption />
      <SnapLayoutOption layout="twothirds" />
      <SnapLayoutOption layout="halfquarter" />
      <SnapLayoutOption layout="quad" />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const cases = [
      ['반반', ['왼쪽 절반', '오른쪽 절반']],
      ['3분의 2와 3분의 1', ['왼쪽 3분의 2', '오른쪽 3분의 1']],
      ['절반과 4분의 1 두 칸', ['왼쪽 절반', '오른쪽 위 4분의 1', '오른쪽 아래 4분의 1']],
      [
        '4분할',
        ['왼쪽 위 4분의 1', '왼쪽 아래 4분의 1', '오른쪽 위 4분의 1', '오른쪽 아래 4분의 1'],
      ],
    ] as const;

    for (const [groupName, zoneNames] of cases) {
      await step(
        `${groupName}의 칸 ${zoneNames.length}개가 칸 번호 순서로 이름을 갖는다`,
        async () => {
          const names = within(canvas.getByRole('group', { name: groupName }))
            .getAllByRole('button')
            .map((button) => button.getAttribute('aria-label'));
          await expect(names).toEqual(zoneNames);
        },
      );
    }
  },
};
