import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { ImageAsset } from './image-asset';

const meta = {
  title: 'Components/ImageAsset',
  component: ImageAsset,
  args: { name: 'images/file-folder' },
} satisfies Meta<typeof ImageAsset>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:자산]]
/** 자산 이름의 파일 주소를 장식 이미지(빈 alt)로 그린다 */
export const Default: Story = {
  play: async ({ canvas }) => {
    const image = canvas.getByRole('presentation');
    await expect(image.getAttribute('src')).toContain('file-folder.webp');
    await expect(image).toHaveAttribute('alt', '');
  },
};
