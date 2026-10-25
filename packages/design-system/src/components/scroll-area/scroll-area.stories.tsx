import type { Meta, StoryObj } from '@storybook/react-vite';

import { ScrollArea } from './scroll-area';

// 피그마 짝이 없는 동작 도구라 Parity 스토리를 두지 않는다(캡처 대상이 아니다).
const meta = {
  title: 'Components/ScrollArea',
  args: { material: 'acrylic' },
  argTypes: {
    material: { control: 'inline-radio', options: ['acrylic', 'solid'] },
  },
  render: (args) => (
    <ScrollArea material={args.material} className="h-240 w-320 border border-solid">
      {Array.from({ length: 30 }, (_, index) => (
        <p key={index} className="shrink-0 px-12 py-4">
          항목 {index + 1}
        </p>
      ))}
    </ScrollArea>
  ),
} satisfies Meta<typeof ScrollArea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
