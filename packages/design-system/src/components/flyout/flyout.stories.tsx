import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';

import { Flyout } from './flyout';

// 피그마 Flyout의 변형 속성 값이다(정규화한 이름).
const MATERIALS = ['acrylic', 'solid'] as const;

// 피그마 슬롯 자리 표시(Content)의 크기와 점선 모양이다. 슬롯은 Flyout 폭(320)에서 여백과 테두리를 뺀 폭이다.
const SLOT_WIDTH = 286;
const SLOT_HEIGHT = 66;
const SLOT_RADIUS = 4;
const DASH_LENGTH = 4;

type ParityArgs = {
  material: (typeof MATERIALS)[number];
};

const meta = {
  title: 'Components/Flyout',
  args: { material: 'solid' },
  argTypes: {
    material: { control: 'inline-radio', options: MATERIALS },
  },
  render: (args) => (
    <Flyout material={args.material}>
      <SlotPlaceholder />
    </Flyout>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 일치 검사:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};

/**
 * 피그마 Flyout 슬롯의 기본 내용(점선 상자와 안내 글자)을 그린다. 비교용 자리 표시라 스토리에만 둔다.
 * CSS dashed 테두리는 점선 길이를 브라우저가 정해 피그마 [4, 4] 점선과 다르므로 SVG로 그린다.
 */
function SlotPlaceholder(): JSX.Element {
  return (
    <div className="relative">
      <svg
        aria-hidden
        data-figma-stroke="Content"
        className="absolute inset-0 text-control-strong-stroke-disabled"
        width={SLOT_WIDTH}
        height={SLOT_HEIGHT}
        fill="none"
        stroke="currentColor"
      >
        {dashedSides().map((side) => (
          <path
            key={side.d}
            d={side.d}
            strokeDasharray={`${side.dash} ${side.period - side.dash}`}
            strokeDashoffset={side.offset}
          />
        ))}
      </svg>
      {/* 피그마 슬롯은 선 두께가 레이아웃에 들어가므로 투명한 테두리로 같은 크기를 만든다. */}
      <div
        data-figma="Content"
        className="flex flex-col items-center justify-center rounded-control border-default border-transparent px-16 py-24 type-caption text-text-fill-tertiary"
      >
        <span data-figma="label">콘텐츠 영역 (slot)</span>
      </div>
    </div>
  );
}

type DashedSide = { d: string; dash: number; period: number; offset: number };

/**
 * 피그마가 둥근 사각형 점선을 그리는 방식을 따라 변마다 점선 경로를 만든다.
 * 피그마는 곧은 변마다 점선 주기를 변 길이에 정수 개로 맞추고, 점선 가운데를 변의 양 끝에 둔다.
 * 그래서 변마다 앞뒤 모서리 호의 절반씩을 붙인 경로를 만들고 주기와 시작 위치를 따로 정한다.
 * @returns 변 네 개의 경로와 점선 값
 */
function dashedSides(): DashedSide[] {
  const half = 0.5;
  const radius = SLOT_RADIUS - half;
  const left = half;
  const top = half;
  const right = SLOT_WIDTH - half;
  const bottom = SLOT_HEIGHT - half;
  const arcHalf = (Math.PI * radius) / 4;
  const diagonal = radius * (1 - Math.SQRT1_2);
  const sides = [
    // 위: 왼쪽 위 호의 절반 → 오른쪽 위 호의 절반
    {
      d: `M ${left + diagonal} ${top + diagonal} A ${radius} ${radius} 0 0 1 ${left + radius} ${top} H ${right - radius} A ${radius} ${radius} 0 0 1 ${right - diagonal} ${top + diagonal}`,
      length: right - left - 2 * radius,
    },
    {
      d: `M ${right - diagonal} ${top + diagonal} A ${radius} ${radius} 0 0 1 ${right} ${top + radius} V ${bottom - radius} A ${radius} ${radius} 0 0 1 ${right - diagonal} ${bottom - diagonal}`,
      length: bottom - top - 2 * radius,
    },
    {
      d: `M ${right - diagonal} ${bottom - diagonal} A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom} H ${left + radius} A ${radius} ${radius} 0 0 1 ${left + diagonal} ${bottom - diagonal}`,
      length: right - left - 2 * radius,
    },
    {
      d: `M ${left + diagonal} ${bottom - diagonal} A ${radius} ${radius} 0 0 1 ${left} ${bottom - radius} V ${top + radius} A ${radius} ${radius} 0 0 1 ${left + diagonal} ${top + diagonal}`,
      length: bottom - top - 2 * radius,
    },
  ];
  return sides.map(({ d, length }) => {
    const period = length / Math.round(length / (2 * DASH_LENGTH));
    const dash = period / 2;
    // 점선 가운데가 곧은 변의 시작(호 절반 뒤)에 오게 한다.
    return { d, dash, period, offset: dash / 2 - arcHalf };
  });
}
