import type { Meta, StoryObj } from '@storybook/react-vite';

import explorerCommandBarExport from '../../../figma/components/explorer-command-bar/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { ExplorerCommandBar } from './explorer-command-bar';

const meta = {
  title: 'Components/ExplorerCommandBar',
  // 부모가 너비를 정하는 컴포넌트라 FigmaFrame이 피그마 원본 너비로 감싼다.
  // Commands 슬롯은 언제나 비어 있고, 빈 슬롯의 높이(size/control/height)는 컴포넌트가 가진다.
  decorators: [figmaFrame(explorerCommandBarExport)],
  render: () => <ExplorerCommandBar />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트라 args 없이 하나뿐인 변형을 그린다.
export const Figma: Story = {};
