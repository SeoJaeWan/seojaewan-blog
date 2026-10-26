import type { Meta, StoryObj } from '@storybook/react-vite';

import { SearchBody } from '@/features/start-menu/components/search-body/search-body';
import {
  SEARCH_PLACEHOLDER,
  SEARCH_RECENT,
  SEARCH_RECOMMENDED,
  SEARCH_RECOMMENDED_MOBILE_COUNT,
} from '@/features/start-menu/stories/search-data/search-data';

import { SearchPanel } from './search-panel';

// 피그마 Search/Panel의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

type ParityArgs = {
  device: (typeof DEVICES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 조립처럼 본문 자리에 입력 전 본문(Search/Body `View=Before typing`)을 넣는다.
// 패널 크기는 ShellSurface가 정한다.
const meta = {
  title: 'Patterns/Search/Panel',
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) => (
    <SearchPanel
      device={args.device}
      searchBoxProps={{ 'aria-label': '검색', placeholder: SEARCH_PLACEHOLDER }}
    >
      <SearchBody
        view="before-typing"
        device={args.device}
        className="min-h-px w-full flex-1"
        recent={SEARCH_RECENT}
        recommended={
          args.device === 'mobile'
            ? SEARCH_RECOMMENDED.slice(0, SEARCH_RECOMMENDED_MOBILE_COUNT)
            : SEARCH_RECOMMENDED
        }
      />
    </SearchPanel>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
