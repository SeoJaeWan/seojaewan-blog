import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '../image-asset/image-asset';
import { MenuItem } from '../menu-item/menu-item';
import { BestMatchCard } from './best-match-card';

const meta = {
  title: 'Components/BestMatchCard',
  // 제목·부가 정보는 피그마 TEXT 속성의 기본값이라 넘기지 않는다. 아이콘은 피그마 Icon의 기본 인스턴스다.
  render: () => (
    <BestMatchCard icon={<ImageAsset name="images/file-document" />}>
      <MenuItem isStandalone label="열기" icon="icons/ic_fluent_open_20_regular.svg" />
      <MenuItem isStandalone label="링크 복사" icon="icons/ic_fluent_link_20_regular.svg" />
    </BestMatchCard>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트다. `Actions` 슬롯에 피그마 기본 내용과 같은 MenuItem 둘을 넣는다.
export const Figma: Story = {};
