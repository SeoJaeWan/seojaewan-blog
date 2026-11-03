import type { Meta, StoryObj } from '@storybook/react-vite';

import navigationItemExport from '../../../figma/components/navigation-item/export.json';
import { FigmaFrame } from '../../story/figma-frame';
import { Asset } from '../asset/asset';
import { ImageAsset } from '../image-asset/image-asset';
import { NavigationItem } from '../navigation-item/navigation-item';
import { NavigationPane } from './navigation-pane';

const folderIcon = <ImageAsset name="images/file-folder" />;

const meta = {
  title: 'Components/NavigationPane',
  // 변형 속성이 없다. items 슬롯에는 피그마 기본 내용을 넣는다.
  // 항목 크기는 쓰는 곳이 정하므로 FigmaFrame이 NavigationItem 피그마 원본 크기로 감싼다. items 슬롯 안 항목(nav/<이름>)과 크기가 같고,
  // 노드 이름에 경로 구분자(/)가 들어 있어 노드 경로로는 고를 수 없다.
  render: () => (
    <NavigationPane role="tree" aria-label="탐색 창">
      <FigmaFrame source={navigationItemExport}>
        <NavigationItem
          level={0}
          expand="expanded"
          label="바탕 화면"
          icon={<Asset name="icons/ic_fluent_desktop_20_regular.svg" />}
        />
      </FigmaFrame>
      <FigmaFrame source={navigationItemExport}>
        <NavigationItem level={1} expand="expanded" selected label="Blog" icon={folderIcon} />
      </FigmaFrame>
      <FigmaFrame source={navigationItemExport}>
        <NavigationItem level={2} expand="collapsed" label="React" icon={folderIcon} />
      </FigmaFrame>
      <FigmaFrame source={navigationItemExport}>
        <NavigationItem level={2} label="Next.js" icon={folderIcon} />
      </FigmaFrame>
      <FigmaFrame source={navigationItemExport}>
        <NavigationItem level={2} label="TypeScript" icon={folderIcon} />
      </FigmaFrame>
      <FigmaFrame source={navigationItemExport}>
        <NavigationItem
          level={0}
          label="휴지통"
          icon={<ImageAsset name="images/file-recycle-bin-full" />}
        />
      </FigmaFrame>
    </NavigationPane>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(default)를 그린다.
export const Figma: Story = {};
