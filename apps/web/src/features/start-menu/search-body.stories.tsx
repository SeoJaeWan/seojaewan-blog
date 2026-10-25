import type { Meta, StoryObj } from '@storybook/react-vite';

import { SearchBody } from './search-body';
import {
  SEARCH_RECENT,
  SEARCH_RECOMMENDED,
  SEARCH_RECOMMENDED_MOBILE_COUNT,
  SEARCH_RESULTS,
} from './story-data';

// 피그마 Search/Body의 변형 속성 값이다(정규화한 이름).
const VIEWS = ['before-typing', 'results', 'no-results'] as const;
const DEVICES = ['desktop', 'mobile'] as const;

// 본문은 크기를 갖지 않고 검색 패널이 정하므로 피그마 원본 크기(size/574×654, size/356×522)로 감싸 그린다.
const SIZE_CLASS_NAMES = { desktop: 'w-574 h-654', mobile: 'w-356 h-522' } as const;

type ParityArgs = {
  view: (typeof VIEWS)[number];
  device: (typeof DEVICES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 데이터는 피그마 조립과 같다.
const meta = {
  title: 'Patterns/Search/Body',
  args: { view: 'before-typing', device: 'desktop' },
  argTypes: {
    view: { control: 'inline-radio', options: VIEWS },
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) => {
    const className = SIZE_CLASS_NAMES[args.device];
    switch (args.view) {
      case 'before-typing':
        return (
          <SearchBody
            view="before-typing"
            device={args.device}
            className={className}
            recent={SEARCH_RECENT}
            recommended={
              args.device === 'mobile'
                ? SEARCH_RECOMMENDED.slice(0, SEARCH_RECOMMENDED_MOBILE_COUNT)
                : SEARCH_RECOMMENDED
            }
          />
        );
      case 'results':
        return (
          <SearchBody
            view="results"
            device={args.device}
            className={className}
            results={SEARCH_RESULTS}
          />
        );
      case 'no-results':
        return <SearchBody view="no-results" device={args.device} className={className} />;
    }
  },
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
