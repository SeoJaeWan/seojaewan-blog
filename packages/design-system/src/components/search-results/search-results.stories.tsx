import type { Meta, StoryObj } from '@storybook/react-vite';

import { SearchResults } from './search-results';

// 피그마 SearchResults의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

type ParityArgs = {
  device: (typeof DEVICES)[number];
};

// 문서 아이콘 이미지 자산이다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const documentIcon = new URL('../../assets/images/file-document.png', import.meta.url).href;

const meta = {
  title: 'Components/SearchResults',
  // 컴포넌트 높이가 홀수라 가운데 정렬은 위치가 0.5px로 떨어져 캡처가 1px 밀리므로, 위쪽 왼쪽에 붙여 정수 위치에 둔다.
  parameters: { layout: 'padded' },
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  // 컴포넌트는 크기를 갖지 않으므로, 피그마 원본 크기(데스크톱 574×545, 모바일 356×465)로 감싸 그린다.
  // 아이콘은 쓰는 곳마다 달라 필수 prop이므로 피그마 기본 인스턴스(file/Document)를 넣는다.
  // Results·Actions 슬롯은 언제나 비어 있으므로, 피그마 빈 슬롯이 차지하는 크기만 칠 없는 빈 내용으로 둔다.
  render: (args) => (
    <div className={args.device === 'mobile' ? 'h-465 w-356' : 'h-545 w-574'}>
      <SearchResults
        device={args.device}
        icon={<img src={documentIcon} alt="" className="size-full object-contain" />}
        actions={<div style={{ width: 100, height: 100 }} />}
      >
        <div className="shrink-0" style={{ height: 100 }} />
      </SearchResults>
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
