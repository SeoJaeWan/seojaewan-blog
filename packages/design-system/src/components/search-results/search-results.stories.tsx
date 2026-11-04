import type { Meta, StoryObj } from '@storybook/react-vite';

import searchResultsExport from '../../../figma/components/search-results/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { Asset } from '../asset/asset';
import { BestMatchCard } from '../best-match-card/best-match-card';
import { ImageAsset } from '../image-asset/image-asset';
import { ListGroup } from '../list-group/list-group';
import { ListItem } from '../list-item/list-item';
import { MenuItem } from '../menu-item/menu-item';
import { SearchResults, type SearchResultsDevice } from './search-results';

// 피그마 SearchResults의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

const documentIcon = <ImageAsset name="images/file-document" />;

const meta = {
  title: 'Components/SearchResults',
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  // `Results` 슬롯과 안쪽 BestMatchCard에는 피그마 기본 내용과 같은 컴포넌트를 넣는다.
  // 크기는 FigmaFrame이 변형마다 피그마 원본 크기(Start 검색 본문 자리의 크기 토큰)로 감싼다. 모바일은 높이가 내용에 맞는다.
  // 카드와 결과 묶음은 SearchResults가 자리 너비로 채운다.
  decorators: [figmaFrame(searchResultsExport)],
  render: (args) => (
    <SearchResults
      device={args.device}
      card={
        <BestMatchCard icon={documentIcon}>
          <MenuItem isStandalone label="열기" icon="icons/ic_fluent_open_20_regular.svg" />
          <MenuItem isStandalone label="링크 복사" icon="icons/ic_fluent_link_20_regular.svg" />
        </BestMatchCard>
      }
    >
      <ListGroup label="최고 일치">
        <ListItem
          size="two-line"
          selected
          title="리액트 19 훅 정리"
          subtitle="글"
          icon={documentIcon}
        />
      </ListGroup>
      <ListGroup label="폴더">
        <ListItem title="리액트" icon={<ImageAsset name="images/file-folder" />} />
      </ListGroup>
      <ListGroup label="글">
        <ListItem title="리액트 서버 컴포넌트 이해하기" icon={documentIcon} />
        <ListItem title="리액트 쿼리 캐시 전략" icon={documentIcon} />
      </ListGroup>
      <ListGroup label="외부 링크">
        <ListItem title="리액트 스터디 노트" icon={<Asset name="illustrations/file-link.svg" />} />
      </ListGroup>
    </SearchResults>
  ),
} satisfies Meta<{ device: SearchResultsDevice }>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};
