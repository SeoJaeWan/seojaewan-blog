import type { Meta, StoryObj } from '@storybook/react-vite';

import { Asset } from '../asset/asset';
import { ImageAsset } from '../image-asset/image-asset';
import { NavigationItem } from '../navigation-item/navigation-item';
import { NavigationPane } from './navigation-pane';

const folderIcon = <ImageAsset name="images/file-folder" className="size-full object-contain" />;

const meta = {
  title: 'Components/NavigationPane',
  // 변형 속성이 없다. items 슬롯에는 피그마 기본 내용을 넣는다.
  // 항목 너비는 쓰는 곳이 정하므로 피그마 원본 너비 240(NavigationItem 너비)을 준다.
  render: () => (
    <NavigationPane role="tree" aria-label="탐색 창">
      <NavigationItem
        level={0}
        expand="expanded"
        label="바탕 화면"
        icon={
          <Asset
            name="icons/ic_fluent_desktop_20_regular.svg"
            className="size-size-icon-sm text-text-fill-primary"
          />
        }
        className="w-size-navigation-item-width"
      />
      <NavigationItem
        level={1}
        expand="expanded"
        selected
        label="Blog"
        icon={folderIcon}
        className="w-size-navigation-item-width"
      />
      <NavigationItem
        level={2}
        expand="collapsed"
        label="React"
        icon={folderIcon}
        className="w-size-navigation-item-width"
      />
      <NavigationItem
        level={2}
        label="Next.js"
        icon={folderIcon}
        className="w-size-navigation-item-width"
      />
      <NavigationItem
        level={2}
        label="TypeScript"
        icon={folderIcon}
        className="w-size-navigation-item-width"
      />
      <NavigationItem
        level={0}
        label="휴지통"
        icon={
          <ImageAsset name="images/file-recycle-bin-full" className="size-full object-contain" />
        }
        className="w-size-navigation-item-width"
      />
    </NavigationPane>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(default)를 그린다.
export const Figma: Story = {};
