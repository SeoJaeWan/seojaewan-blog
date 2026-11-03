import type { Meta, StoryObj } from '@storybook/react-vite';

import selectionMarqueeExport from '../../../figma/components/selection-marquee/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { SelectionMarquee } from './selection-marquee';

const meta = {
  title: 'Components/SelectionMarquee',
  // 크기는 쓰는 곳이 정하므로 FigmaFrame이 피그마 원본 크기로 감싼다.
  decorators: [figmaFrame(selectionMarqueeExport)],
  render: () => <SelectionMarquee />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트라 args 없이 하나만 둔다.
export const Figma: Story = {};
