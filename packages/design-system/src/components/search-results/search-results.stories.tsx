import type { Meta, StoryObj } from '@storybook/react-vite';

import { Asset } from '../asset/asset';
import { ImageAsset } from '../image-asset/image-asset';
import { ListGroup } from '../list-group/list-group';
import { ListItem } from '../list-item/list-item';
import { MenuItem } from '../menu-item/menu-item';
import { SearchResults, type SearchResultsDevice } from './search-results';

// 피그마 SearchResults의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

// 변형마다 피그마 원본 크기이자 Start 검색 본문 자리의 크기 토큰이다.
const sizeClassNames: Record<SearchResultsDevice, string> = {
  desktop: 'h-size-search-results-height w-size-shell-body-width',
  mobile: 'h-size-search-results-mobile-height w-size-shell-mobile-body-width',
};

const documentIcon = (
  <ImageAsset name="images/file-document" className="size-full object-contain" />
);

const meta = {
  title: 'Components/SearchResults',
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  // `Results` 슬롯과 안쪽 BestMatchCard에는 피그마 기본 내용과 같은 컴포넌트를 넣는다.
  render: (args) => (
    <div className={sizeClassNames[args.device]}>
      <SearchResults
        device={args.device}
        icon={documentIcon}
        actions={
          <>
            <MenuItem standalone label="열기" icon="icons/ic_fluent_open_20_regular.svg" />
            <MenuItem standalone label="링크 복사" icon="icons/ic_fluent_link_20_regular.svg" />
          </>
        }
      >
        <ListGroup label="최고 일치" className="w-full shrink-shrink-none">
          <ListItem
            size="two-line"
            selected
            title="리액트 19 훅 정리"
            subtitle="글"
            icon={documentIcon}
          />
        </ListGroup>
        <ListGroup label="폴더" className="w-full shrink-shrink-none">
          <ListItem
            title="리액트"
            icon={<ImageAsset name="images/file-folder" className="size-full object-contain" />}
          />
        </ListGroup>
        <ListGroup label="글" className="w-full shrink-shrink-none">
          <ListItem title="리액트 서버 컴포넌트 이해하기" icon={documentIcon} />
          <ListItem title="리액트 쿼리 캐시 전략" icon={documentIcon} />
        </ListGroup>
        <ListGroup label="외부 링크" className="w-full shrink-shrink-none">
          <ListItem
            title="리액트 스터디 노트"
            icon={<Asset name="illustrations/file-link.svg" className="size-full" />}
          />
        </ListGroup>
      </SearchResults>
    </div>
  ),
} satisfies Meta<{ device: SearchResultsDevice }>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};
