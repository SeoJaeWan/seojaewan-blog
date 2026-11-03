import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '../image-asset/image-asset';
import { ListItem } from '../list-item/list-item';
import { ListGroup } from './list-group';

type FigmaArgs = {
  /** 피그마 BOOLEAN 속성 Show header */
  showHeader: boolean;
};

// 피그마 `items` 슬롯의 기본 내용이다(Compact ListItem 둘, 글 문서 아이콘).
const defaultItems = ['리액트 서버 컴포넌트 이해하기', '리액트 쿼리 캐시 전략'];

const meta = {
  title: 'Components/ListGroup',
  args: { showHeader: true },
  argTypes: {
    showHeader: { control: 'boolean' },
  },
  // 너비는 피그마 원본 너비이자 Start 본문 자리의 크기 토큰으로 준다. 머리글 글자는 SectionHeader 기본값과 같다.
  render: (args) => (
    <ListGroup showHeader={args.showHeader} className="w-size-shell-body-width">
      {defaultItems.map((title) => (
        <ListItem
          key={title}
          title={title}
          icon={<ImageAsset name="images/file-document" className="size-full object-contain" />}
        />
      ))}
    </ListGroup>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트다. `items` 슬롯에 피그마 기본 내용과 같은 ListItem을 넣는다.
export const Figma: Story = {};
