import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useEffect, useRef } from 'react';

import { ScrollArea, type ScrollAreaMaterial } from './scroll-area';

// 피그마 ScrollArea의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'hover'] as const;
const MATERIALS = ['acrylic', 'solid'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
  material: (typeof MATERIALS)[number];
};

// 피그마 원본의 스크롤바 막대(위치 40, 길이 80)는 실행 중에 정해지는 값의 기본값이다(@codocs [[디자인 기반:겹쳐 놓기]]).
// 코드는 내용이 넘칠 때만 막대를 그리므로, 같은 막대가 나오는 내용 높이와 스크롤 위치를 준다.
// 영역 240, 스크롤바 232(위아래 여백 4), 막대가 움직이는 길이 212(양 끝 10)에서
// 길이 212 × 240 / 636 = 80, 위치 10 + (212 − 80) × 90 / (636 − 240) = 40이다.
// 내용 높이 636은 위아래 여백 12씩과 빈 내용 612다.
const CONTENT_HEIGHT = 612;
const SCROLL_TOP = 90;

/**
 * 피그마 미리보기 크기(320×240)의 ScrollArea에 피그마 기본 막대가 나오는 빈 내용과 스크롤 위치를 준다.
 * @param props
 * @param props.material 피그마 Material
 * @returns 스토리 화면
 */
function ParityScrollArea(props: { material: ScrollAreaMaterial }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = ref.current?.firstElementChild;
    if (viewport) viewport.scrollTop = SCROLL_TOP;
  }, []);
  return (
    <ScrollArea ref={ref} material={props.material} className="h-240 w-320">
      {/* 컴포넌트의 Content 슬롯은 언제나 비어 있으므로 칠 없는 빈 내용만 둔다. */}
      <div className="shrink-0" style={{ height: CONTENT_HEIGHT }} />
    </ScrollArea>
  );
}

const meta = {
  title: 'Components/ScrollArea',
  args: { state: 'rest', material: 'acrylic' },
  argTypes: {
    // Hover는 캡처 도구가 실제 마우스로 재현한다. state arg는 짝짓기에만 쓴다.
    state: { control: 'inline-radio', options: STATES },
    material: { control: 'inline-radio', options: MATERIALS },
  },
  render: (args) => <ParityScrollArea material={args.material} />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};
