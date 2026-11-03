import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Toggle } from './toggle';

const meta = {
  title: 'Components/Toggle',
  argTypes: {
    state: { control: 'inline-radio', options: ['expanded', 'collapsed'] },
  },
  // 피그마 State 변형(Expanded/Collapsed)을 isExpanded로 옮긴다. 너비는 쓰는 곳이 정하므로 피그마 원본 너비 720으로 감싼다.
  // Content 슬롯에는 피그마 슬롯 기본 내용(글 본문 글자)을 넣는다. Collapsed는 내용을 그리지 않는다.
  render: ({ state }: { state: 'expanded' | 'collapsed' }) => (
    <div className="w-size-post-width">
      <Toggle isExpanded={state === 'expanded'}>
        <p className="type-body-large text-text-fill-primary">토글을 펼치면 보이는 글이다.</p>
      </Toggle>
    </div>
  ),
} satisfies Meta<{ state: 'expanded' | 'collapsed' }>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
export const Figma: Story = {
  args: { state: 'expanded' },
};

type PlainStory = StoryObj;
type ExpandedChangeArgs = { onExpandedChange: (isExpanded: boolean) => void };
type ExpandedChangeStory = StoryObj<ExpandedChangeArgs>;

// @codocs [[Notion 블록:모양]]
/** 기본은 접혀 있고 내용을 그리지 않는다. 제목 줄을 누르면 비제어로 펼치고 접는다 */
export const Default: PlainStory = {
  render: () => (
    <Toggle title="자세히">
      <p>본문</p>
    </Toggle>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('접혀 있고 내용을 그리지 않는다', async () => {
      await expect(canvas.getByRole('button', { name: '자세히' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      await expect(canvas.queryByText('본문')).not.toBeInTheDocument();
    });

    await step('제목 줄을 누르면 펼치고 내용과 연결한다', async () => {
      const button = canvas.getByRole('button', { name: '자세히' });
      await userEvent.click(button);
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      await expect(button).toHaveAttribute(
        'aria-controls',
        canvas.getByText('본문').parentElement?.id,
      );
    });

    await step('다시 누르면 접고 내용을 그리지 않는다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '자세히' }));
      await expect(canvas.queryByText('본문')).not.toBeInTheDocument();
    });
  },
};

// @codocs [[Notion 블록:모양]]
/** defaultExpanded로 펼친 채 시작한다 */
export const Open: PlainStory = {
  render: () => (
    <Toggle defaultExpanded>
      <p>본문</p>
    </Toggle>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('펼친 채 제목과 내용을 그린다', async () => {
      await expect(canvas.getByText('제목')).toBeInTheDocument();
      await expect(canvas.getByText('본문')).toBeInTheDocument();
    });
  },
};

// @codocs [[Notion 블록:모양]]
/** isExpanded를 주면 제어 모드라 누르기를 알리기만 한다 */
export const Controlled: ExpandedChangeStory = {
  args: { onExpandedChange: fn() },
  render: (args) => {
    const { onExpandedChange: handleExpandedChange } = args;
    return (
      <Toggle isExpanded={false} onExpandedChange={handleExpandedChange}>
        <p>본문</p>
      </Toggle>
    );
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('누르면 새 상태를 알리고 내용은 그대로 접혀 있다', async () => {
      await userEvent.click(canvas.getByRole('button'));
      await expect(args.onExpandedChange).toHaveBeenCalledWith(true);
      await expect(canvas.queryByText('본문')).not.toBeInTheDocument();
    });
  },
};
