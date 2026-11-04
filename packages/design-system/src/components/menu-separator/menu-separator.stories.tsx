import type { Meta, StoryObj } from '@storybook/react-vite';

import menuSeparatorExport from '../../../figma/components/menu-separator/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { MenuSeparator } from './menu-separator';

const meta = {
  title: 'Components/MenuSeparator',
  // 너비는 쓰는 곳이 정하므로 견본 크기(@sample-size width)인 export.json 숫자로 FigmaFrame이 감싼다.
  decorators: [figmaFrame(menuSeparatorExport)],
  // 1px 선이 가운데 정렬에서 반 픽셀 위치에 놓여 번지지 않도록 위쪽부터 놓는다.
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 MenuSeparator는 변형이 하나다.
export const Figma: Story = {
  render: () => <MenuSeparator />,
};
