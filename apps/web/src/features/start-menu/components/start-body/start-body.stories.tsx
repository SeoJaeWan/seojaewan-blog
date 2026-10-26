import type { Meta, StoryObj } from '@storybook/react-vite';

import { SEARCH_RESULTS } from '@/features/start-menu/stories/search-data/search-data';
import {
  START_LETTER_GROUPS,
  START_PINNED,
  startAvailableLetters,
} from '@/features/start-menu/stories/start-data/start-data';

import { StartBody } from './start-body';
import { START_CATEGORY_GROUPS } from './story-data';

// 피그마 Start/Body의 변형 속성 값이다(정규화한 이름).
const VIEWS = ['list', 'grid', 'category', 'results', 'jumplist'] as const;
const DEVICES = ['desktop', 'mobile'] as const;

// 본문은 크기를 갖지 않고 Start 메뉴가 정하므로 피그마 원본 크기(size/574×569, size/356×489)로 감싸 그린다.
const SIZE_CLASS_NAMES = { desktop: 'w-574 h-569', mobile: 'w-356 h-489' } as const;

type ParityArgs = {
  view: (typeof VIEWS)[number];
  device: (typeof DEVICES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 데이터는 피그마 조립과 같다.
const meta = {
  title: 'Patterns/Start/Body',
  // 높이(569, 489)가 홀수라 가운데 놓으면 소수 px 위치에 놓여 캡처가 1px 밀리므로 정수 위치(padded)에 둔다.
  parameters: { layout: 'padded' },
  args: { view: 'list', device: 'desktop' },
  argTypes: {
    view: { control: 'inline-radio', options: VIEWS },
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) => {
    const className = SIZE_CLASS_NAMES[args.device];
    switch (args.view) {
      case 'list':
      case 'grid':
        return (
          <StartBody
            view={args.view}
            device={args.device}
            className={className}
            pinned={START_PINNED}
            groups={START_LETTER_GROUPS}
          />
        );
      case 'category':
        return (
          <StartBody
            view="category"
            device={args.device}
            className={className}
            pinned={START_PINNED}
            groups={START_CATEGORY_GROUPS}
          />
        );
      case 'results':
        return (
          <StartBody
            view="results"
            device={args.device}
            className={className}
            results={SEARCH_RESULTS}
          />
        );
      case 'jumplist':
        return (
          <StartBody
            view="jump-list"
            device={args.device}
            className={className}
            availableLetters={startAvailableLetters}
          />
        );
    }
  },
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};
