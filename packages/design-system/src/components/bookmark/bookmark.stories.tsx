import type { Meta, StoryObj } from '@storybook/react-vite';

import bookmarkExport from '../../../figma/components/bookmark/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { Bookmark } from './bookmark';

type FigmaArgs = {
  /** 피그마 TEXT 속성 Title */
  title: string;
  /** 피그마 TEXT 속성 Description */
  description: string;
  /** 피그마 TEXT 속성 Url */
  url: string;
};

const meta = {
  title: 'Components/Bookmark',
  args: { title: '제목', description: '설명', url: '주소' },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    url: { control: 'text' },
  },
  // Bookmark는 너비를 갖지 않고 쓰는 곳이 정한다. FigmaFrame이 피그마 원본의 미리보기 너비로 감싼다.
  decorators: [figmaFrame(bookmarkExport)],
  render: (args) => <Bookmark title={args.title} description={args.description} url={args.url} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형은 default 하나다.
export const Figma: Story = {};
